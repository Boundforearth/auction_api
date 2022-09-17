const passport = require('passport');
const passportJWT = require('passport-jwt');
const LocalStrategy = require('passport-local').Strategy
const db = require('./db-info');
const bcrypt = require('bcrypt');
require('dotenv').config();

let JWTStrategy = passportJWT.Strategy;
let ExtractJWT = passportJWT.ExtractJwt

passport.use(new LocalStrategy({
  usernameField: "email",
  passwordField: "password"
},(username, password, callback) => {
  db.pool.query('SELECT * FROM Users WHERE email=$1', [username], (error, results) => {
    if(error) {
      return callback(error);
    } else if(typeof(results.rows[0]) === 'undefined') {
      return callback(null, false, { messages: 'Incorrect email.' });
    } else {
      correctPassword = bcrypt.compareSync(password, results.rows[0].password);
      if(!correctPassword) {
        return callback(null, false, { messages: 'Incorrect password'})
      } else{
        return callback(null, results.rows[0])
      }
    }
  });
}))
passport.use(new JWTStrategy({
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, (jwtPayload, callback) => {
  return db.pool.query('SELECT * FROM Users WHERE email=$1', [jwtPayload.email], (error, results) => {
    if(error) {
      return callback(error)
    }
    return callback(null, results)
  })
}));