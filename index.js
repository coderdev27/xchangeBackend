import express from "express";
import orders from "./routes/orders.js";
import getOrderBook from "./routes/getOrderBook.js";

const app = express();
const port = 3000; 

app.use(orders)
app.use(getOrderBook)

app.listen(port,()=>{
    console.log(`Live on http://localhost:${port}`);
})


