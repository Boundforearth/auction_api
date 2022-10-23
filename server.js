const express = require('express');
const morgan = require('morgan')
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const handler = require('./handlers');
const cors = require('cors');



////Import Routers////
const userRouter = require('./routers/userRouter');
const auctionRouter = require('./routers/auctionRouter');
const feedbackRouter = require('./routers/feedbackRouter');
const categoryRouter = require('./routers/categoryRouter');
const bidRouter = require('./routers/bidRouter');

require('./passport');
require('dotenv').config();

const app = express();

// BodyParser and Logs middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

//Cors and allowed origins
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
  handler.resetTimeoutFunctions();
  console.log('Your app is listening on port 8080');
});