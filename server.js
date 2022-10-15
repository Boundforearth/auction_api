const express = require('express');
const morgan = require('morgan')
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const queries = require('./queries');
const passport = require('passport');
const auth = require('./auth');
const multer = require("multer");
const cors = require('cors');
const v = require('./validation');
const feedback = require('./controllers/feedbackController');
const users = require('./controllers/userController')


////Import Routers////
const userRouter = require('./routers/userRouter');
const auctionRouter = require('./routers/auctionRouter');
const feedbackRouter = require('./routers/feedbackRouter');
const categoryRouter = require('./routers/categoryRouter');
const bidRouter = require('./routers/bidRouter');

require('./passport');
require('dotenv').config();

//Use this to set up image storage in the file system.
//Not using cloud storage because this project is somewhat small
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'images')
  },
  filename: (req, file, callback) => {
    callback(null, Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage })


const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
let allowedOrigins = ["http://localhost:8080"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      let message = `The CORS policy for this application doesn't allow access from origin ` + origin;
      return callback(new Error(message), false);
    }
    return callback(null, true);
  }
}));


app.use('/', express.static('public'));
app.get('/', (req, res) => {
  res.send('Welcome to my app!')
})

/**
 * @method GET
 * @param {integer} user_id
 * Gets a user's user_id, username, and email given a specific user_id
 */
app.get(
  '/users/:user_id',
  queries.getUserById);

/**
 * @method GET
 * @param {integer} user_id
 * Gets a user's Bid history based on the user_id
 */
app.get(
  '/bids/:user_id',
  passport.authenticate('jwt', { session: false }),
  queries.getBidHistory);

/**
 * @method GET
 * @param {integer} auction_id
 * Get's an auctions bid history based on the auction_id
 */
app.get(
  '/auctions/bids/:auction_id',
  queries.getAuctionBidHistory);

/**
 * @method GET
 * @param {integer} auction_id
 * Gets info on a particular auction based on the auctions ID.
 */
app.get(
  '/auctions/:auction_id/',
  queries.getAuction);

/**
 * @method GET
 */
app.get(
  '/categories',
  queries.getCategories
);

/**
 * @method GET
 * @param {string} keyword
 * @param {integer} category_id
 * Get's a list of auctions based on a keyword
 * Will search through live auctions only as default.
 * Maybe add option to search for all auctions?
 */
app.get(
  '/auctions/search/:keyword/:category_id',
  queries.searchAuctions);

/**
 * @method GET
 * @param {integer} user_id
 * Gets a user's feedback based on the user_id
 */
app.get(
  '/feedback/:user_id',
  feedback.getFeedback);

/**
 * @method POST
 * @param {string} email
 * @param {string} password
 * Logs in a user based on their email and password
 * Returns a JWT token to the user to be stored locally by the user
 */
app.post(
  '/login',
  v.validate('login'),
  passport.authenticate('local', { session: false }),
  auth.userLogin);

/**
 * @method POST
 * @body {string} username
 * @body {string} password
 * @body {string} email
 */
app.post(
  '/users',
  v.validate('createUser'),
  queries.createUser);

/**
 * @method POST
 * @body {string} category
 * Used by me to insert categories easily for testing
 * Not to be implemented client side
 */
app.post(
  '/categories',
  queries.createCategory);

/**
 * @method POST
 * @body {integer} user_id
 * @body {string} title
 * @body {integer} category_id
 * @body {string} description
 * @body {integer} endTime
 * @body {float} start_price
 * @body {file} image file (Upload a file.  The image path will be created by multer and stored)
 * Creates an auction.  Initializes with no highest bidder, no end price, and 0 initial bids
 */
app.post(
  '/auctions',
  v.validate('createAuction'),
  passport.authenticate('jwt', { session: false }),
  upload.single('image'),
  queries.createAuction);

/** 
 *@method POST
 * @body {integer}  user_id 
 * @body {integer} poster_id (a different user_id)
 * @body {integer} auction_id
 * @body {-1, 0, 1} feedback_score
 * @body {string} feedback
 * Allows a user to leave feedback on someone else's account if.
 */
app.post(
  '/feedback',
  v.validate('postFeedback'),
  passport.authenticate('jwt', { session: false }),
  feedback.leaveFeedback);

/**
 * @method PUT
 * @param {integer} auction_id
 * @body {integer} user_id
 * @body {float} bid
 * Allows a user to place a bid on an aucion
 */
app.patch(
  '/auctions/:auction_id',
  v.validate('placeBid'),
  passport.authenticate('jwt', { session: false }),
  queries.placeBid);

/**
 * @method PUT
 * @param {integer} user_id
 * @body {string} password
 * @body {string} newPassword
 */
app.patch(
  '/users//:user_id',
  v.validate('updateUsername'),
  passport.authenticate('jwt', { session: false }),
  queries.updateUsername);

/**
* @method PUT
* @param {integer} user_id
* @body {string} password
* @body {string} username
* @body {string} newUsername
*/
app.patch(
  '/users/password/:user_id',
  v.validate('updatePassword'),
  passport.authenticate('jwt', { session: false }),
  queries.updatePassword);


/**
 * @method DELETE
 * @param {integer} user_id
 * @body {string} password
 */
app.delete(
  '/users/:user_id',
  v.validate('deleteUser'),
  passport.authenticate('jwt', { session: false }),
  queries.deleteUser);




app.use('/api/v1/users/', userRouter)
app.use('/api/v1/auctions', auctionRouter)
app.use('/api/v1/feedback', feedbackRouter)
app.use('/api/v1/categories', categoryRouter)
app.use('/api/v1/bids', bidRouter)




app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const port = process.env.PORT || 8080

module.exports = app.listen(port, () => {
  queries.resetTimeoutFunctions();
  console.log('Your app is listening on port 8080');
});