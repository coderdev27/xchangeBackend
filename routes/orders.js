import express from "express";
import db from "../config/dbConnection.js";

const router = express.Router();

router.use(express.json())
router.use(express.urlencoded({extended : false})); 


router.post("/api/orders",async(req,res)=>{
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const apiKey = req.header("x-api-key");
    
    //Giving default value to the postOnly option

    let postOnly = false;

    if(req.body.postOnly || req.query.postOnly === true){
        postOnly = true
    }

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

//fees value

const feesTaker = 0.1;
const feesMaker = 0.1;


const fetchUserData = await db.query('select userId from userDetails where apiKey = ?;',[apiKey]);
const fetchUserIdArr = [fetchUserData[0][0].userId];
const userId = fetchUserIdArr[0];

//marketOrders function to insert data into database and process orders

const marketOrders = async() => {

 
    //inserting market order into the database


    const queryString = "insert into marketOrders(symbol,direction,type,size,time) values(?,?,?,?,?)"
    const insertTradeMarket = await db.query(queryString,[symbol,direction,type,size,time])
    const insertTradeMarketArr = insertTradeMarket[0]


    //processing market orders

    if(direction === 'buy'){
      
      const marketBuy = await db.query('SELECT * FROM marketOrders WHERE direction = ? ORDER BY time ASC;',"buy")
      const updateAsks = await db.query('select size,price,userId from askLimitOrders ORDER BY price ASC,time ASC;')
      const marketBuyArr = marketBuy[0];
      const updateAsksArr = updateAsks[0];

        //fetch wallet balance

       const walletBalance = await db.query("select usd,bitcoin from ledger where userId = ?",[userId]);
       const walletBalanceArr = walletBalance[0];


      let limitSize = updateAsksArr[0].size;
      let index = 1;
      let costBasis = updateAsksArr[0].price * updateAsksArr[0].size;
      const time = Date.now()
  
            
        for(let i = 1; i < updateAsksArr.length  ; i++){
            
            if(marketBuyArr[0].size > limitSize){                    
                limitSize += updateAsksArr[i].size
                index += 1
                costBasis += updateAsksArr[i].price * updateAsksArr[i].size

            
            }else{
                
                break;
                
            }
        }


            const sub = limitSize - marketBuyArr[0].size;
            
            if(sub !== 0){
                
                if(marketBuyArr[0].size > limitSize){
                    const avgPrice = costBasis / limitSize;
                    const balanceUpdate = walletBalanceArr[0].usd - (avgPrice * limitSize) - (avgPrice * limitSize  / 100 * feesTaker);
                    const balanceUpdateBitcoin = walletBalanceArr[0].bitcoin + limitSize

                    if(walletBalanceArr[0].usd >= avgPrice){
                        const queryStringTrades = "insert into trades(symbol,direction,price,size,time,userId) values(?,?,?,?,?,?);"

                        for(let y = 0; y < index; y++){
                           
                            const fetchWallet = await db.query("select usd from ledger where userId = ?",[updateAsksArr[y].userId]);
                            const walletUpdateVal = fetchWallet[0][0].usd + (updateAsksArr[y].price * updateAsksArr[y].size);
                            const updateLimitWallet = await db.query("update ledger set usd = ? where userId = ?;",[walletUpdateVal,updateAsksArr[y].userId]);
                            
                        }

                        const deleteRows = await db.query('DELETE FROM askLimitOrders ORDER BY price ASC,time ASC LIMIT ?;',index);
                        if(deleteRows[0].affectedRows !== 0){
                           
                            const walletUpdate = await db.query("update ledger set usd = ?, bitcoin = ? where userId = ?;",[balanceUpdate,balanceUpdateBitcoin,userId]);
                            
                            const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,limitSize,time,userId]);
                        
                            //Deleting market order from the database after the trade execution 
                        
                            const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                            res.status(200).json({message : "Market Order Partially Filled Successfully", code : 200})

                        }  
                    }else{
                        const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                        res.status(403).json({message : "Not enough balance to fulfil this order.",code : 403});
                    }
 
                }else if(limitSize > marketBuyArr[0].size){
                    if(index === 1){

                        if( walletBalanceArr[0].usd >= (updateAsksArr[0].price * updateAsksArr[0].size) ){

                            const avgPrice = updateAsksArr[0].price
                            const queryStringTrades = "insert into trades(symbol,direction,price,size,time,userId) values(?,?,?,?,?,?);"
                            
                            const updateRow = await db.query('UPDATE askLimitOrders SET size = ? ORDER BY price ASC,time ASC LIMIT ?',[sub,1]);
                            
                            const fetchWalletUsd = await db.query("select usd from ledger where userId = ?;",[updateAsksArr[0].userId])
                            const updatewalletLimitVal = fetchWalletUsd[0][0].usd + (updateAsksArr[0].price * size);
                            const updateWalletLimit = await db.query("update ledger set usd = ? where userId = ?;",[updatewalletLimitVal,updateAsksArr[0].userId]);
                            const balanceUpdate = walletBalanceArr[0].usd - (avgPrice * size) - (avgPrice * size / 100 * feesTaker);
                            const btcBalanceUpdate = walletBalanceArr[0].bitcoin + size
                            const updateWallet = await db.query("update ledger set bitcoin = ?,usd = ? where userId = ?;",[btcBalanceUpdate,balanceUpdate,userId])
                            
                            if(updateRow[0].changedRows !== 0){
                                const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,marketBuyArr[0].size,time,userId]);
                                
                                //Deleting market order from the database after the trade execution 
                                
                                const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                                res.status(200).json({message : "Market Order Filled Successfully", code : 200})
                                
                            }
                            
                       }else{
                        const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                        res.status(403).json({message : "Not enough balance to fulfil this order.",code : 403});                           
                       }

                    }else{
      
                        const rows = index - 1;

                        //average price calculation

                        const askSub = costBasis - updateAsksArr[rows].price * sub; 
                        const avgPrice = askSub / marketBuyArr[0].size;

                        if( walletBalanceArr[0].usd >= (avgPrice * marketBuyArr[0].size) ){

                            for(let z = 0; z < rows; z++){
                              
                                const fetchWalletLimit = await db.query("select usd from ledger where userId = ?;",[updateAsksArr[z].userId]);
                                const updateValUsd = fetchWalletLimit[0][0].usd + updateAsksArr[z].price * updateAsksArr[z].size;
                                const walletBalUpdateLimit = await db.query("update ledger set usd = ? where userId = ?;",[updateValUsd,updateAsksArr[z].userId]);

                            }
                           
                            const fetchWalletLimit = await db.query("select usd from ledger where userId = ?;",[updateAsksArr[rows].userId]);
                            const updateUsdVal = fetchWalletLimit[0][0].usd + updateAsksArr[rows].price * sub;
                            const updateLimitWalletVal = await db.query("update ledger set usd = ? where userId = ?;",[updateUsdVal,updateAsksArr[rows].userId]);

                            if(updateLimitWalletVal[0].changedRows !== 0){
                        
                                const deleteRows = await db.query('DELETE FROM askLimitOrders ORDER BY price ASC,time ASC LIMIT ?;',rows);
                                
                                if(deleteRows[0].affectedRows !== 0){
                                 const queryStringTrades = "insert into trades(symbol,direction,price,size,time,userId) values(?,?,?,?,?,?);"
                                 
                                 const updateRow = await db.query('UPDATE askLimitOrders SET size = ? ORDER BY price ASC,time ASC LIMIT ?',[sub,1]);
                                 
                                 
                                 
                                 if(updateRow[0].changedRows !== 0){
                                     // const fetchAsks = await db.query('select size,price from askLimitOrders ORDER BY price ASC,time ASC;');
                                     // const askSub = costBasis - fetchAsks[0][0].price * fetchAsks[0][0].size 
                                     // const avgPrice =  askSub / marketBuyArr[0].size;
                                  
                                     const updateUsdValue = walletBalanceArr[0].usd - (avgPrice * marketBuyArr[0].size) - (avgPrice * marketBuyArr[0].size / 100 * feesTaker);
                                     const updateBtcValue = walletBalanceArr[0].bitcoin + size; 
                                     const walletBalUpdate = await db.query("update ledger set usd = ?,bitcoin = ? where userId = ?;",[updateUsdValue,updateBtcValue,userId]);
                                     
                                    
         
                                     const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time,userId]);
                                    //Deleting market order from the database after the trade execution 
     
                                     const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                                     res.status(200).json({message : "Market Order Filled Successfully", code : 200})
     
                                 }
                                 
                                }
                                
                            }
                        
                        
                        }else{
                            const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                            res.status(403).json({message : "Not enough balance to fulfil this order.",code : 403}); 
                        }

                    }
                    
                }

                 
                
                
            }else if(sub === 0){
                const avgPrice = costBasis / limitSize;

                if(walletBalanceArr[0].usd >= (avgPrice * size)){

                    for(let a = 0; a < index; a++){

                        const fetchLimitWallet = await db.query("select usd from ledger where userId = ?;",[updateAsksArr[a].userId]);
                        const updateUsdVal = fetchLimitWallet[0][0].usd + updateAsksArr[a].price * updateAsksArr[a].size;
                        const updateWallet = await db.query("update ledger set usd = ? where userId = ?;",[updateUsdVal,updateAsksArr[a].userId]);
                    }

                    const updateUsdVal = walletBalanceArr[0].usd - (avgPrice * size) - (avgPrice * size /100 * feesTaker);
                    const updateBtcVal = walletBalanceArr[0].bitcoin + size;
                    const updateWallet = await db.query("update ledger set bitcoin = ?, usd = ? where userId = ?;",[updateBtcVal,updateUsdVal,userId]);
                
                    const deleteRows = await db.query('DELETE FROM askLimitOrders ORDER BY price ASC,time ASC LIMIT ?;',index);
                
                    const queryStringTrades = "insert into trades(symbol,direction,price,size,time,userId) values(?,?,?,?,?,?);"
                
                
                    if(deleteRows[0].affectedRows !== 0){
                    const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time,userId])
                    
                    //Deleting market order from the database after the trade execution 
                    
                    const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                    res.status(200).json({message : "Market Order Filled Successfully", code : 200})
                    }

                }else{
                    const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                    res.status(403).json({message : "Not enough balance to fulfil this order.",code : 403}); 
                }

            }
           
    }else if(direction === "sell"){
      const marketSell = await db.query('SELECT * FROM marketOrders WHERE direction = ? ORDER BY time ASC;',"sell")
      const updateBids = await db.query('select size,price,userId from bidLimitOrders ORDER BY price DESC,time ASC;')
      const marketSellArr = marketSell[0];
      const updateBidsArr = updateBids[0];


      //fetch wallet balance

      const walletBalance = await db.query("select usd,bitcoin from ledger where userId = ?",[userId]);
      const walletBalanceArr = walletBalance[0];


      let limitSize = updateBidsArr[0].size;
      let index = 1;
      let costBasis = updateBidsArr[0].price * updateBidsArr[0].size;
      const time = Date.now()


      for(let i = 1; i < updateBidsArr.length  ; i++){
            
        if(marketSellArr[0].size > limitSize){                    
            limitSize += updateBidsArr[i].size
            index += 1
            costBasis += updateBidsArr[i].price * updateBidsArr[i].size

        
        }else{
            
            break;
            
        }
    }

    const sub = limitSize - marketSellArr[0].size;


    if(sub !== 0){
        
        if(marketSellArr[0].size > limitSize){
            
            if(walletBalanceArr[0].bitcoin >= limitSize){

                for(let y = 0; y < index; y++){

                    const fetchLimitWallet = await db.query("select bitcoin from ledger where userId = ?;",[updateBidsArr[y].userId]);
                    const updateBtcVal = fetchLimitWallet[0][0].bitcoin + updateBidsArr[y].size;
                    const updateWallet = await db.query("update ledger set bitcoin = ? where userId = ?;",[updateBtcVal,updateBidsArr[y].userId]);
                }

                const avgPrice = costBasis / limitSize;

                const updateBtcVal = walletBalanceArr[0].bitcoin - limitSize - (limitSize/100 * feesTaker);
                const updateUsdVal = walletBalanceArr[0].usd + avgPrice * limitSize;
                const updateWallet = await db.query("update ledger set bitcoin = ?, usd = ? where userId = ?;",[updateBtcVal,updateUsdVal,userId]);

                const queryStringTrades = "insert into trades(symbol,direction,price,size,time,userId) values(?,?,?,?,?,?);"

                const deleteRows = await db.query('DELETE FROM bidLimitOrders ORDER BY price DESC,time ASC LIMIT ?;',index);
                if(deleteRows[0].affectedRows !== 0){
                
                const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,limitSize,time,userId]);
                
                //Deleting market order from the database after the trade execution 
                
                const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                res.status(200).json({message : "Market Order Partially Filled Successfully", code : 200})

                }

            }else{
                const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                res.status(403).json({message : "Not enough balance to fulfil this order.",code : 403});
            }  

        }else if(limitSize > marketSellArr[0].size){
            if(index === 1){
                
                if(walletBalanceArr[0].bitcoin >= size){

                    const fetchWalletLimit = await db.query("select bitcoin from ledger where userId = ?;",[updateBidsArr[0].userId]);
                    const updateBtcVal = fetchWalletLimit[0][0].bitcoin + sub;
                    const updateWalletLimit = await db.query("update ledger set bitcoin = ? where userId = ?;",[updateBtcVal,updateBidsArr[0].userId]);
                    
                    if(updateWalletLimit[0].changedRows !== 0){
                        const avgPrice = updateBidsArr[0].price;

                        const queryStringTrades = "insert into trades(symbol,direction,price,size,time,userId) values(?,?,?,?,?,?);"
                    
                        const updateRow = await db.query('UPDATE bidLimitOrders SET size = ? ORDER BY price DESC,time ASC LIMIT ?',[sub,1]);
                    
                    
                        if(updateRow[0].changedRows !== 0){
                        
                        const updateValBtc = walletBalanceArr[0].bitcoin - size - (size/100 * feesTaker);
                        const updateValUsd = walletBalanceArr[0].usd + avgPrice * size;
                        const updateWallet = await db.query("update ledger set bitcoin = ?, usd = ? where userId = ?; ",[updateValBtc,updateValUsd,userId]);
                        
                    const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time,userId]);
                  
                    //Deleting market order from the database after the trade execution 
                    
                    const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                    res.status(200).json({message : "Market Order Filled Successfully", code : 200})
                    
                        }
                    }  

                }else{
                    const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                    res.status(403).json({message : "Not enough balance to fulfil this order.",code : 403});
                }

            }else{
                const rows = index - 1;

                const bidSub = costBasis - updateBidsArr[rows].price * sub;
                const avgPrice = bidSub / marketSellArr[0].size;
                console.log(avgPrice);

                if(walletBalanceArr[0].bitcoin >= size){

                    for(let a = 0; a < rows; a++){

                        const fetchLimitWallet = await db.query("select bitcoin from ledger where userId = ?;",[updateBidsArr[a].userId]);
                        const updateBtcVal = fetchLimitWallet[0][0].bitcoin + updateBidsArr[a].size;
                        const updateWallet = await db.query("update ledger set bitcoin = ? where userId = ?;",[updateBtcVal,updateBidsArr[a].userId]);

                    }
                   
                    const fetchLimitWallet = await db.query("select bitcoin from ledger where userId = ?;",[updateBidsArr[rows].userId]);
                    const updateBtcVal = fetchLimitWallet[0][0].bitcoin + sub;
                    const updateWallet = await db.query("update ledger set bitcoin = ? where userId = ?;",[updateBtcVal,updateBidsArr[rows].userId]);

                   if(updateWallet[0].changedRows !== 0){

                       const deleteRows = await db.query('DELETE FROM bidLimitOrders ORDER BY price DESC,time ASC LIMIT ?;',rows);
                
                       if(deleteRows[0].affectedRows !== 0){
                    const queryStringTrades = "insert into trades(symbol,direction,price,size,time,userId) values(?,?,?,?,?,?);"
                    
                    const updateRow = await db.query('UPDATE bidLimitOrders SET size = ? ORDER BY price DESC,time ASC LIMIT ?',[sub,1]);
                    
                    
                    
                    if(updateRow[0].changedRows !== 0){
                        // const fetchBids = await db.query('select size,price from bidLimitOrders ORDER BY price DESC,time ASC;');
                        // const bidSub = costBasis - fetchBids[0][0].price * fetchBids[0][0].size 
                        // const avgPrice =  bidSub / marketSellArr[0].size;
                        const updateBtcValue = walletBalanceArr[0].bitcoin - size - (size/100 * feesTaker);
                        const updateUsdValue = walletBalanceArr[0].usd + avgPrice * size;
                        const updateWallet = await db.query("update ledger set bitcoin = ?, usd = ? where userId = ?;",[updateBtcValue,updateUsdValue,userId]);

                        const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time,userId]);
                        
                       //Deleting market order from the database after the trade execution 

                        const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                        
                        res.status(200).json({message : "Market Order Filled Successfully", code : 200})

                    }
                    
                       }

                    }

                }else{
                    const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                    res.status(403).json({message : "Not enough balance to fulfil this order.",code : 403});
                }

            }
            
        }

         
        
        
    }else if(sub === 0){

        if(walletBalanceArr[0].bitcoin >= size){

            for(let y = 0; y < index; y++){

                const fetchLimitWallet = await db.query("select bitcoin from ledger where userId = ?;",[updateBidsArr[y].userId]);
                const updateBtcVal = fetchLimitWallet[0][0].bitcoin + updateBidsArr[y].size;
                const updateWallet = await db.query("update ledger set bitcoin = ? where userId = ?;",[updateBtcVal,updateBidsArr[y].userId]);

            };

            const avgPrice = costBasis / limitSize;
            
            const deleteRows = await db.query('DELETE FROM bidLimitOrders ORDER BY price DESC,time ASC LIMIT ?;',index);
            
            const queryStringTrades = "insert into trades(symbol,direction,price,size,time,userId) values(?,?,?,?,?,?);"
            
            
            if(deleteRows[0].affectedRows !== 0){
                
                const updateBtcValue = walletBalanceArr[0].bitcoin - size - (size/100 * feesTaker);
                const updateUsdValue = walletBalanceArr[0].usd + avgPrice * size;
                const updateWallet = await db.query("update ledger set bitcoin = ?, usd = ? where userId = ?;",[updateBtcValue,updateUsdValue,userId]);

                const tradesInsert = await db.query(queryStringTrades,[symbol,direction,avgPrice,size,time,userId])
            
                //Deleting market order from the database after the trade execution 
            
                const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
                res.status(200).json({message : "Market Order Filled Successfully", code : 200})

            }

        }else{
            const deleteRows = await db.query('DELETE FROM marketOrders ORDER BY time ASC LIMIT ?;',1);
            res.status(403).json({message : "Not enough balance to fulfil this order.",code : 403});
        }

    }

    
     
    
        
    }

} 


