const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
require('dotenv').config();
require('./passport');
const jwtSecret = process.env.JWT_SECRET;

let generateJWTToken = (user) => {
  return jwt.sign({ email: user.email, user_id: user.user_id, username: user.username }, jwtSecret, {
    subject: user.email,
    expiresIn: '1d',
    algorithm: process.env.JWT_ALG
  });
}

const userLogin = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  user = req.user
  if (!user) {
    return res.status(400).send('Something went wrong');
  }
  req.login(user, { session: false }, (error) => {
    if (error) {
      res.send(error);
    }
    let token = generateJWTToken(user);
    return res.status(200).json({ "user_id": user.user_id, "username": user.username, "token": token });
  });
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

module.exports = {
  userLogin,
  verifyUser
}