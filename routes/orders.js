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
        res.status(201).json({message : "Limit Order Posted Successfully",code : 201})
    }
}else if(direction === "sell" && type === "limit"){

    //inserting limit order sell into the database

    const queryString = "insert into askLimitOrders(symbol,type,price,size,time) values(?,?,?,?,?)"
    const insertTrade = await db.query(queryString,[symbol,type,price,size,time])
    const insertTradeArr = insertTrade[0]
    if(insertTradeArr.affectedRows !== 0){
        res.status(201).json({message : "Limit Order Posted Successfully",code : 201})
    }
}else if(type === "market"){
    
    //inserting market order into the database


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
                    if(deleteRows[0].affectedRows !== 0){
                        
                        const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,limitSize,time]);
                        
                        //Deleting market order from the database after the trade execution 
                        
                        const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                        res.status(200).json({message : "Market Order Partially Filled Successfully", code : 200})

                    }  
 
                }else if(limitSize > marketBuyArr[0].size){
                    if(index === 1){
                        const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"
                    
                        const updateRow = await db.query('UPDATE askLimitOrders SET size = ? ORDER BY price ASC,time ASC LIMIT ?',[sub,1]);
                        
                        
                        if(updateRow[0].changedRows !== 0){
                            const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,limitSize,time]);
                          
                            //Deleting market order from the database after the trade execution 
                            
                            const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                            res.status(200).json({message : "Market Order Filled Successfully", code : 200})
                            
                        }
                    }else{
                        const rows = index - 1
                        
                        const deleteRows = await db.query('DELETE FROM askLimitOrders ORDER BY price ASC,time ASC LIMIT ?;',rows);
                        
                        if(deleteRows[0].affectedRows !== 0){
                            const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"
                            
                            const updateRow = await db.query('UPDATE askLimitOrders SET size = ? ORDER BY price ASC,time ASC LIMIT ?',[sub,1]);
                            const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time]);
                            
                            

                            if(updateRow[0].changedRows !== 0){
                               //Deleting market order from the database after the trade execution 

                                const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                                res.status(200).json({message : "Market Order Filled Successfully", code : 200})

                            }
                            
                        }
                        
                        
                    }
                    
                }

                 
                
                
            }else if(sub === 0){
                const deleteRows = await db.query('DELETE FROM askLimitOrders ORDER BY price ASC,time ASC LIMIT ?;',index);
                
                const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"
                
                
                if(deleteRows[0].affectedRows !== 0){
                    const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time])
                    
                    //Deleting market order from the database after the trade execution 
                    
                    const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                    res.status(200).json({message : "Market Order Filled Successfully", code : 200})

                }
            }
           
    }else if(direction === "sell"){
      const marketSell = await db.query('SELECT * FROM marketOrders WHERE direction = ? ORDER BY time ASC;',"sell")
      const updateBids = await db.query('select size,price from bidLimitOrders ORDER BY price DESC,time ASC;')
      const marketSellArr = marketSell[0];
      const updateBidsArr = updateBids[0];

      let limitSize = updateBidsArr[0].size;
      let index = 1;
      let bidPriceSum = updateBidsArr[0].price;
      const time = Date.now()


      for(let i = 1; i < updateBidsArr.length  ; i++){
            
        if(marketSellArr[0].size > limitSize){                    
            limitSize += updateBidsArr[i].size
            index += 1
            bidPriceSum += updateBidsArr[i].price

        
        }else{
            
            break;
            
        }
    }

    const sub = limitSize - marketSellArr[0].size;
    const avgPrice = bidPriceSum / index

    if(sub !== 0){

        if(marketSellArr[0].size > limitSize){
            const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"

            const deleteRows = await db.query('DELETE FROM bidLimitOrders ORDER BY price DESC,time ASC LIMIT ?;',index);
            if(deleteRows[0].affectedRows !== 0){
                
                const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,limitSize,time]);
                
                //Deleting market order from the database after the trade execution 
                
                const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                res.status(200).json({message : "Market Order Partially Filled Successfully", code : 200})

            }  

        }else if(limitSize > marketSellArr[0].size){
            if(index === 1){
                const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"
            
                const updateRow = await db.query('UPDATE bidLimitOrders SET size = ? ORDER BY price DESC,time ASC LIMIT ?',[sub,1]);
                
                
                if(updateRow[0].changedRows !== 0){
                    const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,limitSize,time]);
                  
                    //Deleting market order from the database after the trade execution 
                    
                    const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                    res.status(200).json({message : "Market Order Filled Successfully", code : 200})
                    
                }
            }else{
                const rows = index - 1
                
                const deleteRows = await db.query('DELETE FROM bidLimitOrders ORDER BY price DESC,time ASC LIMIT ?;',rows);
                
                if(deleteRows[0].affectedRows !== 0){
                    const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"
                    
                    const updateRow = await db.query('UPDATE bidLimitOrders SET size = ? ORDER BY price DESC,time ASC LIMIT ?',[sub,1]);
                    const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time]);
                    
                    

                    if(updateRow[0].changedRows !== 0){
                       //Deleting market order from the database after the trade execution 

                        const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                        res.status(200).json({message : "Market Order Filled Successfully", code : 200})

                    }
                    
                }
                
                
            }
            
        }

         
        
        
    }else if(sub === 0){
        const deleteRows = await db.query('DELETE FROM bidLimitOrders ORDER BY price DESC,time ASC LIMIT ?;',index);
        
        const queryStringTrades = "insert into trades(symbol,direction,price,size,time) values(?,?,?,?,?);"
        
        
        if(deleteRows[0].affectedRows !== 0){
            const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time])
            
            //Deleting market order from the database after the trade execution 
            
            const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
            res.status(200).json({message : "Market Order Filled Successfully", code : 200})

        }
    }

    
     
    
        
    }


}


});


export default router;





