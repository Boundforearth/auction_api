const express = require('express');
const categoryController = require('../controllers/categoryController');

const router = express.Router()

router('/')
  .get(categoryController.getCategories)
  .post(categoryController.createCategory)