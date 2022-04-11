import express from "express";

const router = express.Router();


router.get("/api/time",(req,res)=>{

    const time = Date.now();
    
    res.status(200).json({time,code : 200})

});

export default router;