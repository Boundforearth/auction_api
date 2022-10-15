const express = require('express');
const auctionController = require('../controllers/auctionController');
const passport = require('passport');
const v = require('./validation');

const router = express.Router()

router('/')
router('/:auction_id')
router('/bids/:auction_id')
router('/search/:keyword/:category_id')