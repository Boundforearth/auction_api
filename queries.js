const db = require('./db-info');
const {validationResult} = require('express-validator');
const {differenceInMilliseconds, addDays, addMinutes} = require('date-fns')
const bcrypt = require('bcrypt');
require('./passport');

/**
 * Function used with deleteUser.  
 * @param {integer} id 
 * @param {float} price 
 */
const handleLiveAuctions = (id, price) => {
  db.pool.query('SELECT current_price FROM Auctions WHERE auction_id=$1', [id], (error, results) => {
    if(error){
      console.log(error);
    }
    db.pool.query('UPDATE Auctions SET end_price=$1', [price], (error,resultsThree) => {
      if(error){
        console.log(error);
      }
    })
  })
  db.pool.query('DELETE FROM LiveAuctions WHERE auction_id=$1', [id], (error, results) => {
    if(error) {
      console.log(error);
    }
  })
  console.log('Auction ended ' + id)
}

/**
 * Function used to grab the JWT token, pull out the payload, and then grab the user_id from the payload.
 * After grabbing the user_id, it will check that against the user_id submitted in a form.
 * If the two match, then the user is verified and the action they were attempting will proceed. 
 * @param {string} token 
 * @return {boolean} 
 * Returns true if the user has access, false if something fishy is going on.
 */

const verifyUser = (req, user) => {
  token = req
  parsed = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  id = parsed.user_id;
  if(id == user) {
    return true;
  }
  else {
    return false;
  }
}

/***
 * @method GET
 * @param { integer }
 * @returns {Object}
 * 
 * make a get request to the server to get a user based off of user_id
 */
const getUserById = (req, res) => {
 const user_id = req.params.user_id;
  db.pool.query('SELECT user_id, username, feedback_score FROM Users WHERE user_id=$1', [user_id], (error,results) => {
    if (error) {
      res.status(400).send('Error with the database.');
      return;
    }
    if(typeof(results.rows[0]) !== 'undefined') {
      res.status(200).json(results.rows[0]);
      return
    } else {
      res.status(404).send('That user could not be found.')
    }
  })
};

/***
 * @method POST
 * @param {string}
 * @param {string}
 * @param {string}
 * Takes a string each for user_id, email, and password.
 * Checks if username or email already exist
 * Returns message that the username was added
 */
const createUser = (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const hash = bcrypt.hashSync(password, 10)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  } else{
    db.pool.query('SELECT username, email FROM Users WHERE username=$1 OR email=$2', [username, email], (error, results) => {
      if (error) {
        res.status(400).send('Error with the database');
        return;
      }
      if(typeof(results.rows[0]) !== 'undefined') {
        return res.status(400).send('That username or email already exists');
      } else {
          db.pool.query('INSERT INTO Users (username, email, password, feedback_score) VALUES ($1, $2, $3, $4) RETURNING user_id', 
          [username, email, hash, 0], (error, results) => {
            if(error) {
              res.status(400).send('Error with the database');
              return;
            }
            res.status(200).send(`Created username ${username}`);
            return;
          }
        );
      }
    })
  }
};

/**
 * @method POST
 * @pbody {integer} 
 * @body {integer}
 * @body {string} 
 * @body {string} 
 * @pbody {integer} 
 * @body {integer} 
 * Records the creators id, the category they selected, the item description, the number of days from current time when the auction ends,
 * and the starting price.  number of bids initializes to 0, current price to null, highest bidder to null
 */
