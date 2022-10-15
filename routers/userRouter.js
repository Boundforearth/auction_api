const express = require('express');
const passport = require('passport');
const userController = require('../controllers/userController');
const router = express.Router()
const v = require('./validation');

router('/')
  .post(v.validate('createUser'), userController.createUser)

router('/:id')
  .get(userController.getUserById)
  ////Need to fix validation
  .patch(v.validate('updateUsername'), passport.authenticate('jwt', { session: false }), userController.updateUser)
  .delete(v.validate('deleteUser'), passport.authenticate('jwt', { session: false }), userController.deleteUser)