# Auction API
This is the potential backend to an auction site I may make to practice coding on my own.  It has no options for handling anything in terms of payments. It is just create account, create auctions, place bids, leave feedback, and delete/update accounts.  If I feel motivated enough or have time, at a later point I may implement a watch list for users and make a simulated payment system.  I also think it would be interesting to implement an auto email system on account creation/confirm account via e-mail, as well as two factor authentication.

Becuase this is a small self-project, I decided to just upload auction images in a local images directory, although I had thought about using a place like Cloudinary for free cloud storage

SQL used for my tables is found in the db_table.txt file

## Dependencies

- "bcrypt": "^5.0.1",
- "body-parser": "^1.20.0",
- "cors": "^2.8.5",
- "date-fns": "^2.29.3",
- "dotenv": "^16.0.2",
- "express": "^4.18.1",
- "express-validator": "^6.14.2",
- "jsonwebtoken": "^8.5.1",
- "lodash": "^4.17.21",
- "morgan": "^1.10.0",
- "multer": "^1.4.5-lts.1",
- "passport": "^0.6.0",
- "passport-jwt": "^4.0.0",
- "passport-local": "^1.0.0",
- "pg": "^8.8.0"

## Dev-Dependencies
- "chai": "^4.3.6",
- "chai-http": "^4.3.0",
- "mocha": "^10.0.0"
Also used VS Code with various extensions.