const createAuction = (req, res) => {
  const{user_id, category_id, description, endTime, title} = req.body;
  const tempPrice = req.body.start_price
  const start_price = Number(tempPrice).toFixed(2);

  let check = verifyUser(req.headers.authorization, user_id)
  if(!check) {
    res.status(400).send('Users may only perform this action with their own account.');
    return;
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  } else{
    if(endTime !== 1 && endTime !== 3 && endTime !== 5 && endTime !== 7) {
      res.status(400).send('End time must either be 1, 3, 5, or 7');
      return;
    }
    const start_date = (new Date()); 
    const end_date = addMinutes(start_date, endTime)
    const diff = differenceInMilliseconds(end_date, start_date);
    let image_path = null
    if(Object.prototype.hasOwnProperty.call(req, 'file.path')) {
      image_path = './' + req.file.path;
    } 
    //const image_path = "amks"
    db.pool.query('INSERT INTO Auctions (user_id, title, highest_bidder, category_id, image_path, description, start_date, end_date, start_price, current_price, end_price, bid_count, highest_bid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING auction_id', 
      [user_id, title, null, category_id, image_path, description, start_date, end_date, start_price, start_price, null, 0, null], (error, results) => {
        const auction_id = results.rows[0].auction_id;
        if(error){
          res.status(400).send("Please properly fill out the form" + error);
          return;
        } else{
        db.pool.query('INSERT INTO LiveAuctions (auction_id, user_id, category_id, current_price, title, image_path, highest_bidder, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [auction_id, user_id, category_id, start_price, title, image_path, null, end_date], (error, results)=> {
          if(error) {
            res.status(400).send("Error creating auction" + error);
            return;
          } else {
            setTimeout(() => {
              db.pool.query('UPDATE Auctions SET end_price=current_price WHERE auction_id=$1', [auction_id], (error, results) => {
                if(error) {
                  res.status(400).send(error);
                  return;
                }
              })
              db.pool.query('DELETE FROM LiveAuctions WHERE auction_id=$1', [auction_id], (error, results)=> {
                if(error) {
                  res.status(400).send(error);
                  return;
                }
              })
            }, diff)
            res.status(200).send(`You have created an auction with id ${auction_id}`);
            return;
          }
        })};
      })
  }
};

/**
 * @method GET
 * @param {string} 
 * Used to add a category to the DB.  Just for bckend stuff
 */
const createCategory = (req, res) => {
  const category = req.body.category;
  db.pool.query('SELECT category FROM Categories WHERE category=$1', [category],(error, results) => {
    if (error) {
      res.status(400).send('Error with the database');
      return;
    }
    if(typeof(results.rows[0]) !== 'undefined') {
      res.status(400).send('That category is already in the DB');
    } else {
      db.pool.query('INSERT INTO Categories (category) VALUES ($1)', [category], (error, results) => {
        if(error) {
          res.status(400).send('Error with the database');
          return;
        }
        res.status(200).send(`Inserted ${category}`);
      })
    }
  })
}

/***
 * Function used to calculate the increment with which the bid price should increase
 * @param {price}
 * @return {float}
 */
const calculateIncrement = (price) => {
  if(price < 50.00) {
    return 1.00;
  } else if (price < 200.00) {
    return 2.50;
  } else {
    return 5.00
  }
}

/**
 * @method PUT
 * @param {bid} 
 * @param {auction_id}
 * @param {user_id}
 * Bid is what the user would like to place as a bid. The user_id is that of the bidder, which is stored as highest_bidder in the database
 * This is used to place a bid
 * Must also post the bid to the Bids table
 */
