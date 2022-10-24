const db = require('../db-info');

/**
 * @method GET
 */
const getCategories = async (req, res) => {
  try {
    const results = await db.pool.query('SELECT * FROM Categories')
    if (!results.rows[0]) {
      return res.status(404).json({ status: 'fail', message: 'categoreis not found' })
    }
    return res.status(200).json(results.rows)

  }
  catch (err) {
    return res.status(400).json({ status: 'fail', message: err })
  }
}

/**
 * @method POST
 * @param {string} 
 * Used to add a category to the DB.  Just for bckend stuff
 */
const createCategory = async (req, res) => {
  const category = req.body.category;
  try {
    const checkCategory = await db.pool.query('SELECT category FROM Categories WHERE category=$1', [category])
    if (checkCategory.rows[0]) {
      return res.status(400).json({ status: 'fail', message: 'That category is already in the DB' })
    }
    const results = await db.pool.query('INSERT INTO Categories (category) VALUES ($1)', [category])
    return res.status(200).json({ status: 'success', message: `Inserted ${category}` })
  }
  catch (err) {
    res.status(400).json({ status: 'fail', message: err })
  }
}

module.exports = {
  getCategories,
  createCategory
}