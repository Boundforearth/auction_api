const db = require('./db-info');
const { validationResult } = require('express-validator');
const { differenceInMilliseconds, addDays, addMinutes } = require('date-fns')
const bcrypt = require('bcrypt');
require('./passport');

/**
 * Function used with deleteUser.  
 * @param {integer} id 
 * @param {float} price 
 */
const handleLiveAuctions = async (id, price) => {
  try {
    await db.pool.query('SELECT current_price FROM Auctions WHERE auction_id=$1', [id])
    await db.pool.query('UPDATE Auctions SET end_price=$1', [price])
    await db.pool.query('DELETE FROM LiveAuctions WHERE auction_id=$1', [id])
    console.log('Auction ended ' + id)
  }
  catch (err) {
    return err
  }
}

/**
 * Function used to grab the JWT token, pull out the payload, and then grab the user_id from the payload.
 * After grabbing the user_id, it will check that against the user_id submitted in a form.
 * If the two match, then the user is verified and the action they were attempting will proceed. 
 * @param {string} token 
 * @return {boolean} 
 * Returns true if the user has access, false if something fishy is going on.
 */

const verifyUser = (req, user) => {
  token = req
  parsed = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  id = parsed.user_id;
  if (id == user) {
    return true;
  }
  else {
    return false;
  }
}


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
 * @method GET
 * @param {*} req 
 * @param {*} res 
 * @returns {Object}
 * returns a JSON object full of a bidders bid history
 */
const getBidHistory = (req, res) => {
  const user_id = req.params.user_id;
  let check = verifyUser(req.headers.authorization, user_id)
  if (!check) {
    res.status(400).send('Users may only perform this action with their own account.');
    return;
  } else {
    db.pool.query('SELECT * FROM Bids WHERE user_id=$1', [user_id], (error, results) => {
      if (error) {
        res.status(400).send('Error with the database');
        return;
      }
      res.status(200).json(results.rows);
    })
  }
};






/**
 * @method DELETE
 * @param {integer}
 * Takes a user_id as an integer.  Then checks to see if a user is either the auctioneer or highest bidder
 * Users participating in active auctions are not allowed to delete their accounts.
 */

const deleteUser = (req, res) => {
  const user_id = req.params.user_id;
  const password = req.body.password;

  //code to check validation results
  const errors = validationResult(req);
  let check = verifyUser(req.headers.authorization, user_id)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  } else if (!check) {
    return res.status(400).send('Users may only perform this action with their own account.');
  } else {
    //Deleting an account is a big deal, so I will still have users verify their password here, just in case.
    db.pool.query('SELECT password FROM Users WHERE user_id=$1', [user_id], (error, results) => {
      if (error) {
        console.log(error)
        return res.status(400).send('Error with the database')
      } else if (typeof (results.rows[0]) === 'undefined') {
        return res.status(404).send('That user does not exist')
      } else {
        const hash = results.rows[0].password;
        correct = bcrypt.compareSync(password, hash)
        if (!correct) {
          return res.status(400).send('Incorrect password');
        } else {
          db.pool.query('SELECT * FROM LiveAuctions WHERE user_id=$1 OR highest_bidder=$2', [user_id, user_id], (error, results) => {
            if (error) {
              console.log(error)
              return res.status(400).send('Error with the database');
            } else if (typeof (results.rows[0]) !== 'undefined') {
              return res.status(400).send('Cannot delete account while running an auction or bidding on an item');
            } else {
              db.pool.query('DELETE FROM Users WHERE user_id=$1', [user_id], (error, respone) => {
                if (error) {
                  console.log(error)
                  return res.status(400).send('Error with the database');
                } else {
                  return res.status(200).send(`User deleted with ID: ${user_id}`);
                };
              });
            };
          });
        };
      };
    });
  };
};


const resetTimeoutFunctions = async () => {
  const currentTime = new Date();
  try {
    const results = db.pool.query('SELECT * FROM LiveAuctions')
    if (results.rows[0]) {
      results.rows.forEach((row) => {
        const auction_id = row.auction_id;
        const end_time = row.end_date;
        const diff = differenceInMilliseconds(end_time, currentTime);
        if (diff <= 0) {
          handleLiveAuctions(auction_id, row.current_price);
        }
        else {
          setTimeout(() => { handleLiveAuctions(auction_id, row.current_price) }, diff)
        }
      })
    }
  }
  catch (err) {
    return res.status(400).json({ status: 'fail', message: err })
  }
}

module.exports = {
  deleteUser,
  getBidHistory,
  resetTimeoutFunctions,
  handleLiveAuctions,
  verifyUser
}