const placeBid = (req, res) => {
  const {user_id} = req.body;
  const tempBid = req.body.bid;
  const auction_id = req.params.auction_id
  const bid = Number(tempBid).toFixed(2);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  let check = verifyUser(req.headers.authorization, user_id)
  if(!check) {
    res.status(400).send('Users may only perform this action with their own account.');
    return;
  } else {
    //Need to check if auction is actually live first
    db.pool.query('SELECT * FROM LiveAuctions WHERE auction_id=$1', [auction_id], (error, results) => {
      if(error) {
        res.status(400).send('Error contacting the database');
        return;
      }
      if(typeof(results.rows[0]) === 'undefined') {
        res.status(400).send('That auction does not exist')
        return;
      }
      db.pool.query('SELECT user_id, end_date, current_price, bid_count, highest_bid, highest_bidder FROM Auctions WHERE auction_id=$1', [auction_id], (error, results) => {
        if(error) {
          res.status(400).send('Error with the database');
          return;
        }
        //get row returned from the query and save everything needed to variables
        const auctioneer = results.rows[0].user_id;
        const end_date = results.rows[0].end_time;
        const current_price = results.rows[0].current_price;
        let increment = calculateIncrement(current_price);
        const highest_bid = results.rows[0].highest_bid;
        const highest_bidder = results.rows[0].highest_bidder;
        let bid_count = results.rows[0].bid_count;
        let bidToInput = 0
        bid_count += 1;
        let today = new Date().toUTCString();

        //Don't allow bids if the auction has already ended!
        if(today >= end_date) {
          res.status(400).send("The auction has already ended");
          return;
        } else {

          //Don't allow bids of the price is not higher than the necessary increment
          if( bid < (current_price + increment)) {
            res.status(400).send('Please enter a higher bid');
            return;
          } else {

            //Prevents auctioneer from artificially raising the price of their own auctions
            if (user_id === auctioneer) {
              res.status(400).send("You can't bid on your own auctions");
              return;
            //If the highest bidder makes a new bid, we need to compare it to their old bid, not the current price
            //We also do not want to change the current price if they bid a higher amount
            } else if(user_id === highest_bidder) {
              if(bid <= highest_bid) {
                res.status(400).send('Please enter a higher bid');
                return;
              }
              db.pool.query('UPDATE Auctions SET highest_bid=$1, bid_count=$2 WHERE auction_id=$3', [bid, bid_count, auction_id], (error, results) => {
                if(error) {
                  console.log(error)
                  return res.status(400).send('That is not a valid user.');
                } else {
                  //don't return here, as returning would prevent bid from entering bids table
                  res.status(200).send('You have successfully placed your bid')
                }
              })
            //If there is no current bids, current price should not change
            //If the bid is higher than the highest bid, we need to handle what the current bid is in regards to price increments
            } else if(bid > highest_bid || typeof(highest_bid) === 'null') {
              if(typeof(highest_bidder) === 'null') {
                bidToInput = current_price;
              }
              else if((highest_bid + calculateIncrement(highest_bid)) >= bid) {
                bidToInput = bid;
              }
              else {
                bidToInput = highest_bid + calculateIncrement(highest_bid);
              }
              db.pool.query('UPDATE Auctions SET highest_bidder=$1, current_price=$2, highest_bid=$3, bid_count=$4 WHERE auction_id=$5', [user_id, bidToInput, bid, bid_count, auction_id], (error, results) => {
                if(error) {
                  console.log(error)
                  return res.status(400).send('That is not a valid user.');
                } else {
                  db.pool.query('UPDATE LiveAuctions SET highest_bidder=$1, current_price=$2 WHERE auction_id=$3', [user_id, bidToInput, auction_id], (error, results) => {
                    if(error) {
                      console.log(error)
                      return res.status(400).send('Database error')
                    } else {
                      //Don't return here, otherwise bid will not be entered into the bids table
                      res.status(200).send(`You're the highest bidder!`)
                    }
                  })
                }
              })
            } else{
              //If the bid was lower than the highest bid, then we go here
              //Still need to properly handle increments
              //ex: highest bid = 50.00. bid=49.50.  current price should be 50, not 50.50
              if(highest_bid <= bid + calculateIncrement(bid)){
                bidToInput = highest_bid
              } else {
                bidToInput = bid + calculateIncrement(bid)
              }
              db.pool.query('UPDATE Auctions SET current_price=$1, bid_count=$2 WHERE auction_id=$3', [bidToInput, bid_count, auction_id], (error, results) => {
                if(error) {
                  console.log(error)
                  return res.status(400).send('Error with the database');
                } else {
                  db.pool.query('UPDATE LiveAuctions SET highest_bidder=$1, current_price=$2 WHERE auction_id=$3', [user_id, bidToInput, auction_id], (error, results) => {
                    if(error) {
                      console.log(error)
                      return res.status(400).send('Database error')
                    } else {
                      //Don't return, otherwise bid will not be entered into Bids table 
                      res.status(200).send(`Another user still has a higher bid`)
                    }
                  })
                }
              })
            }
          }
          //Finally, insert the bid into the database
          db.pool.query('INSERT INTO Bids (auction_id, user_id, price, bid_time) VALUES($1, $2, $3, $4)', [auction_id, user_id, bid, today], (error, results) => {
            if(error) {
              console.log(error)
            }
          })
        }
      })
    })
  }
};

/**
 * @method GET
 * @param {*} req 
 * @param {*} res 
 * @returns {Object}
 * returns a JSON object full of a bidders bid history
 */
