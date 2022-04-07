import express from "express";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import db from "../config/dbConnection.js";

const router = express.Router();

router.use(express.json());

router.post("/register",async(req,res)=>{
   //storing req body in the object 

    const registrationData = {
    email : req.body.email,
    password : req.body.password,
    confirmPassword : req.body.confirmPassword,
    mobileNumber : req.body.mobileNumber
    };

    const {email,password,confirmPassword,mobileNumber} = registrationData;

    const fetchUserDetails = await db.query("select email,mobileNumber from userDetails where email = ? or mobileNumber = ?",[email,mobileNumber]);


    if(email === "" || password === "" || confirmPassword === "" || mobileNumber === ""){
        res.status(400).json({message : "Please fill in every fields.",code : 400})
    }else if(password === confirmPassword){
       
        if(fetchUserDetails[0].length === 1){
       
            res.status(400).json({message : "Email or mobile number is already used.",code : 400});
       
        }else{
         const hashPassword = await bcrypt.hash(password,12)
         const insertIntoDb = await db.query("insert into userDetails(email,password,mobileNumber) values(?,?,?)",[email,hashPassword,mobileNumber])
         
         if(insertIntoDb[0].affectedRows !== 0){
           res.status(201).json({message : "Registered successfully",code : 201})
         } 

       } 

    }



})

export default router;

