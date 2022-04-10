import express from "express";
import db from "../config/dbConnection.js";

const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({extended : false})); 

router.get("/api/trades",async(req,res)=>{

    const apiKey = req.header("x-api-key");

    const fetchUserData = await db.query('select userId from userDetails where apiKey = ?;',[apiKey]);
    const fetchUserIdArr = [fetchUserData[0][0].userId];
    const userId = fetchUserIdArr[0];
    
    const fetchTrades = await db.query("select id,symbol,direction,price,size,time from trades where userId = ?",[userId]);
    const fetchTradesArr = fetchTrades[0];


    res.status(200).json({message : fetchTradesArr, code : 200});
    
})

export default router;

