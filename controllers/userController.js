const db = require('../db-info');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
require('../passport');
const auth = require('../auth');

/***
 * @method GET
 * @param { integer }
 * @returns {Object}
 * 
 * make a get request to the server to get a user based off of user_id
 */
const getUserById = async (req, res) => {
  try {
    const user_id = req.params.user_id;
    const results = await db.pool.query('SELECT user_id, username, feedback_score FROM Users WHERE user_id=$1', [user_id])
    console.log(results.rows);
    console.log(results.rows[0])
    if (!results.rows[0]) {
      return res.status(404).json({ status: 'fail', message: 'User not found.' })
    }
    return res.status(200).json({ status: 'success', data: { user: results.rows[0] } })
  } catch (err) {
    return res.status(400).json({ status: 'fail', message: err })
  }
};


/***
 * @method POST
 * @param {string}
 * @param {string}
 * @param {string}
 * Takes a string each for user_id, email, and password.
 * Checks if username or email already exist
 * Returns message that the username was added
 */
const createUser = async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const hash = await bcrypt.hash(password, 10)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    // First check if the user exists in the database.
    const results = await db.pool.query('SELECT username, email FROM Users WHERE username=$1 OR email=$2', [username, email])
    if (results.rows[0]) {
      return res.status(400).json({ status: 'fail', message: 'That username or email already exists' })
    }
    console.log(results.rows[0])
    await db.pool.query('INSERT INTO Users (username, email, password, feedback_score) VALUES ($1, $2, $3, $4) RETURNING user_id',
      [username, email, hash, 0])
    return res.status(200).send({ status: 'success', message: `Created username ${username}` });
  } catch (err) {
    return res.status(400).json({ status: 'success', message: err })
  }
};

const updateUser = async (req, res) => {
  const user_id = req.params.user_id;
  const password = req.body.password;
  let newPassword, username, newUsername
  if (req.body.newPassword) {
    newPassword = req.body.newPassword;
  }
  if (req.body.newUsername) {
    username = req.body.username;
    newUsername = req.body.newUsername
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  let check = auth.verifyUser(req.headers.authorization, user_id)
  if (!check) {
    return res.status(400).send('Users may only perform this action with their own account.');
  }
  try {
    const results = await db.pool.query('SELECT password FROM Users WHERE user_id=$1', [user_id])
    if (!results.rows[0]) {
      return res.status(404).json({ status: 'fail', message: 'That user could not be found' })
    }
    const hash = results.rows[0].password;
    const correct = await bcrypt.compare(password, hash);
    if (!correct) {
      return res.status(400).json({ status: 'fail', message: 'Incorrect password' })
    }
    if (newPassword) {
      if (password === newPassword) {
        return res.status(400).json({ status: 'fail', message: 'That is your current password' })
      }
      const hashed = await bcrypt.hash(newPassword, 10)
      await db.pool.query('UPDATE Users SET password=$1 WHERE user_id=$2', [hashed, user_id])
      return res.status(200).send({ status: 'success', message: 'Your password has been updated' })
    } else if (newUsername) {
      if (username === newUsername) {
        return res.status(400).json({ status: 'fail', message: 'Please Enter a new username.' })
      }
      await db.pool.query('UPDATE Users SET username=$1 WHERE user_id=$2', [newUsername, user_id])
      return res.status(200).json({ status: 'success', message: `Your username has been updated to ${newUsername}` })
    } else {
      return res.status(400).json({ status: 'fail', message: 'Nothing to be updated found' })
    }
  } catch (err) {
    return res.status(400).json({ status: 'fail', message: err })
  }
}

const deleteUser = async (req, res) => {
  const user_id = req.params.user_id;
  const password = req.body.password;

  //code to check validation results
  const errors = validationResult(req);
  let check = auth.verifyUser(req.headers.authorization, user_id)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  } else if (!check) {
    return res.status(400).send('Users may only perform this action with their own account.');
  }
  try {
    const results = await db.pool.query('SELECT password FROM Users WHERE user_id=$1', [user_id])
    if (!results.rows[0]) {
      return res.status(404).json({ status: 'fail', message: 'That user does not exist' })
    }
    const hash = results.rows[0].password;
    const correct = await bcrypt.compare(password, hash)
    if (!correct) {
      return res.status(400).json({ status: 'fail', message: 'Incorrect password' });
    }
    const resultsTwo = await db.pool.query('SELECT * FROM LiveAuctions WHERE user_id=$1 OR highest_bidder=$2', [user_id, user_id])
    if (!resultsTwo.rows[0]) {
      return res.status(400).json({ status: 'fail', message: 'Cannot delete account while running an auction or bidding on an item' });
    }
    await db.pool.query('DELETE FROM Users WHERE user_id=$1', [user_id])
    return res.status(200).json({ status: 'success', message: `User deleted with ID: ${user_id}` });
  } catch (err) {
    return res.status(400).json({ status: 'fail', message: err })
  }
};

module.exports = {
  getUserById,
  createUser,
  updateUser,
  deleteUser
}