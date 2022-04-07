import express from "express";
import orders from "./routes/orders.js";
import getOrderBook from "./routes/getOrderBook.js";
import candelStickData from "./routes/candelStickData.js";
import registration from "./routes/registration.js";
import generateKeys from "./routes/generateKeys.js";

const app = express();
const port = 3000; 

app.use(orders);
app.use(getOrderBook);
app.use(candelStickData);
app.use(registration);
app.use(generateKeys);

app.listen(port,()=>{
    console.log(`Live on http://localhost:${port}`);
});


