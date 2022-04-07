import express from "express";
import crypto from 'crypto';
import db from "../config/dbConnection.js";
import login from "../middlewares/login.js"

const router = express.Router();


router.get("/generateKeys",login,async(req,res)=>{

    const apiKey = crypto.randomBytes(50).toString('hex');
    const secretKey = crypto.randomBytes(50).toString('hex');
   
    const insertApiKey = await db.query("update userDetails set apiKey = ?, secretKey = ? where email = ?;",[apiKey,secretKey,req.body.email])
    
    if(insertApiKey[0].affectedRows !== 0){
    res.status(201).json({apiKey,secretKey})
    }else{
    res.status(500).json({message: "Unable to generate keys.",code : 500})    
    }
})

export default router;
