const express = require('express')
const bidController = require('../controllers/bidController')
const passport = require('passport')

const router = express.Router()

router.route('/:user_id')
  .get(passport.authenticate('jwt', { session: false }), bidController.getBidHistory)


module.exports = router