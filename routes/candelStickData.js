import express from "express";
import db from "../config/dbConnection.js";


const router = express.Router();

router.get("/api/candelstick",async(req,res)=>{
    const fetchTrades = await db.query("select * from ohlc;")
    res.json(fetchTrades[0])
});


const convertToOhlc = async() => {
     

   const fetchTrades = await db.query("select id from trades;");
   const fetchTradesArr = fetchTrades[0];


   const price = [];
   let volume = 0;
   let openTime;
   let openPrice;
   let highPrice;
   let lowPrice;
   let closePrice;
   let closeTime;
   const arr = [];

   for(let i = 0; i < 150; i++){
        const fetchTradeTime = await db.query("select time from trades ;",);
        const fetchTradeTimeArr = fetchTradeTime[0];
        const fetchTrades = await db.query("select price,size,time from trades where time between ? and ?",[fetchTradeTimeArr[i].time,fetchTradeTimeArr[i].time+60000]);
        const fetchTradesArr = fetchTrades[0];

        if(fetchTradesArr.length !== 0){
            openTime = fetchTradesArr[0].time
            openPrice = fetchTradesArr[0].price;
            price.push(fetchTradesArr[i].price)
     
            highPrice = Math.max(...price)
            lowPrice = Math.min(...price)
            closePrice = fetchTradesArr[fetchTradesArr.length - 1].price
     
            volume += fetchTradesArr[i].size
     
            closeTime = fetchTradeTimeArr[0].time + 60000;
       
            const ohlc = [openTime,openPrice,highPrice,lowPrice,closePrice,volume,closeTime];
            arr.push(ohlc)
        }else{
            break;
        }
    }
   return arr;
}

//almost 10 minutes of data is there



export default router;

