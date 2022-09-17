const db = require('./db-info');
const {validationResult} = require('express-validator');
const u = require('./queries');

//function to handle leaving feedback from the buyer
const handleBuyer = (req, res, user_id, feedback_poster_id, auction_id, feedback_score, feedback) => {
  db.pool.query("SELECT highest_bidder, end_price FROM Auctions WHERE auction_id=$1", [auction_id], (error, results) => {
    if(error) {
      return res.status(400).send('Error with the database');
    }
    if(typeof(results.rows[0]) === 'undefined') {
      return res.status(400).send('No winner found for this auction.  Cannot leave feedback');
    } else if(results.rows[0].highest_bidder !== feedback_poster_id) {
      return res.status(400).send('You are not allowed to leave feedback on this auction');
    } else if(results.rows[0].end_price === null) {
      return res.status(400).send('You are not allowed to leave feedback on this auction');
    } else {
      db.pool.query("INSERT INTO Feedback (user_id, poster_id, auction_id, feedback_score, feedback) VALUES($1, $2, $3, $4, $5)",
        [user_id, feedback_poster_id, auction_id, feedback_score, feedback], (error, results) => {
        if(error) {
          return res.status(400).send('Error with the database');
        }
        db.pool.query('UPDATE Users SET feedback_score = feedback_score + $1 WHERE user_id=$2', [feedback_score, user_id], (error, results) => {
          if(error) {
            return res.status(400).send('Error with the database');
          }
        })
        return res.status(200).send('Thank you for leaving feedback');
      })
    }
  })
}

//function to handle leaving feedback from the seller
const handleSeller = (req, res, user_id, feedback_poster_id, auction_id, feedback_score, feedback) => {
  db.pool.query('SELECT user_id FROM Auctions WHERE auction_id=$1', [auction_id], (error, results) => {
    if(error) {
      return res.status(400).send('Error contacting the database');
    }
    if(typeof(results.rows[0]) === 'undefined') {
      return res.status(400).send('No winner found for this auction.  Cannot leave feedback');
    } else if(results.rows[0].user_id !== feedback_poster_id) {
      return res.status(400).send('You are not allowed to leave feedback on this auction')
    } else if(results.rows[0].end_price === null) {
      return res.status(400).send('You are not allowed to leave feedback on this auction');
    } else {
      db.pool.query("INSERT INTO Feedback (user_id, poster_id, auction_id, feedback_score, feedback) VALUES($1, $2, $3, $4, $5)",
    [user_id, feedback_poster_id, auction_id, feedback_score, feedback], (error, results) => {
      if(error) {
        return res.status(400).send('Error with the database');
      }
      db.pool.query('UPDATE Users SET feedback_score = feedback_score + $1 WHERE user_id=$2', [feedback_score, user_id], (error, results) => {
        if(error) {
          return res.status(400).send('Error with the database');
        }
      })
      return res.status(200).send('Thank you for leaving feedback');
    })
    }
  })
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

 const leaveFeedback = (req, res) => {
  const {user_id, feedback_poster_id, auction_id, feedback_score, feedback, role} = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  let check = u.verifyUser(req.headers.authorization, feedback_poster_id)
  if(!check) {
    return res.status(400).send('Users may only perform this action with their own account.');
  } else {
    if(feedback_score !== -1 && feedback_score !== 0 && feedback_score !== 1) {
      return res.status(400).send('Feedback must be -1, 0, or 1');
    } else{
      db.pool.query('SELECT * FROM Feedback WHERE auction_id=$1 AND poster_id=$2', [auction_id, feedback_poster_id], (error, results) => {
        if(error) {
          return res.status(400).send('There was an error contacting the database');
        }
        else if(typeof(results.rows[0]) !== 'undefined') {
          return res.status(400).send('You have already left feedback for this auction');
        }
        else{
          if(role === 'Seller') {
            return handleSeller(req, res, user_id, feedback_poster_id, auction_id, feedback_score, feedback);
          } else if(role === 'Buyer') {
            return handleBuyer(req, res, user_id, feedback_poster_id, auction_id, feedback_score, feedback);
          } else {
            return res.status(400).send('Please select your role in the auction');
          }  
        }  
      })
    }
  }
};


/**
 * @method GET
 * @param {integer}  
 * @returns {Object}
 * Takes a user_id and grabs all their feedback from the server
 * Returns a JSON Object
 */
 const getFeedback = (req, res) => {
  const user_id = req.params.user_id;
  db.pool.query('SELECT * FROM Feedback WHERE user_id=$1', [user_id], (error, results) => {
    if(error) {
      return res.status(400).send('Error with the database');
    } else if(typeof(results.rows[0]) !== 'undefined') {
      return res.status(200).json(results.rows);
    } else {
      return res.status(404).send('Could not find that user')
    }
  })
};

module.exports = {
  leaveFeedback,
  getFeedback
}