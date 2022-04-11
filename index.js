import express from "express";
import orders from "./routes/orders.js";
import getOrderBook from "./routes/getOrderBook.js";
import candelStickData from "./routes/candelStickData.js";
import registration from "./routes/registration.js";
import generateKeys from "./routes/generateKeys.js";
import deleteOrders from "./routes/deleteOrders.js";
import getOpenTrades from "./routes/getOpenTrades.js";
import getTrades from "./routes/getTrades.js";
import getServerTime from "./routes/getServerTime.js";

const app = express();
const port = 3000; 

app.use(orders);
app.use(getOrderBook);
app.use(candelStickData);
app.use(registration);
app.use(generateKeys);
app.use(deleteOrders);
app.use(getOpenTrades);
app.use(getTrades);
app.use(getServerTime);

app.listen(port,()=>{
    console.log(`Live on http://localhost:${port}`);
});


