const db = require('../db-info');
const { validationResult } = require('express-validator');
const { differenceInMilliseconds, addDays, addMinutes } = require('date-fns')
const auth = require('../auth')
require('../passport');


/**
 * @method POST
 * @pbody {integer} 
 * @body {integer}
 * @body {string} 
 * @body {string} 
 * @pbody {integer} 
 * @body {integer} 
 * Records the creators id, the category they selected, the item description, the number of days from current time when the auction ends,
 * and the starting price.  number of bids initializes to 0, current price to null, highest bidder to null
 */
const createAuction = async (req, res) => {
  const { user_id, category_id, description, endTime, title } = req.body;
  const tempPrice = req.body.start_price
  const start_price = Number(tempPrice).toFixed(2);

  let check = auth.verifyUser(req.headers.authorization, user_id)
  if (!check) {
    res.status(400).send('Users may only perform this action with their own account.');
    return;
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  };
  if (endTime !== 1 && endTime !== 3 && endTime !== 5 && endTime !== 7) {
    res.status(400).send('End time must either be 1, 3, 5, or 7');
    return;
  }
  const start_date = (new Date());
  const end_date = addMinutes(start_date, endTime)
  const diff = differenceInMilliseconds(end_date, start_date);
  let image_path = null
  if (Object.prototype.hasOwnProperty.call(req, 'file.path')) {
    image_path = './' + req.file.path;
  }
  //const image_path = "amks"
  try {
    const results = await db.pool.query('INSERT INTO Auctions (user_id, title, highest_bidder, category_id, image_path, description, start_date, end_date, start_price, current_price, end_price, bid_count, highest_bid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING auction_id',
      [user_id, title, null, category_id, image_path, description, start_date, end_date, start_price, start_price, null, 0, null])

    const auction_id = results.rows[0].auction_id;
    await db.pool.query('INSERT INTO LiveAuctions (auction_id, user_id, category_id, current_price, title, image_path, highest_bidder, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [auction_id, user_id, category_id, start_price, title, image_path, null, end_date])
    setTimeout(async () => {
      try {
        await db.pool.query('UPDATE Auctions SET end_price=current_price WHERE auction_id=$1', [auction_id])
        await db.pool.query('DELETE FROM LiveAuctions WHERE auction_id=$1', [auction_id])
      }
      catch (err) {
        console.log(err)
      }
    }, diff)
    return res.status(200).json({ status: 'success', message: `You have created an auction with id ${auction_id}` });
  }
  catch (err) {
    return res.status(400).json({ status: 'fail', message: err })
  }
};


/***
 * Function used to calculate the increment with which the bid price should increase
 * @param {price}
 * @return {float}
 */
const calculateIncrement = (price) => {
  if (price < 50.00) {
    return 1.00;
  } else if (price < 200.00) {
    return 2.50;
  } else {
    return 5.00
  }
}


/**
 * @method PUT
 * @param {bid} 
 * @param {auction_id}
 * @param {user_id}
 * Bid is what the user would like to place as a bid. The user_id is that of the bidder, which is stored as highest_bidder in the database
 * This is used to place a bid
 * Must also post the bid to the Bids table
 */
const placeBid = async (req, res) => {
  const { user_id } = req.body;
  const tempBid = req.body.bid;
  const auction_id = req.params.auction_id
  const bid = Number(tempBid).toFixed(2);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  let check = auth.verifyUser(req.headers.authorization, user_id)
  if (!check) {
    return res.status(400).send('Users may only perform this action with their own account.');
  }
  try {
    //Need to check if auction is actually live first
    const auction = await db.pool.query('SELECT * FROM LiveAuctions WHERE auction_id=$1', [auction_id])
    if (!auction.rows[0]) {
      return res.status(400).json({ status: 'fail', message: 'That auction does not exist' })
    }
    const results = await db.pool.query('SELECT user_id, end_date, current_price, bid_count, highest_bid, highest_bidder FROM Auctions WHERE auction_id=$1', [auction_id])

    //get row returned from the query and save everything needed to variables
    const auctioneer = results.rows[0].user_id;
    const end_date = results.rows[0].end_time;
    const current_price = results.rows[0].current_price;
    let increment = calculateIncrement(current_price);
    const highest_bid = results.rows[0].highest_bid;
    const highest_bidder = results.rows[0].highest_bidder;
    let bid_count = results.rows[0].bid_count;
    let bidToInput = 0
    bid_count += 1;
    let today = new Date().toUTCString();

    //Don't allow bids if the auction has already ended!
    if (today >= end_date) return res.status(400).json({ status: 'fail', message: "The auction has already ended" });

    //Don't allow bids of the price is not higher than the necessary increment
    if (bid < (current_price + increment)) return res.status(400).json({ status: 'fail', message: 'Please enter a higher bid' });

    //Prevents auctioneer from artificially raising the price of their own auctions
    if (user_id === auctioneer) return res.status(400).json({ status: 'fail', message: "You can't bid on your own auctions" })

    //If the highest bidder makes a new bid, we need to compare it to their old bid, not the current price
    //We also do not want to change the current price if they bid a higher amount
    if (user_id === highest_bidder) {

      // Bid does not high enough to warrent going to database: let user know they need to enter a higher bid
      if (bid <= highest_bid) return res.status(400).json({ status: 'fail', message: 'Please enter a higher bid' });

      // If the bid was high enough, proceed with making a request to the database
      await db.pool.query('UPDATE Auctions SET highest_bid=$1, bid_count=$2 WHERE auction_id=$3', [bid, bid_count, auction_id])

      //If there are no current bids, current price should not change
      //If the bid is higher than the highest bid, we need to handle what the current bid is in regards to price increments
    } else if (bid > highest_bid || typeof (highest_bid) === 'null') {
      if (typeof (highest_bidder) === 'null') {
        bidToInput = current_price;
      }
      else if ((highest_bid + calculateIncrement(highest_bid)) >= bid) {
        bidToInput = bid;
      }
      else {
        bidToInput = highest_bid + calculateIncrement(highest_bid);
      }

      await db.pool.query('UPDATE Auctions SET highest_bidder=$1, current_price=$2, highest_bid=$3, bid_count=$4 WHERE auction_id=$5', [user_id, bidToInput, bid, bid_count, auction_id])
      await db.pool.query('UPDATE LiveAuctions SET highest_bidder=$1, current_price=$2 WHERE auction_id=$3', [user_id, bidToInput, auction_id])

    } else {

      //If the bid was lower than the highest bid, then we go here
      //Still need to properly handle increments
      //ex: highest bid = 50.00. bid=49.50.  current price should be 50, not 50.50
      if (highest_bid <= bid + calculateIncrement(bid)) {
        bidToInput = highest_bid
      } else {
        bidToInput = bid + calculateIncrement(bid)
      }

      await db.pool.query('UPDATE Auctions SET current_price=$1, bid_count=$2 WHERE auction_id=$3', [bidToInput, bid_count, auction_id])
      await db.pool.query('UPDATE LiveAuctions SET highest_bidder=$1, current_price=$2 WHERE auction_id=$3', [user_id, bidToInput, auction_id])
    }

    //Don't return, otherwise bid will not be entered into Bids table 
    res.status(200).json({ status: 'fail', message: `You're the highest bidder!` })

    await db.pool.query('INSERT INTO Bids (auction_id, user_id, price, bid_time) VALUES($1, $2, $3, $4)', [auction_id, user_id, bid, today])
  }
  catch (err) {
    res.status(400).json({ status: 'fail', message: err })
  }
};


/**
 * @method GET
 * @param {string}
 * @body {Integer}
 * @returns {Object List}
 * Get a list of Objects from the table based on a keyword that is searched
 * Optionally place a category in the body 
 */

const searchAuctions = async (req, res) => {
  const { keyword, category_id } = req.params;
  try {
    if (category_id == 0) {
      const results = await db.pool.query('SELECT auction_id, title, image_path FROM LiveAuctions WHERE title ILIKE $1 ORDER BY end_date', ['%' + keyword + '%'])
      if (!results.rows[0]) {
        return res.status(200).json({ status: 'success', results: results.rows })
      } else {
        return res.status(404).json({ status: 'fail', message: 'No auctions found for that keyword' })
      }
    } else {
      const results = await db.pool.query('SELECT auction_id, title, image_path FROM LiveAuctions WHERE title ILIKE $1 AND category_id=$2 ORDER BY end_date', ['%' + keyword + '%', category_id])
      if (!results.rows[0]) {
        return res.status(200).json({ status: 'success', results: results.rows })
      } else {
        return res.status(404).json({ status: 'fail', message: 'No auctions found for that keyword' })
      }
    }
  }
  catch (err) {
    res.status(400).json({ status: 'fail', message: err })
  }
}

/**
 * @method GET
 * @param {Integer}  
 * @returns {Object}
 * Use an auction_id in the parameters to return a single auction from the Auctions table
 */
const getAuction = async (req, res) => {
  const auction_id = req.params.auction_id;
  try {
    const results = await db.pool.query("SELECT * FROM Auctions WHERE auction_id=$1", [auction_id])
    if (!results.rows[0]) return res.status(404).json({ status: 'fail', message: 'That auction could not be found' })
    return res.status(200).json({ status: 'success', data: results.rows });
  }
  catch (err) {
    return res.status(400).json({ status: 'fail', message: err })
  }
};

/**
 * @method GET
 * @param {integer} auction_id
 */
const getAuctionBidHistory = async (req, res) => {
  const auction_id = req.params.auction_id;
  try {
    const results = await db.pool.query('SELECT price, bid_time FROM Bids WHERE auction_id=$1', [auction_id])
    if (!results.rows[0]) return res.status(404).json({ status: 'fail', message: 'Currently no bids on this auction' })
    return res.status(200).json({ status: 'success', data: results.rows });
  }
  catch (err) {
    return res.status(400).json({ status: 'fail', message: err })
  }
}



module.exports = {
  createAuction,
  getAuction,
  getAuctionBidHistory,
  placeBid,
  searchAuctions
}