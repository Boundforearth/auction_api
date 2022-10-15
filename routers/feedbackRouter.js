const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const passport = require('passport');
const v = require('./validation');

const router = express.Router()

router('/')
  .post(v.validate('postFeedback'), passport.authenticate('jwt', { session: false }), feedbackController.leaveFeedback)

router('/:user_id')
  .get(feedbackController.getFeedback)
