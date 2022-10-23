const db = require('./db-info');
const { differenceInMilliseconds } = require('date-fns')
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



const resetTimeoutFunctions = async () => {
  const currentTime = new Date();
  try {
    const results = await db.pool.query('SELECT * FROM LiveAuctions')
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
  resetTimeoutFunctions,
  handleLiveAuctions
}