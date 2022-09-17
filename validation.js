const { body, param, check } = require("express-validator");

//Switch function to do validation for all necessary user inputs.
const validate = (method) => {
  switch(method) {
    case 'createUser': {
      return [
        body("username", "Username must be at least 5 characters").isLength({min: 5}),
        body("username", "Username contains non-alphanumeric characters").isAlphanumeric(),
        body("password", "Password must be at least 8 characters and must be alphanumeric").isLength({min: 8}).isAlphanumeric(),
        body("email", "Please enter a valid Email address").isEmail()
      ];
    } 
    case 'login': {
      return [
        check('email', 'Please enter a valid email address').isEmail(),
        check('password', 'Password must be at least 8 characters and must be alphanumeric').isLength({min: 8}).isAlphanumeric()
      ]
    }
    case 'createAuction': {
      return [
        body('user_id').isNumeric(),
        body('category_id').isNumeric(),
        body('description').escape(),
        body('start_price').isFloat({min: 0.01}),
        body('title').isLength({min: 8}).escape(),
      ]
    }
    case 'placeBid': {
      return [
        body('user_id', 'Please do not alter the user id').isNumeric(),
        body('bid').isFloat({min: 0.01}),
        param('auction_id', 'Please do not alter the auction id').isNumeric()
      ]
    }
    case 'updateUsername': {
      return [
        param('user_id').isNumeric(),
        body('password', 'Password must be at least 8 characters and must be alphanumeric').isLength({min: 8}).isAlphanumeric(),
        body('username', "Username contains non-alphanumeric characters").isAlphanumeric(),
        body("username", "Username must be at least 5 characters").isLength({min: 5}),
        body('newUsername', "Username contains non-alphanumeric characters").isAlphanumeric(),
        body("newUsername", "Username must be at least 5 characters").isLength({min: 5}),
      ]
    }
    case 'updatePassword': {
      return [
        param('user_id').isNumeric(),
        body('password', 'Password must be at least 8 characters and must be alphanumeric').isLength({min: 8}).isAlphanumeric(),
        body('newPassword', 'Password must be at least 8 characters and must be alphanumeric').isLength({min: 8}).isAlphanumeric()
      ]
    }
    case 'postFeedback': {
      return [
        body('user_id').isNumeric(),
        body('feedback_poster_id').isNumeric(),
        body('auction_id').isNumeric(),
        body('feedback').escape(),
      ]
    }
    case 'deleteUser': {
      return [
        param('user_id').isNumeric(),
        body('password', 'Password must be at least 8 characters and must be alphanumeric').isLength({min: 8}).isAlphanumeric()
      ]
    }
  }
}

module.exports = {
  validate
}