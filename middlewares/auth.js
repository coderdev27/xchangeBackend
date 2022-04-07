import express from "express";
import crypto from 'crypto';
import db from "../config/dbConnection.js";

const router = express.Router();

router.use(express.json());

const auth = async(req,res,next)=>{
    
    const apiKey = req.header("x-api-key");
    const signature = req.header("signature")

    const jsonBody = JSON.stringify(req.body)
    const jsonQueryString = JSON.stringify(req.query)

    const findApiKeyInDb = await db.query('select apiKey,secretKey from userDetails where apiKey = ?;',[apiKey])
    const findApiKeyInDbArr = findApiKeyInDb[0];

    if(findApiKeyInDbArr.length !== 0){
        const sign = crypto.createHmac('sha256',findApiKeyInDbArr[0].secretKey).update(jsonBody,jsonQueryString).digest('hex')
        if(sign === signature){
            next();
        }else{
           res.status(401).json({message : "Not authorized.",code : 401});
        };
        
    }else{
        res.status(401).json({message : "Not authorized.",code : 401})
    };
    
}

export default auth;