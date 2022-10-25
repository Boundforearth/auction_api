const db = require('../db-info');
const { validationResult } = require('express-validator');
const auth = require('../auth');

//function to handle leaving feedback from the buyer
const handleFeedback = async (req, res, user_id, feedback_poster_id, auction_id, feedback_score, feedback, role) => {
  try {
    /// First, find auction by ID and make sure the user is allowed to leave feedback
    const results = await db.pool.query("SELECT highest_bidder, end_price, user_id FROM Auctions WHERE auction_id=$1", [auction_id])
    // Handle the results
    if (!results.rows[0]) {
      return res.status(400).json({ status: 'fail', message: 'No winner found for this auction.  Cannot leave feedback' });

      // If your role is 'buyer' but you are not the highest bidder, or if your role is seller but you did not create the auction, you are not authorized to leave feedback.
    } else if (results.rows[0].highest_bidder !== feedback_poster_id && role === 'buyer') {
      return res.status(400).json({ status: 'fail', message: 'You are not allowed to leave feedback on this auction' });
    } else if (results.rows[0].user_id !== feedback_poster_id && role === 'seller') {
      return res.status(400).json({ status: 'fail', message: 'You are not allowed to leave feedback on this auction' });
    } else if (results.rows[0].end_price === null) {
      return res.status(400).json({ status: 'fail', message: 'You are not allowed to leave feedback on this auction' });
    }

    // If feedback is allowed, update the necessary places in the database
    if (role === 'buyer') {
      await db.pool.query("INSERT INTO Feedback (user_id, poster_id, auction_id, feedback_score, feedback) VALUES($1, $2, $3, $4, $5)",
        [user_id, feedback_poster_id, auction_id, feedback_score, feedback])
      await db.pool.query('UPDATE Users SET feedback_score = feedback_score + $1 WHERE user_id=$2',
        [feedback_score, user_id])
      // If no errors, return a positive result
      return res.status(200).json({ status: 'success', message: 'Thank you for leaving feedback' });


    } else if (role === 'seller') {
      await db.pool.query("INSERT INTO Feedback (user_id, poster_id, auction_id, feedback_score, feedback) VALUES($1, $2, $3, $4, $5)",
        [user_id, feedback_poster_id, auction_id, feedback_score, feedback])
      await db.pool.query('UPDATE Users SET feedback_score = feedback_score + $1 WHERE user_id=$2', [feedback_score, user_id])
      return res.status(200).json({ status: 'success', message: 'Thank you for leaving feedback' });
    }

    // Handle any errors from above DB queries
  } catch (err) {
    console.log(error)
    return res.status(400).json({ status: 'fail', message: err })
  }
}

/**
 * @method POST
 * @body {user_id}  
 * @body {poster_id} 
 * @body {auction_id} 
 * @body {feedback_score} 
 * @body {feedback} 
 * Leaves feedback for a user and updates a users feedback score
 * Does NOT check if feedback for that auction has already been left...
 */

const leaveFeedback = async (req, res) => {
  try {

    // user_id is the person receiving feedback, while feedback_posetr_id is the person LEAVING the feedback
    const { user_id, feedback_poster_id, auction_id, feedback_score, feedback, role } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'fail', errors: errors.array() });
    }
    let check = auth.verifyUser(req.headers.authorization, feedback_poster_id)
    if (!check) {
      return res.status(400).json({ status: 'fail', message: 'Users may only perform this action with their own account.' });
    } else if (feedback_score !== -1 && feedback_score !== 0 && feedback_score !== 1) {
      return res.status(400).json({ status: 'fail', message: 'Feedback must be -1, 0, or 1' })
    }
    const results = await db.pool.query('SELECT * FROM Feedback WHERE auction_id=$1 AND poster_id=$2', [auction_id, feedback_poster_id])
    if (results.rows[0]) {
      return res.status(400).json({ status: 'fail', message: 'You have already left feedback for this auction' });
    } else if (role !== 'buyer' && role !== 'seller') {
      console.log(role)
      return res.status(400).json({ status: 'fail', message: 'Please select your role in the auction' });
    }
    return await handleFeedback(req, res, user_id, feedback_poster_id, auction_id, feedback_score, feedback, role)
  } catch (err) {
    return res.status(400).json({ status: 'fail', message: err })
  }
}



/**
 * @method GET
 * @param {integer}  
 * @returns {Object}
 * Takes a user_id and grabs all their feedback from the server
 * Returns a JSON Object
 */
const getFeedback = async (req, res) => {
  try {
    const user_id = req.params.user_id;
    const results = await db.pool.query('SELECT * FROM Feedback WHERE user_id=$1', [user_id])
    if (!results.rows[0]) return res.status(404).json({ status: 'fail', message: "Could not find that user or they have no feedback" })
    return res.status(200).json({ status: 'success', data: results.rows })
  } catch (err) {
    return res.status(404).json({ status: 'fail', message: err })
  }
};

module.exports = {
  leaveFeedback,
  getFeedback
}