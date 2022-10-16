const express = require('express');
const auctionController = require('../controllers/auctionController');
const passport = require('passport');
const v = require('./validation');

const router = express.Router()

router('/')
  .post(v.validate('createAuction'), passport.authenticate('jwt', { session: false }), upload.single('image'), auctionController.createAuction)

router('/:auction_id')
  .get(auctionController.getAuction)
  .patch(v.validate('placeBid'), passport.authenticate('jwt', { session: false }), auctionController.placeBid)

router('/bids/:auction_id')
  .get(auctionController.getAuctionBidHistory)

router('/search/:keyword/:category_id')
  .get(auctionController.searchAuctions)