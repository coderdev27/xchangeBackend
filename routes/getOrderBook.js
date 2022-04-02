import express from "express";
import db from "../config/dbConnection.js";

const router = express.Router();

router.get("/api/orderbook",async(req,res)=>{
const bids = await db.query('select price,size from bidLimitOrders order by price desc, time asc;')
const asks = await db.query('select price,size from askLimitOrders order by price asc, time asc;')
res.json({bids : bids[0].map((curval)=>{
    return[curval.price,curval.size];
}),asks : asks[0].map((curval)=>{
    return[curval.price,curval.size];
})});

});

export default router;