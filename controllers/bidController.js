const db = require('../db-info');
const auth = require('../auth')
require('../passport')

/**
 * @method GET
 * @param {*} req 
 * @param {*} res 
 * @returns {Object}
 * returns a JSON object full of a bidders bid history
 */
const getBidHistory = async (req, res) => {
  const user_id = req.params.user_id;
  let check = auth.verifyUser(req.headers.authorization, user_id)
  if (!check) return res.status(400).json({ status: 'fail', message: 'Users may only perform this action with their own account.' });
  try {
    const results = db.pool.query('SELECT * FROM Bids WHERE user_id=$1', [user_id])
    return res.status(200).json({ status: 'success', data: results.rows })
  }
  catch (err) {
    return res.status(400).json({ status: 'fail', message: err })
  }
};

module.exports = {
  getBidHistory
}