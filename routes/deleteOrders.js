import express from "express";
import db from "../config/dbConnection.js";

const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({extended : false})); 

router.delete("/api/orders:direction/:orderId",async(req,res)=>{

    const apiKey = req.header("x-api-key");

    const fetchUserData = await db.query('select userId from userDetails where apiKey = ?;',[apiKey]);
    const fetchUserIdArr = [fetchUserData[0][0].userId];
    const userId = fetchUserIdArr[0];
    
    const direction = req.params.direction;
    const orderId = req.params.orderId;

    if(direction === "buy" || direction === "BUY"){
         
        const deleteOrders = await db.query("delete from bidLimitOrders where userId = ? and id = ?",[userId,orderId])
        
        if(deleteOrders[0].affectedRows !== 0){
            res.status(200).json({message: 'Deleted successfully.',code : 200})
        }else{
            res.status(404).json({message : "Order not found.",code : 404})
        }

    }else if(direction === "sell" || direction === "SELL"){

        const deleteOrders = await db.query("delete from askLimitOrders where userId = ? and id = ?",[userId,orderId])
        
        if(deleteOrders[0].affectedRows !== 0){
            res.status(200).json({message: 'Deleted successfully.',code : 200})
        }else{
            res.status(404).json({message : "Order not found.",code : 404})
        }

    }




});

export default router;