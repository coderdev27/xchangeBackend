import express from "express";
import bcrypt from "bcrypt";
import db from "../config/dbConnection.js";

const router = express.Router();

router.use(express.json());


const login = async(req,res,next)=>{

    const email = req.body.email;
    const password = req.body.password;

    if(email === "" || password === "" || email === undefined || password === undefined){
        res.status(400).json({message : "Please fill in every fields.",code : 400});
    }else{
        const fetchUserDetails = await db.query("select email,password from userDetails where email = ?;",[email])
        const passwordCheck = await bcrypt.compare(password,fetchUserDetails[0][0].password)
        if(passwordCheck === true){
            next()
        }else{
         res.status(400).json({message : "Email or password is incorrect.",code : 400});
        }
    }

    
}

export default login;
