const jwt = require('jsonwebtoken');
const passport = require('passport');
const {validationResult} = require('express-validator');
require('dotenv').config();
require('./passport');
const jwtSecret = process.env.JWT_SECRET;

let generateJWTToken = (user) => {
  return jwt.sign({email: user.email, user_id: user.user_id, username: user.username}, jwtSecret, {
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
  if(!user) {
    return res.status(400).send('Something went wrong');
  }
  req.login(user, {session: false}, (error) => {
    if(error) {
      res.send(error);
    }
    let token = generateJWTToken(user);
    return res.status(200).json({"user_id": user.user_id, "username":user.username, "token": token});
  });
}

module.exports = {
  userLogin
}