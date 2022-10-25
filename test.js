//Rather than accounting for all the changes in id's for auctions and cleaning up the database in the tests, I find it easier and
//quicker to just drop the tables and remake them for testing.

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('./server.js')

//assertion style
chai.should();
chai.use(chaiHttp);

let tokenUserOne = ''
let tokenUserTwo = ''
let tokenUserThree = ''
describe('Auction API Tests', () => {
  /**
   * create a user account
   */

  describe('POST /api/v1/users/', () => {
    it("Should create a user account", (done) => {
      const user = {
        'username': 'bowserbowser',
        'password': '12345678',
        'email': 'bowser@jank.com'
      }
      chai.request(server)
        .post('/api/v1/users/')
        .send(user)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('success');
          response.body.should.have.property('message').eq('Created username bowserbowser');
          response.should.be.status(200);
          done();
        });
    });

    it("Should return that password is too short in errors object", (done) => {
      const user = {
        'username': 'bow',
        'password': '123456',
        'email': 'bowser@jank.com'
      }
      chai.request(server)
        .post('/api/v1/users/')
        .send(user)
        .end((error, response) => {
          response.should.be.status(400);
          response.body.should.be.a('object');
          response.body.errors[0].should.have.property('msg').eq('Username must be at least 5 characters');
          response.body.errors[1].should.have.property('msg').eq('Password must be at least 8 characters and must be alphanumeric');
          done();
        });
    });

    it("Should fail to create account that already exists", (done) => {
      const user = {
        'username': 'bowserbowser',
        'password': '12345678',
        'email': 'bowser@jank.com'
      }
      chai.request(server)
        .post('/api/v1/users/')
        .send(user)
        .end((error, response) => {
          response.should.be.status(400);
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('fail');
          response.body.should.have.property('message').eq('That username or email already exists');
          done();
        });
    });
  });

  /**
   * Test /login route success
   */
  describe('POST /login', () => {
    it('Should log in a user and return a JWT token', (done) => {
      const user = {
        'email': 'bowser@jank.com',
        'password': '12345678'
      }
      chai.request(server)
        .post('/login')
        .send(user)
        .end((error, response) => {
          response.should.be.status(200);
          response.body.should.be.a('object');
          response.body.should.have.property('username').eq('bowserbowser');
          response.body.should.have.property('token');
          tokenUserOne = response.body.token
          done();
        });
    });

    it('Should fail to login user with bad username', (done) => {
      const user = {
        'email': 'bowser@ja',
        'password': '12345678'
      }
      chai.request(server)
        .post('/login')
        .send(user)
        .end((error, response) => {
          response.text.should.be.eq('Unauthorized')
          done();
        });
    });

    it('Should fail to login a user with a bad password', (done) => {
      const user = {
        'email': 'bowser@jank.com',
        'password': '123456'
      }
      chai.request(server)
        .post('/login')
        .send(user)
        .end((error, response) => {
          response.text.should.be.eq('Unauthorized')
          done();
        });
    });
  });

  /**
   * Test category creation
   */
  describe('POST /api/v1/categories', () => {
    const category = {
      'category': 'video games'
    }
    it('Should create a new category given a category name', (done) => {
      chai.request(server)
        .post('/api/v1/categories')
        .send(category)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('success');
          response.body.should.have.property('message').eq('Inserted video games');
          response.should.have.status(200);
          done();
        });
    });

    it('Should fail to create a category already in the database', (done) => {
      chai.request(server)
        .post('/api/v1/categories')
        .send(category)
        .end((error, response) => {
          response.should.have.status(400);
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('fail');
          response.body.should.have.property('message').eq('That category is already in the DB');
          done();
        });
    });
  });


  /**
   * Test category list retrieval
   */
  describe('GET /api/v1/categories', () => {
    it('Should get a list of all categories', (done) => {
      chai.request(server)
        .get('/api/v1/categories')
        .end((error, response) => {
          response.should.have.status(200);
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('success');
          response.body.data.forEach((object) => {
            object.should.have.property('category_id');
            object.should.have.property('category');
          }
          )
          done();
        });
    });
  });

  /**
   * Test getting a users information by id
   */
  describe('GET /users/:user_id', () => {
    it('It should GET a single user by their user_id', (done) => {
      const user_id = 1;
      chai.request(server)
        .get('/api/v1/users/' + user_id)
        .end(function (error, response) {
          response.body.should.be.a('object');
          response.body.data.user.should.have.property('username');
          response.body.data.user.should.have.property('user_id').eq(1);
          response.body.data.user.should.have.property('feedback_score');
          response.should.have.status(200);
          done();
        });
    });

    it('It should NOT GET a user', (done) => {
      const user_id = 50;
      chai.request(server)
        .get('/api/v1/users/' + user_id)
        .end(function (error, response) {
          response.should.be.status(404);
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('fail');
          response.body.should.have.property('message').eq('User not found.')
          done()
        });
    });
  });

  /**
   * Test creating an auction
   */
  describe('POST /api/v1/auctions', () => {

    it("Should fail to post auction without authorization", (done) => {
      const auction = {
        "user_id": 1,
        "title": "My auction BID HERE!",
        "category_id": 1,
        "description": "A cool thing",
        "endTime": 1,
        "start_price": 1.00
      }
      chai.request(server)
        .post('/api/v1/auctions')
        .send(auction)
        .end((error, response) => {
          response.text.should.be.eq(`Unauthorized`)
          done();
        });
    });

    it("should correctly create an auction", (done) => {
      const auction = {
        "user_id": 1,
        "title": "My auction BID HERE!",
        "category_id": 1,
        "description": "A cool thing",
        "endTime": 1,
        "start_price": 1.00
      }
      chai.request(server)
        .post('/api/v1/auctions')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(auction)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('success');
          response.body.should.have.property('message').eq(`You have created an auction with id 1`)
          response.should.have.status(200);
          done();
        });
    });

    /**
 * Test auction creation w/ image file
 * NOTE, CHAI AUTO CONVERTS NUMBERS TO STRINGS IN .field().  As far as I can tell, anyway
 * this kills the test, as none of the numbers will pass vlidation and the user gets blocked
 * this is a problem with chai.  As observed in the above test, it passes fine without fields
 * sent can not be used with attach, however, so fields become necessary.
 * Not getting a multer error implies success here
 */
    it("Should get past multer upload, but trigger incorrect user warning", (done) => {
      chai.request(server)
        .post('/api/v1/auctions')
        .attach('image', './images/1663039586518.png')
        .field("user_id", 1)
        .field("category_id", 1)
        .field("description", "A cool thing")
        .field("start_price", 1.00)
        .field("title", "My auction BID HERE!")
        .field("endTime", 7)
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .end((error, response) => {
          response.body.should.be.a('object')
          response.body.errors.forEach((object) => {
            object.should.have.property('param')
          })
          done();
        });
    });

    it("Should fail to insert bad parameters title", (done) => {
      const auction = {
        "user_id": 1,
        "title": '',
        "category_id": 1,
        "description": "A cool thing",
        "endTime": 5,
        "start_price": 1.00
      }
      chai.request(server)
        .post('/api/v1/auctions')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(auction)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.errors[0].should.have.property('param').eq('title')
          response.should.have.status(400);
          done();
        });
    });

    it("Should fail to insert bad parameters endTime", (done) => {
      const auction = {
        "user_id": 1,
        "title": 'cool auction BID HERE',
        "category_id": 1,
        "description": "A cool thing",
        "endTime": 6,
        "start_price": 1.00
      }
      chai.request(server)
        .post('/api/v1/auctions')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(auction)
        .end((error, response) => {
          response.text.should.be.eq('End time must either be 1, 3, 5, or 7')
          response.should.have.status(400);
          done();
        });
    });
  });

  /**
   * Test getting bid history of an auction part 1
   */
  describe('GET /api/v1/auctions/bids/:auction_id', () => {

    it('Should not get the bid history of a non-existant auction', (done) => {
      chai.request(server)
        .get('/api/v1/auctions/bids/1')
        .end((error, response) => {
          response.should.have.status(404)
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('fail');
          response.body.should.have.property('message').eq('Currently no bids on this auction');
          done();
        })
    })
  })

  /**
   * Get an auction given the auction_id
   */
  describe('GET /api/v1/auctions/:auction_id', () => {
    it('Should get an auction given the id', (done) => {
      chai.request(server)
        .get('/api/v1/auctions/1')
        .end((error, response) => {
          response.should.have.status(200);
          response.body.should.be.a('object');
          response.body.data[0].should.have.property('auction_id');
          response.body.data[0].should.have.property('user_id');
          response.body.data[0].should.have.property('highest_bidder');
          response.body.data[0].should.have.property('end_date');
          done();
        });
    });

    it('Should be unable to find a non-existant auction', (done) => {
      chai.request(server)
        .get('/api/v1/auctions/10')
        .end((error, response) => {
          response.should.have.status(404);
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('fail');
          response.body.should.have.property('message').eq('That auction could not be found');
          done();
        });
    });
  });

  /**
   * Test GET for auctions here since I want to test before the auction ends
   */
  describe('GET /auctions/search/:keyword/:category_id', () => {
    it('Should get a list of auctions given a keyword and category', (done) => {
      chai.request(server)
        .get('/api/v1/auctions/search/bid/1')
        .end((error, response) => {
          response.should.have.status(200);
          response.body.should.be.a('object');
          response.body.data.forEach((object) => {
            object.should.have.property('auction_id')
            object.should.have.property('title')
          })
          done()
        });
    });

    it('Should get a list of auctions given a keyword', (done) => {
      chai.request(server)
        .get('/api/v1/auctions/search/bid/0')
        .end((error, response) => {
          response.should.have.status(200);
          response.body.should.be.a('object');
          response.body.data.forEach((object) => {
            object.should.have.property('auction_id')
            object.should.have.property('title')
          })
          done()
        })
    })

    it('Should fail to get a list of auctions', (done) => {
      chai.request(server)
        .get('/api/v1/auctions/search/banana/0')
        .end((error, response) => {
          response.should.have.status(404);
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('fail')
          response.body.should.have.property('message').eq('No auctions found for that keyword');
          done();
        });
    });
  });

  /**
   * Placing bids
   **/
  describe('PATCH /api/v1/auctions/:auction_id', () => {
    const auction_id = 1
    it('Should create a second user', (done) => {
      const user = {
        'username': 'mariomario',
        'password': '12345678',
        'email': 'mario@jank.com'
      }
      chai.request(server)
        .post('/api/v1/users')
        .send(user)
        .end((error, response) => {
          response.should.be.status(200);
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('success')
          response.body.should.have.property('message').eq(`Created username ${user.username}`);
          done();
        });
    });

    it('Should create a third user', (done) => {
      const user2 = {
        'username': 'luigiluigi',
        'password': '12345678',
        'email': 'luigi@jank.com'
      }
      chai.request(server)
        .post('/api/v1/users')
        .send(user2)
        .end((error, response) => {
          response.should.be.status(200);
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('success')
          response.body.should.have.property('message').eq(`Created username ${user2.username}`);
          done();
        })
    })

    it('Should log in the second user', (done) => {
      const login = {
        'email': 'mario@jank.com',
        'password': '12345678'
      }
      chai.request(server)
        .post('/login')
        .send(login)
        .end((error, response) => {
          tokenUserTwo = response.body.token
          response.should.be.status(200);
          done();
        })
    })

    it('Should log in the third user', (done) => {
      const login2 = {
        'email': 'luigi@jank.com',
        'password': '12345678'
      }
      chai.request(server)
        .post('/login')
        .send(login2)
        .end((error, response) => {
          tokenUserThree = response.body.token
          response.should.be.status(200);
          done();
        });
    })


    it('Should place a bid and become the highest bidder', (done) => {
      const bid = {
        "bid": 5.0015672,
        "user_id": 2
      }
      chai.request(server)
        .patch('/api/v1/auctions/' + auction_id)
        .set({ Authorization: `Bearer ${tokenUserTwo}` })
        .send(bid)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('success')
          response.body.should.have.property('message').eq("You're the highest bidder!");
          response.should.have.status(200);
          done()
        });
    });

    it('Should place a bid successfully w/out highest bidder message', (done) => {
      const bid = {
        "bid": 50,
        "user_id": 2
      }
      chai.request(server)
        .patch('/api/v1/auctions/' + auction_id)
        .set({ Authorization: `Bearer ${tokenUserTwo}` })
        .send(bid)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('success')
          response.body.should.have.property('message').eq("You're the highest bidder!");
          response.should.have.status(200);
          done()
        });
    });

    it('Should not allow the bid and give a message saying a higher bid is necessary', (done) => {
      const bid = {
        "bid": 20,
        "user_id": 2
      }
      chai.request(server)
        .patch('/api/v1/auctions/' + auction_id)
        .set({ Authorization: `Bearer ${tokenUserTwo}` })
        .send(bid)
        .end((error, response) => {
          response.should.have.status(400);
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('fail')
          response.body.should.have.property('message').eq('Please enter a higher bid')
          done()
        });
    });

    it('Should not allow a bid from the auction creator', (done) => {
      const bid = {
        "bid": 100,
        "user_id": 1
      }
      chai.request(server)
        .patch('/api/v1/auctions/' + auction_id)
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(bid)
        .end((error, response) => {
          response.should.have.status(400);
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('fail');
          response.body.should.have.property('message').eq("You can't bid on your own auctions")
          done()
        });
    });

    it('Should tell the user that there is still a higher bid', (done) => {
      const bid = {
        "bid": 30,
        "user_id": 3
      }
      chai.request(server)
        .patch('/api/v1/auctions/' + auction_id)
        .set({ Authorization: `Bearer ${tokenUserThree}` })
        .send(bid)
        .end((error, response) => {
          response.should.have.status(200);
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Another user still has a higher bid');
          response.body.should.have.property('status').eq('success');
          done()
        });
    });

    it('Should not allow bids when not logged in', (done) => {
      const bid = {
        "bid": 3000,
        "user_id": 3
      }
      chai.request(server)
        .patch('/api/v1/auctions/' + auction_id)
        .send(bid)
        .end((error, response) => {
          response.text.should.be.eq('Unauthorized')
          done()
        });
    });

    it('Should tell the user they are the highest bidder', (done) => {
      const bid = {
        "bid": 100,
        "user_id": 3
      }
      chai.request(server)
        .patch('/api/v1/auctions/' + auction_id)
        .set({ Authorization: `Bearer ${tokenUserThree}` })
        .send(bid)
        .end((error, response) => {
          response.should.have.status(200);
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('success');
          response.body.should.have.property('message').eq("You're the highest bidder!");
          done()
        });
    });



    // Test Leaving feedback before auction ends...
    //forgive the placement
    it("Should be unable to leave feedback when the auction is not over", (done) => {
      const feedback = {
        "user_id": 1,
        "feedback_poster_id": 3,
        "auction_id": 1,
        "feedback_score": -1,
        "feedback": "What a sucker. Where do you think my castle funds come from?!?",
        "role": "seller"
      }
      chai.request(server)
        .post('/api/v1/feedback')
        .set({ Authorization: `Bearer ${tokenUserThree}` })
        .send(feedback)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('fail')
          response.body.should.have.property('message').eq('You are not allowed to leave feedback on this auction');
          response.should.have.status(400)
          done();
        });
    });


    it('Should fail to place a bid due to the auction ending', (done) => {
      const bid = {
        "bid": 100,
        "user_id": 3
      };
      setTimeout(() => {
        chai.request(server)
          .patch('/api/v1/auctions/' + auction_id)
          .set({ Authorization: `Bearer ${tokenUserThree}` })
          .send(bid)
          .end((error, response) => {
            response.should.have.status(400)
            response.body.should.be.a('object');
            response.body.should.have.property('status').eq('fail');
            response.body.should.have.property('message').eq("That auction does not exist or has ended")
            done()
          })
      }, 1000 * 61)
    }).timeout(1000 * 100);
  });

  describe('GET /api/v1/auctions/bids/1', () => {
    it('Should get the bid history of the auction', (done) => {
      chai.request(server)
        .get('/api/v1/auctions/bids/1')
        .end((error, response) => {
          response.should.have.status(200)
          response.body.should.be.a('object')
          response.body.data.forEach((object) => {
            object.should.have.property('price')
            object.should.have.property('bid_time')
          })
          done();
        })
    })
  })

  describe('POST /api/v1/feedback', () => {
    it("Should properly leave feedback on the auction as the buyer", (done) => {
      const feedback = {
        "user_id": 1,
        "feedback_poster_id": 3,
        "auction_id": 1,
        "feedback_score": -1,
        "feedback": "This loser never shipped the item and stole my money",
        "role": "buyer"
      }
      chai.request(server)
        .post('/api/v1/feedback')
        .set({ Authorization: `Bearer ${tokenUserThree}` })
        .send(feedback)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Thank you for leaving feedback');
          response.body.should.have.property('status').eq('success')
          response.should.have.status(200);
          done();
        });
    });

    it("Should NOT leave feedback because feedback already left", (done) => {
      const feedback = {
        "user_id": 1,
        "feedback_poster_id": 3,
        "auction_id": 1,
        "feedback_score": -1,
        "feedback": "This loser never shipped the item and stole my money",
        "role": "buyer"
      }
      chai.request(server)
        .post('/api/v1/feedback')
        .set({ Authorization: `Bearer ${tokenUserThree}` })
        .send(feedback)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('You have already left feedback for this auction');
          response.body.should.have.property('status').eq('fail');
          response.should.have.status(400);
          done();
        });
    });

    it("Should NOT leave feedback because the user is not the actual buyer", (done) => {
      const feedback = {
        "user_id": 1,
        "feedback_poster_id": 2,
        "auction_id": 1,
        "feedback_score": -1,
        "feedback": "This loser never shipped the item and stole my money",
        "role": "buyer"
      }
      chai.request(server)
        .post('/api/v1/feedback')
        .set({ Authorization: `Bearer ${tokenUserTwo}` })
        .send(feedback)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('You are not allowed to leave feedback on this auction');
          response.body.should.have.property('status').eq('fail');
          response.should.have.status(400);
          done();
        });
    });

    it("Should NOT leave feedback because unauthorized", (done) => {
      const feedback = {
        "user_id": 1,
        "feedback_poster_id": 2,
        "auction_id": 1,
        "feedback_score": -1,
        "feedback": "This loser never shipped the item and stole my money",
        "role": "buyer"
      }
      chai.request(server)
        .post('/api/v1/feedback')
        .send(feedback)
        .end((error, response) => {
          response.text.should.be.eq('Unauthorized');
          done();
        });
    });

    it("Should properly leave feedback as the seller", (done) => {
      const feedback = {
        "user_id": 3,
        "feedback_poster_id": 1,
        "auction_id": 1,
        "feedback_score": -1,
        "feedback": "What a sucker. Where do you think my castle funds come from?!?",
        "role": "seller"
      }
      chai.request(server)
        .post('/api/v1/feedback')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(feedback)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Thank you for leaving feedback');
          response.body.should.have.property('status').eq('success');
          response.should.have.status(200);
          done();
        });
    });
  });

  /**
   * Get a user's feedback history
   */
  describe('GET /api/v1/feedback/:user_id', () => {
    it('Should return the feedback of the requested user', (done) => {
      chai.request(server)
        .get('/api/v1/feedback/1')
        .end((error, response) => {
          response.body.should.be.a('object')
          response.body.should.have.property('data')
          response.body.data.forEach((object) => {
            object.should.have.property('user_id')
            object.should.have.property('poster_id')
            object.should.have.property('auction_id')
            object.should.have.property('feedback_score')
            object.should.have.property('feedback')
          })
          response.should.have.status(200)
          done();
        })
    })

    it('Should fail to get feedback of a non-existant user', (done) => {
      chai.request(server)
        .get('/api/v1/feedback/10')
        .end((error, response) => {
          response.body.should.be.a('object')
          response.body.should.have.property('message').eq('Could not find that user or they have no feedback');
          response.body.should.have.property('status').eq('fail');
          response.should.have.status(404);
          done();
        });
    });
  });

  /**
   * Test getting a users bid history using the user_id.
   * Only allowed to get their own history
   */
  describe('GET /api/v1/bids/:user_id', () => {
    it('Should get the bid history of a user', (done) => {
      chai.request(server)
        .get('/api/v1/bids/' + 2)
        .set({ Authorization: `Bearer ${tokenUserTwo}` })
        .end((error, response) => {
          response.body.should.be.a('object')
          response.should.have.status(200)
          response.body.data.forEach((object) => {
            object.should.have.property('bid_id')
            object.should.have.property('auction_id')
            object.should.have.property('user_id')
            object.should.have.property('price')
            object.should.have.property('bid_time')
          })
          done();
        })
    })

    it('Should fail to get bid history due to not own account', (done) => {
      chai.request(server)
        .get('/api/v1/bids/' + 2)
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Users may only perform this action with their own account.');
          response.body.should.have.property('status').eq('fail');
          response.should.have.status(400)
          done();
        });
    });
    it('It should be denied access to the users bid history', (done) => {
      const user_id = 1;
      chai.request(server)
        .get('/api/v1/bids/' + user_id)
        .end(function (error, response) {
          response.text.should.be.eq('Unauthorized');
          done();
        });
    });
  });


  describe('PATCH /users/:user_id', () => {
    it('Should update a users username', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '12345678',
        'username': 'bowserbowser',
        'newUsername': 'bowserjrindahouse'
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(userInfo)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Your username has been updated to bowserjrindahouse');
          response.body.should.have.property('status').eq('success');
          response.should.have.status(200);
          done();
        });
    });
    it('Should not update due to wrong password', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '12348765',
        'username': 'bowserjrindahouse',
        'newUsername': 'bowsertakinitback'
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(userInfo)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Incorrect password');
          response.body.should.have.property('status').eq('fail');
          response.should.have.status(400);
          done();
        });
    })
    it('should not update due to wrong user', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '12345678',
        'username': 'bowserjrindahouse',
        'newUsername': 'mariostakinover'
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserTwo}` })
        .send(userInfo)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('status').eq('fail');
          response.body.should.have.property('message').eq('Users may only perform this action with their own account.');
          response.should.have.status(400);
          done();
        });
    })
    it('Should not update due to same username', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '12345678',
        'username': 'bowserjrindahouse',
        'newUsername': 'bowserjrindahouse'
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(userInfo)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Please enter a new username.');
          response.body.should.have.property('status').eq('fail');
          response.should.have.status(400);
          done();
        });
    })
    it('Should not update due to username length', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '12345678',
        'username': 'bowserjrindahouse',
        'newUsername': 'bow'
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(userInfo)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.errors.forEach((object) => {
            object.should.have.property('param')
          })
          done();
        });
    })
    it('Should not update because not logged in', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '12345678',
        'username': 'bowserbowser',
        'newUsername': 'bowserjrindahouse'
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .send(userInfo)
        .end((error, response) => {
          response.text.should.be.eq('Unauthorized');
          done();
        });
    });
  });

  describe('PATCH /api/v1/users/:user_id', () => {
    it('Should update a user password', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '12345678',
        'newPassword': '123456789',
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(userInfo)
        .end((error, response) => {
          response.should.have.status(200);
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Your password has been updated');
          response.body.should.have.property('status').eq('success');
          done();
        })
    })
    it('Should fail to update due to password length', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '123456789',
        'newPassword': '123',
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(userInfo)
        .end((error, response) => {
          response.body.should.be.a('object')
          response.body.errors.forEach((object) => {
            object.should.have.property('param')
            done();
          })
        })

    })
    it('Should fail to update due to wrong account', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '123456789',
        'newPassword': 'StoleYourAccount',
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserTwo}` })
        .send(userInfo)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Users may only perform this action with their own account.');
          response.body.should.have.property('status').eq('fail');
          response.should.have.status(400);
          done();
        });
    });
    it('Should fail to update due to same password', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '123456789',
        'newPassword': '123456789',
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(userInfo)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('That is your current password');
          response.body.should.have.property('status').eq('fail');
          response.should.have.status('400');
          done();
        })
    })
    it('Should fail to update due to wrong password', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '123456789123456',
        'newPassword': '123456789',
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(userInfo)
        .end((error, response) => {
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Incorrect password');
          response.body.should.have.property('status').eq('fail');
          response.should.have.status('400');
          done();
        })
    })
    it('Should update a user password', (done) => {
      const userInfo = {
        'user_id': 1,
        'password': '123456789',
        'newPassword': '1234567890',
      }
      chai.request(server)
        .patch('/api/v1/users/1')
        .send(userInfo)
        .end((error, response) => {
          response.text.should.be.eq('Unauthorized');
          done();
        })
    })
  })


  describe('DELETE /api/v1/users/user:id', () => {
    it('should create an auction to prevent account deletion later', (done) => {
      const auction = {
        "user_id": 1,
        "title": "My auction BID HERE!",
        "category_id": 1,
        "description": "A cool thing",
        "endTime": 1,
        "start_price": 1.00
      }
      chai.request(server)
        .post('/api/v1/auctions')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(auction)
        .end((error, response) => {
          response.should.have.status(200);
          done();
        });
    });

    it('Should place a bid to prevent account deletion', (done) => {
      const bid = {
        "bid": 5.0015672,
        "user_id": 3
      }
      chai.request(server)
        .patch('/api/v1/auctions/2')
        .set({ Authorization: `Bearer ${tokenUserThree}` })
        .send(bid)
        .end((error, response) => {
          response.should.have.status(200);
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq("You're the highest bidder!");
          response.body.should.have.property('status').eq('success');
          done();
        });
    })

    it("Should fail to delete because Mario can't delete Bowser's account", (done) => {
      const password = {
        'password': '123456789'
      }
      chai.request(server)
        .delete('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserTwo}` })
        .send(password)
        .end((error, response) => {
          response.should.have.status(400);
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Users may only perform this action with their own account.');
          response.body.should.have.property('status').eq('fail');
          done();
        });
    });

    it('Should fail to delete account due to incorrect password', (done) => {
      const password = {
        'password': '12345678910'
      }
      chai.request(server)
        .delete('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(password)
        .end((error, response) => {
          response.should.have.status(400);
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Incorrect password');
          response.body.should.have.property('status').eq('fail');
          done();
        });
    });

    it('Should fail to delete account because seller has a live auction', (done) => {
      const password = {
        'password': '123456789'
      }
      chai.request(server)
        .delete('/api/v1/users/1')
        .set({ Authorization: `Bearer ${tokenUserOne}` })
        .send(password)
        .end((error, response) => {
          response.should.have.status(400);
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Cannot delete account while running an auction or bidding on an item');
          response.body.should.have.property('status').eq('fail');
          done();
        });
    });

    it('Should fail to delete account because buyer has an active winning bid', (done) => {
      const password = {
        'password': '12345678'
      }
      chai.request(server)
        .delete('/api/v1/users/3')
        .set({ Authorization: `Bearer ${tokenUserThree}` })
        .send(password)
        .end((error, response) => {
          response.should.have.status(400);
          response.body.should.be.a('object');
          response.body.should.have.property('message').eq('Cannot delete account while running an auction or bidding on an item');
          response.body.should.have.property('status').eq('fail');
          done();
        });
    });

    //   it('Should properly delete the account after the auction ends', (done) => {
    //     const password = {
    //       'password': '123456789'
    //     }
    //     setTimeout(() => {
    //       chai.request(server)
    //         .delete('/api/v1/users/1')
    //         .set({ Authorization: `Bearer ${tokenUserOne}` })
    //         .send(password)
    //         .end((error, response) => {
    //           response.text.should.be.eq(`User deleted with ID: 1`);
    //           response.should.be.status(200)
    //           done();
    //         })
    //     }, 1000 * 61)
    //   }).timeout(1000 * 100)

    //   it('Should NOT delete the account because not logged in', (done) => {
    //     const password = {
    //       'password': '12345678'
    //     }
    //     chai.request(server)
    //       .delete('/api/v1/users/3')
    //       .send(password)
    //       .end((error, response) => {
    //         response.text.should.be.eq(`Unauthorized`)
    //         done();
    //       });
    //   });

    //   it('Should properly delete the account of the bidder after auction ends', (done) => {
    //     const password = {
    //       'password': '12345678'
    //     }
    //     chai.request(server)
    //       .delete('/api/v1/users/3')
    //       .set({ Authorization: `Bearer ${tokenUserThree}` })
    //       .send(password)
    //       .end((error, response) => {
    //         response.text.should.be.eq(`User deleted with ID: 3`)
    //         response.should.be.status(200)
    //         done();
    //       });
    //   });
  });
});


