const express = require('express')
const app = express()

const fetch = require('node-fetch')

if (process.env.NODE_ENV !== "production") {
  console.log('setting custom env variables');
  require('dotenv').config();
}
const db = require('./db')

const OER_APP_ID=process.env.OER_APP_ID
const CACHE_DURATION=process.env.CACHE_DURATION//seconds


app.get('/', (req, res) => {
  res.send('Hello World!')
})

/*
  base_cur: INR/USD/etc
*/
app.get('/latest', async (req, res,next) => {
  let base_cur = 'USD'
  
  try{

    var minCacheTimestamp=getCurTimeInSeconds()-CACHE_DURATION
    let query= 'SELECT timestamp::int,lastfetched::int, base_cur,rates FROM latest WHERE base_cur=$1 AND lastfetched>$2 ORDER BY timestamp DESC LIMIT 1'

    const { rows } = await db.query(query, [base_cur,minCacheTimestamp])

    if(rows.length==0){
      let rawRes= await fetch(`https://openexchangerates.org/api/latest.json?app_id=${OER_APP_ID}&base=${base_cur}`)
      let rawJson = await rawRes.json()
      if (!rawRes.ok) {
        throw Error(rawJson.message);
      }

      let ratesStr=JSON.stringify(rawJson.rates)

      let deleteOldQuery = "DELETE FROM latest WHERE base_cur=$1"
      await db.query(deleteOldQuery, [base_cur ])

      let insertQuery="INSERT INTO latest(timestamp,lastfetched, base_cur,rates) VALUES($1, $2, $3, $4)"
      await db.query(insertQuery, [rawJson.timestamp, getCurTimeInSeconds() ,base_cur,ratesStr ])

      res.send({
        cached:false,
        timestamp: rawJson.timestamp,
        lastfetched: getCurTimeInSeconds(),
        base_cur: base_cur,
        rates:rawJson.rates
      })
    }else{
      let rates = JSON.parse(rows[0].rates)
      res.send({
        cached:true,
        timestamp: rows[0].timestamp,
        lastfetched: rows[0].lastfetched,
        base_cur: base_cur,
        rates:rates
      })
    }
  }catch(err){
    console.log(err);
    return next(err)
  }
})

/*
  date: //yyyy-mm-dd
  base_cur: INR/USD/etc
*/
app.get('/historical', async (req, res,next) => {
  let base_cur = 'USD'
  let date=req.query.date 
  
  try{

    let query= 'SELECT id,rates FROM historical WHERE date=$1 AND base_cur=$2 LIMIT 1'

    const { rows } = await db.query(query, [date,base_cur])

    if(rows.length==0){
      let rawRes= await fetch(`https://openexchangerates.org/api/historical/${date}.json?app_id=${OER_APP_ID}&base=${base_cur}`)
      let rawJson = await rawRes.json()
      if (!rawRes.ok) {
        throw Error(rawJson.message);
      }
      
      let ratesStr=JSON.stringify(rawJson.rates)

      let deleteOldQuery = "DELETE FROM historical WHERE date=$1 AND base_cur=$2"
      await db.query(deleteOldQuery, [date,base_cur])

      let insertQuery="INSERT INTO historical(date, base_cur,rates) VALUES($1, $2, $3)"
      await db.query(insertQuery, [date, base_cur,ratesStr ])

      res.send({
        cached:false,
        date: date,
        base_cur: base_cur,
        rates:rawJson.rates
      })
    }else{
      let rates = JSON.parse(rows[0].rates)
      res.send({
        cached:true,
        date: date,
        base_cur: base_cur,
        rates:rates
      })
    }
  }catch(err){
    console.log(err);
    return next(err)
  }
})


require('./src/error_handler')(app);


app.listen(process.env.PORT || 3000, () => {
  console.log(`Example app listening at port ${process.env.PORT || 3000}`)
})

function getCurTimeInSeconds(){
  return Math.round(Date.now()/1000)
}