const express = require('express');
const categoryController = require('../controllers/categoryController');
const passport = require('passport');
const v = require('./validation');

const router = express.Router()