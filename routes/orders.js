import express from "express";
import db from "../config/dbConnection.js";

const router = express.Router();

router.use(express.json())
router.use(express.urlencoded({extended : false})); 


router.post("/api/orders",async(req,res)=>{
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
const limitOrders = {
   // id : req.body.id || req.query.id,
    symbol : req.body.symbol || req.query.symbol,
    direction : req.body.direction || req.query.direction,
    type : req.body.type || req.query.type,
    price : req.body.price || req.query.price,
    size : req.body.size || req.query.size,
    time : req.body.time || req.query.time
}
const {symbol,direction,type,price,size,time} = limitOrders;

//validating every field in the request

if(symbol !== "BTC/USD"){
    res.status(400).json({message: "Invalid Symbol"})
}else if(direction !== 'buy' && direction !== 'sell' ){
    res.status(400).json({message : "Direction can only be buy or sell, it must be in lowercase"})
}else if(type !== "limit" && type !== "market"){
    res.status(400).json({message : "Order type can only be limit or market, it must be in lowercase"})
}else if(direction === "buy" && type === "limit"){

    //inserting limit order buy into the database

    const queryString = "insert into bidLimitOrders(symbol,type,price,size,time) values(?,?,?,?,?)"
    const insertTrade = await db.query(queryString,[symbol,type,price,size,time])
    const insertTradeArr = insertTrade[0]
    if(insertTradeArr.affectedRows !== 0){
        res.sendStatus(201)
    }
}else if(direction === "sell" && type === "limit"){

    //inserting limit order sell into the database

    const queryString = "insert into askLimitOrders(symbol,type,price,size,time) values(?,?,?,?,?)"
    const insertTrade = await db.query(queryString,[symbol,type,price,size,time])
    const insertTradeArr = insertTrade[0]
    if(insertTradeArr.affectedRows !== 0){
        res.sendStatus(201)
    }
}else if(type === "market"){
    
    //inserting market order buy into the database


    const queryString = "insert into marketOrders(symbol,direction,type,size,time) values(?,?,?,?,?)"
    const insertTradeMarket = await db.query(queryString,[symbol,direction,type,size,time])
    const insertTradeMarketArr = insertTradeMarket[0]


    //processing market orders

    if(direction === 'buy'){
      
      const marketBuy = await db.query('SELECT * FROM marketOrders WHERE direction = ? ORDER BY time ASC;',"buy")
      const updateAsks = await db.query('select size,price from askLimitOrders ORDER BY price ASC,time ASC;')
      const marketBuyArr = marketBuy[0];
      const updateAsksArr = updateAsks[0];

      let limitSize = updateAsksArr[0].size;
      let index = 1;
      let askPriceSum = updateAsksArr[0].price;
      const time = Date.now()
    //  const avgPrice = askPriceSum / index
            
        for(let i = 1; i < updateAsksArr.length  ; i++){
            
            if(marketBuyArr[0].size > limitSize){                    
                limitSize += updateAsksArr[i].size
                index += 1
                askPriceSum += updateAsksArr[i].price

            
            }else{
                
                break;
                
            }
        }


            const sub = limitSize - marketBuyArr[0].size;
            const avgPrice = askPriceSum / index

            if(sub !== 0){

                if(marketBuyArr[0].size > limitSize){
                    const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"

                    const deleteRows = await db.query('DELETE FROM askLimitOrders ORDER BY price ASC,time ASC LIMIT ?;',index);
                    const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,limitSize,time]);
 
                }else{

                    const rows = index - 1
                    console.log(rows);
                    const deleteRows = await db.query('DELETE FROM askLimitOrders ORDER BY price ASC,time ASC LIMIT ?;',rows);
                    
                    if(deleteRows[0].affectedRows !== 0){
                        const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"
                        
                        const updateRow = await db.query('UPDATE askLimitOrders SET size = ? ORDER BY price ASC,time ASC LIMIT ?',[sub,1]);
                        const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time]);
                        
                        console.log(deleteRows[0])
                        
                    }
                    
                  console.log(index);
                }
                
            }else if(sub === 0){
                const deleteRows = await db.query('DELETE FROM askLimitOrders ORDER BY price ASC,time ASC LIMIT ?;',index);
                

                const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"
                const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time])
            console.log(deleteRows[0]);

            }
            // if (limitSize > marketBuyArr[0].size){
            //     const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"

            //     const updateRow = await db.query('UPDATE askLimitOrders SET size = ? ORDER BY price ASC,time ASC LIMIT ?',[sub,1]);
            //     const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time]);
                
            //     console.log(updateRow[0]);
            
            // }else if(sub === 0){
                
            //     const deleteRows = await db.query('DELETE FROM askLimitOrders ORDER BY price ASC,time ASC LIMIT ?;',index);
                

            //     const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"
            //     const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time])
            

            // }else if(sub !== 0){
            //     const rows = index - 1
            //     console.log(rows);
            //     const deleteRows = await db.query('DELETE FROM askLimitOrders ORDER BY price ASC,time ASC LIMIT ?;',rows);
                
            //     if(deleteRows[0].affectedRows !== 0){
            //         const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"
                    
            //         const updateRow = await db.query('UPDATE askLimitOrders SET size = ? ORDER BY price ASC,time ASC LIMIT ?',[sub,1]);
            //         const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time]);
                    
            //         console.log(deleteRows[0])
                    
            //     }
                
            //   console.log(index);
                 
            // }
           
        
    }

    //sending response to the client 
     
    if(insertTradeMarketArr.affectedRows !== 0){
        res.sendStatus(201)
    }
}


});

// const size = [10,5,10,100]
// const marketSize = [20,1,3,100]
// let limitSize = size[0];
// let index = 0
// let row;
// for(let i = 1; i < 3 ; i++){
  
//     if(marketSize[0] > limitSize){
//       limitSize += size[i]
//       index += i
      
//     }else{
//         console.log('breaked');  
//         break;
        
//     }
   
    
// }

// const sub = limitSize - marketSize[0]
// if(sub === 0){
//     console.log(`delelte db rows ${index}`);
// }else if(sub !== 0){
//      row = index - 1
//      console.log(`delete rows ${row} & update row ${0} with value ${sub}`)
// }


export default router;






