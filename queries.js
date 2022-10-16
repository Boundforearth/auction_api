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
  resetTimeoutFunctions,
  handleLiveAuctions,
  verifyUser
}