import express from "express";
import db from "../config/dbConnection.js";

const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({extended : false})); 

router.get("/api/orders",async(req,res)=>{

    const apiKey = req.header("x-api-key");

    const fetchUserData = await db.query('select userId from userDetails where apiKey = ?;',[apiKey]);
    const fetchUserIdArr = [fetchUserData[0][0].userId];
    const userId = fetchUserIdArr[0];
    
    const fetchAsksTrades = await db.query("select id,symbol,direction,price,type,size,time from askLimitOrders where userId = ?",[userId]);
    const fetchAsksTradesArr = fetchAsksTrades[0];
    const fetchBidsTrades = await db.query("select id,symbol,direction,price,type,size,time from bidLimitOrders where userId = ?",[userId]);
    const fetchBidsTradesArr = fetchBidsTrades[0];

    fetchAsksTradesArr.push(...fetchBidsTradesArr);

    res.status(200).json({message : fetchAsksTradesArr, code : 200});
})

export default router;