const getBidHistory = (req, res) => {
  const user_id = req.params.user_id;
  let check = verifyUser(req.headers.authorization, user_id)
  if(!check) {
    res.status(400).send('Users may only perform this action with their own account.');
    return;
  } else{
      db.pool.query('SELECT * FROM Bids WHERE user_id=$1', [user_id], (error, results) => {
        if (error) {
          res.status(400).send('Error with the database');
          return;
        }
        res.status(200).json(results.rows);
  })}
};

/**
 * @method GET
 * @param {integer} auction_id
 */
const getAuctionBidHistory = (req, res) => {
  const auction_id = req.params.auction_id;
  db.pool.query('SELECT price, bid_time FROM Bids WHERE auction_id=$1',[auction_id], (error, results) => {
    if(error) {
      return res.status(400).send('Error connecting with the database');
    } else if(typeof(results.rows[0]) !== 'undefined') {
      return res.status(200).json(results.rows);
    } else {
      return res.status(404).send('Currently no bids on this auction')
    }
  })
}

/**
 * @method GET
 */
const getCategories = (req, res) => {
  db.pool.query('SELECT * FROM Categories', (error, results) => {
    if(error) {
      return res.status(400).send('Error retrieveing categories from the database');
    } else if(typeof(results.rows[0]) !== 'undefined') {
      return res.status(200).json(results.rows)
    } else {
      return res.status(404).send('categoreis not found')
    }
  })
}

/**
 * @method GET
 * @param {Integer}  
 * @returns {Object}
 * Use an auction_id in the parameters to return a single auction from the Auctions table
 */
const getAuction = (req, res) => {
  const auction_id = req.params.auction_id;
  db.pool.query("SELECT * FROM Auctions WHERE auction_id=$1", [auction_id], (error, results) => {
    if(error) {
      return res.status(400).send('Error with the database');
    } if(typeof(results.rows[0]) !== 'undefined') {
      return  res.status(200).json(results.rows);
    } else {
      return res.status(404).send('That auction could not be found')
    }
  })
};

/**
 * @method GET
 * @param {string}
 * @body {Integer}
 * @returns {Object List}
 * Get a list of Objects from the table based on a keyword that is searched
 * Optionally place a category in the body 
 */

const searchAuctions = (req, res) => {
  const {keyword, category_id} = req.params;
  if (category_id == 0) {
    db.pool.query('SELECT auction_id, title, image_path FROM LiveAuctions WHERE title ILIKE $1 ORDER BY end_date', ['%' + keyword + '%'], (error, results) => {
      if(error) {
        return res.status(400).send('Error with the database');
      } else if(typeof(results.rows[0]) !== 'undefined') {
        return res.status(200).json(results.rows)
      } else {
        return res.status(404).send('No auctions found for that keyword')
      }
    })
  } else {
    db.pool.query('SELECT auction_id, title, image_path FROM LiveAuctions WHERE title ILIKE $1 AND category_id=$2 ORDER BY end_date', ['%' + keyword + '%', category_id], (error, results) => {
      if(error) {
        console.log(error)
        return res.status(400).send('Error with the database');
      } else if(typeof(results.rows[0]) !== 'undefined') {
        return res.status(200).json(results.rows)
      } else {
        return res.status(404).send('No results found for that keyword')
      }
    })
  }
}


const updateUsername = (req, res) => {
  const user_id = req.params.user_id;
  const password = req.body.password;
  const username = req.body.username;
  const newUsername = req.body.newUsername
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  let check = verifyUser(req.headers.authorization, user_id)
  if(!check) {
    return res.status(400).send('Users may only perform this action with their own account.');
  }
  db.pool.query('SELECT password FROM Users WHERE user_id=$1', [user_id], (error, results) => {
    if(error){
      console.log(error)
      return res.status(400).send('Error with database request')
    } else if(typeof(results.rows[0])=== 'undefined') {
      return res.status(400).send('Could not find that user in the database')
    } else {
      const hash = results.rows[0].password;
      const correct = bcrypt.compareSync(password, hash);
      if(!correct) {
        return res.status(400).send('That password is not correct');
      } else if(username === newUsername) {
        return res.status(400).send('Please enter a new username')
      } else {
        db.pool.query('UPDATE Users SET username=$1 WHERE user_id=$2', [newUsername, user_id], (error, results) => {
          if(error) {
            return res.status(400).send("Error contacting the database");
          } else {
            return res.status(200).send(`Your username has been updated to ${newUsername}`)
          }
        })
      }
    }
  })
}