//validating every field in the request

if(symbol !== "BTC/USD"){
    res.status(400).json({message: "Invalid Symbol",code : 400})
}else if(direction !== 'buy' && direction !== 'sell' ){
    res.status(400).json({message : "Direction can only be buy or sell, it must be in lowercase",code : 400})
}else if(type !== "limit" && type !== "market"){
    res.status(400).json({message : "Order type can only be limit or market, it must be in lowercase",code : 400})
}else if(type === "market" && price === null){

}else if(type === "market" && price === null || price === undefined ? false : typeof price !== 'number'){
    res.status(400).json({message : "Price can only be number.",code : 400})
}else if(price < 0){
    res.status(400).json({message : "Price cannot be less than or equal to 0",code : 400})
}else if(typeof size !== 'number'){
    res.status(400).json({message : "Size can only be number.",code : 400})
}else if(size < 0){
    res.status(400).json({message : "Size cannot be less than or equal to 0",code : 400})
}else if(direction === "buy" && type === "limit"){

    const getAsks = await db.query('select price from askLimitOrders ORDER BY price ASC,time ASC;')
    const getAsksArr = getAsks[0];

    //fetch wallet balance

    const walletBalance = await db.query("select usd from ledger where userId = ?",[userId]);
    const walletBalanceArr = walletBalance[0];
    const balanceRequired = price * size;
    const walletUpdateValue = walletBalanceArr[0].usd - balanceRequired;
    const feesCalculate = size / 100 * feesMaker;
    const sizeWithFees = size - feesCalculate;
 

    //inserting limit order buy into the database

    if(postOnly === true){
      if(getAsksArr.length !== 0){

       if( walletBalanceArr[0].usd >= balanceRequired ){   
            if(price >= getAsksArr[0].price){
                res.status(403).json({message : "Cannot be a taker if post only is true.",code : 403})
            }else{
                const queryString = "insert into bidLimitOrders(symbol,type,price,size,time,userId) values(?,?,?,?,?,?)"
                const insertTrade = await db.query(queryString,[symbol,type,price,sizeWithFees,time,userId])
                const insertTradeArr = insertTrade[0]
                if(insertTradeArr.affectedRows !== 0){
                    
                    //deducting balance from wallet after inserting limit order

                    const walletDeduct = await db.query("update ledger set usd = ? where userId = ?",[walletUpdateValue,userId]);
                    if(walletDeduct[0].changedRows !== 0){
                    res.status(201).json({message : "Limit Order Posted Successfully",code : 201});
                    }
                }
            }
            
        }else{
            res.status(403).json({message : "Not enough balance to perform this trade.",code : 403})
        }

       }else if(getAsksArr.length === 0){
            if(walletBalanceArr[0].usd >= balanceRequired){
                const queryString = "insert into bidLimitOrders(symbol,type,price,size,time,userId) values(?,?,?,?,?,?)"
                const insertTrade = await db.query(queryString,[symbol,type,price,sizeWithFees,time,userId])
                const insertTradeArr = insertTrade[0]
                    if(insertTradeArr.affectedRows !== 0){
                        
                        //deducting balance from wallet after inserting limit order

                        const walletDeduct = await db.query("update ledger set usd = ? where userId = ?",[walletUpdateValue,userId]);
                        if(walletDeduct[0].changedRows !== 0){
                        res.status(201).json({message : "Limit Order Posted Successfully",code : 201});
                        }
                    }
            }else{
                res.status(403).json({message : "Not enough balance to perform this trade.",code : 403})
            } 
       } 
    }else if(postOnly === false){
        if(getAsksArr.length !== 0){
            if(price >= getAsksArr[0].price){
                marketOrders()
            }else{
                
                if(walletBalanceArr[0].usd >= balanceRequired){
                    const queryString = "insert into bidLimitOrders(symbol,type,price,size,time,userId) values(?,?,?,?,?,?)"
                    const insertTrade = await db.query(queryString,[symbol,type,price,sizeWithFees,time,userId])
                    const insertTradeArr = insertTrade[0]
                    if(insertTradeArr.affectedRows !== 0){
                        
                        //deducting balance from wallet after inserting limit order

                        const walletDeduct = await db.query("update ledger set usd = ? where userId = ?",[walletUpdateValue,userId]);
                        if(walletDeduct[0].changedRows !== 0){
                        res.status(201).json({message : "Limit Order Posted Successfully",code : 201});
                        }

                    }
                }else{
                    res.status(403).json({message : "Not enough balance to perform this trade.",code : 403})
                } 
            }

        }else if(getAsksArr.length === 0){

            if(walletBalanceArr[0].usd >= balanceRequired){
                const queryString = "insert into bidLimitOrders(symbol,type,price,size,time,userId) values(?,?,?,?,?,?)"
                const insertTrade = await db.query(queryString,[symbol,type,price,sizeWithFees,time,userId])
                const insertTradeArr = insertTrade[0]
                    if(insertTradeArr.affectedRows !== 0){

                        //deducting balance from wallet after inserting limit order

                        const walletDeduct = await db.query("update ledger set usd = ? where userId = ?",[walletUpdateValue,userId]);
                        if(walletDeduct[0].changedRows !== 0){
                        res.status(201).json({message : "Limit Order Posted Successfully",code : 201});
                        }

                    }
            }else{
                res.status(403).json({message : "Not enough balance to perform this trade.",code : 403})
            } 
        }        
    }


}else if(direction === "sell" && type === "limit"){

    const getBids = await db.query('select price from bidLimitOrders ORDER BY price DESC,time ASC;')
    const getBidsArr = getBids[0]

    //fetch wallet balance

    const walletBalance = await db.query("select bitcoin from ledger where userId = ?",[userId]);
    const walletBalanceArr = walletBalance[0];
    const walletUpdateValue = walletBalanceArr[0].bitcoin - size;
    const feesCalculate = size / 100 * feesMaker;
    const sizeWithFees = size - feesCalculate;


    //inserting limit order sell into the database


    if(postOnly === true){
      if(getBidsArr.length !== 0){
          if(walletBalanceArr[0].bitcoin >= size){

                if(price <= getBidsArr[0].price){
                    res.status(403).json({message : "Cannot be a taker if post only is true.",code : 403})
                }else{
                    const queryString = "insert into askLimitOrders(symbol,type,price,size,time,userId) values(?,?,?,?,?,?)"
                    const insertTrade = await db.query(queryString,[symbol,type,price,sizeWithFees,time,userId])
                    const insertTradeArr = insertTrade[0]
                    if(insertTradeArr.affectedRows !== 0){
                        const updateWallet = await db.query("update ledger set bitcoin = ? where userId = ?",[walletUpdateValue,userId])
                        if(updateWallet[0].affectedRows !== 0){
                        res.status(201).json({message : "Limit Order Posted Successfully",code : 201})
                        }
                    }
                }

            }else{
                res.status(403).json({message : "Not enough balance to perform this trade.",code : 403})
            }
      }else if(getBidsArr.length === 0){
          if(walletBalanceArr[0].bitcoin >= size){
                const queryString = "insert into askLimitOrders(symbol,type,price,size,time,userId) values(?,?,?,?,?,?)"
                const insertTrade = await db.query(queryString,[symbol,type,price,sizeWithFees,time,userId])
                const insertTradeArr = insertTrade[0]
                if(insertTradeArr.affectedRows !== 0){

                    const updateWallet = await db.query("update ledger set bitcoin = ? where userId = ?",[walletUpdateValue,userId])
                    if(updateWallet[0].affectedRows !== 0){
                    res.status(201).json({message : "Limit Order Posted Successfully",code : 201})
                    }

                }
            }else{
                res.status(403).json({message : "Not enough balance to perform this trade.",code : 403})
            }
      } 
    }else if(postOnly === false){
      if(getBidsArr.length !== 0){  
        if(price <= getBidsArr[0].price){
            marketOrders()
        }else{

            if(walletBalanceArr[0].bitcoin >= size){
                const queryString = "insert into askLimitOrders(symbol,type,price,size,time,userId) values(?,?,?,?,?,?)"
                const insertTrade = await db.query(queryString,[symbol,type,price,sizeWithFees,time,userId])
                const insertTradeArr = insertTrade[0]
                if(insertTradeArr.affectedRows !== 0){
                    
                    const updateWallet = await db.query("update ledger set bitcoin = ? where userId = ?",[walletUpdateValue,userId])
                    if(updateWallet[0].affectedRows !== 0){
                    res.status(201).json({message : "Limit Order Posted Successfully",code : 201})
                    }

                }
            }else{
                res.status(403).json({message : "Not enough balance to perform this trade.",code : 403})
            }
        }
      }else if(getBidsArr.length === 0){
            if(walletBalanceArr[0].bitcoin >= size){
                const queryString = "insert into askLimitOrders(symbol,type,price,size,time,userId) values(?,?,?,?,?,?)"
                const insertTrade = await db.query(queryString,[symbol,type,price,sizeWithFees,time,userId])
                const insertTradeArr = insertTrade[0]
                if(insertTradeArr.affectedRows !== 0){

                    const updateWallet = await db.query("update ledger set bitcoin = ? where userId = ?",[walletUpdateValue,userId])
                    if(updateWallet[0].affectedRows !== 0){
                    res.status(201).json({message : "Limit Order Posted Successfully",code : 201})
                    }

                }
            }else{
                res.status(403).json({message : "Not enough balance to perform this trade.",code : 403})
            }
      } 
    }


}else if(type === "market"){
    
//calling marketOrder function to insert and process market orders
marketOrders()


}


});


export default router;