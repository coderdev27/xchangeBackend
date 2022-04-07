import express from "express";
import bcrypt from "bcrypt";
import db from "../config/dbConnection.js";

const router = express.Router();

router.use(express.json());


router.post("/login",async(req,res)=>{

    const email = req.body.email;
    const password = req.body.password;

    if(email === "" || password === ""){
        res.status(400).json({message : "Please fill in every fields.",code : 400});
    }else{
        const fetchUserDetails = await db.query("select email,password from userDetails where email = ?;",[email])
        const passwordCheck = await bcrypt.compare(password,fetchUserDetails[0][0].password)
        if(passwordCheck === true){
          res.status(200).json({message : "Logged in successfully.",code : 200})
        }else{
         res.status(400).json({message : "Email or password is incorrect.",code : 400});
        }
    }

    
})

export default router;
