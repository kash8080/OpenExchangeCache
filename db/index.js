const { Pool } = require('pg')
var pgConfig = {
  connectionString: process.env.DATABASE_URL
} 
if (process.env.NODE_ENV === "production") {
  pgConfig.ssl= {
    rejectUnauthorized: false
  }
}
const pool = new Pool(pgConfig)

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