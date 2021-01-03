const { Pool } = require('pg')
const pool = new Pool()
module.exports = {
  query: (text, params) => pool.query(text, params),


  queryCallback: (text, params, callback) => {
    const start = Date.now()
    return pool.query(text, params, (err, res) => {
      const duration = Date.now() - start
      if(err){
        console.log('executed query', { text, duration,err_message: err.message })
      }else{
        console.log('executed query', { text, duration, rows: res.rows })
      }
      
      callback(err, res)
    })
  },
  getClient: (callback) => {
    pool.connect((err, client, done) => {
      callback(err, client, done)
    })
  }
}