const updatePassword = (req, res) => {
  const user_id = req.params.user_id;
  const password = req.body.password;
  const newPassword = req.body.newPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  let check = verifyUser(req.headers.authorization, user_id)
  if(!check) {
    return res.status(400).send('Users may only perform this action with their own account.');
  }
  db.pool.query('SELECT password FROM Users WHERE user_id=$1', [user_id], (error, results) => {
    if(error){
      console.log(error)
      return res.status(400).send('Error with database request')
    } else if(typeof(results.rows[0]) === 'undefined') {
      return res.status(404).send('That user could not be found')
    } else {
      const hash = results.rows[0].password;
      const correct = bcrypt.compareSync(password, hash);
      if(!correct) {
        return res.status(400).send('That password is not correct');
      } else {
        if(password === newPassword) {
          return res.status(400).send('That is your current password')
        } else {
          const hashed = bcrypt.hashSync(newPassword, 10)
          db.pool.query('UPDATE Users SET password=$1 WHERE user_id=$2', [hashed, user_id], (error, results) => {
            if(error) {
              console.log(error)
              return res.status(400).send('Error with the database');
            } else {
              return res.status(200).send('Your password has been updated')
            }
          })
        }
      }
    }
  })
}

/**
 * @method DELETE
 * @param {integer}
 * Takes a user_id as an integer.  Then checks to see if a user is either the auctioneer or highest bidder
 * Users participating in active auctions are not allowed to delete their accounts.
 */

const deleteUser = (req, res) => {
  const user_id = req.params.user_id;
  const password = req.body.password;

  //code to check validation results
  const errors = validationResult(req);
  let check = verifyUser(req.headers.authorization, user_id)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  } else if (!check){
    return res.status(400).send('Users may only perform this action with their own account.');
  } else {
      //Deleting an account is a big deal, so I will still have users verify their password here, just in case.
    db.pool.query('SELECT password FROM Users WHERE user_id=$1', [user_id], (error, results) => {
      if(error) {
        console.log(error)
        return res.status(400).send('Error with the database')
      } else if (typeof(results.rows[0]) === 'undefined') {
        return res.status(404).send('That user does not exist')
      } else {
        const hash = results.rows[0].password;
        correct = bcrypt.compareSync(password, hash)
        if(!correct) {
          return res.status(400).send('Incorrect password');
        } else {
          db.pool.query('SELECT * FROM LiveAuctions WHERE user_id=$1 OR highest_bidder=$2', [user_id, user_id], (error, results) => {
            if(error) {
              console.log(error)
              return res.status(400).send('Error with the database');
            } else if(typeof(results.rows[0]) !== 'undefined') {
              return res.status(400).send('Cannot delete account while running an auction or bidding on an item');
            } else {
              db.pool.query('DELETE FROM Users WHERE user_id=$1', [user_id], (error, respone) => {
                if(error) {
                  console.log(error)
                  return res.status(400).send('Error with the database');
                } else {
                  return res.status(200).send(`User deleted with ID: ${user_id}`);
                };
              });
            };
          });
        };
      };
    });
  };
};


const resetTimeoutFunctions = () => {
  const currentTime = new Date();
  db.pool.query('SELECT * FROM LiveAuctions', (error, results) => {
    if(error){ 
      res.status(400).send('Error with the database');
      return;
    }
    if(typeof(results.rows[0]) !== 'undefined') {
      results.rows.forEach((row) => {
        const auction_id = row.auction_id;
        const end_time = row.end_date;
        const diff = differenceInMilliseconds(end_time, currentTime);
        if(diff <= 0) {
          handleLiveAuctions(auction_id, row.current_price);
        }
        else {
          setTimeout(() => {handleLiveAuctions(auction_id, row.current_price)}, diff)
        }
      })
    }
  })
}

module.exports = {
  createAuction,
  createCategory,
  createUser,
  deleteUser,
  getAuction,
  getAuctionBidHistory,
  getCategories,
  getBidHistory,
  getUserById,
  placeBid,
  searchAuctions,
  resetTimeoutFunctions,
  updateUsername,
  updatePassword, 
  verifyUser
}