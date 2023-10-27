const express = require('express');
const dbConnect = require('./database/index');
const { PORT } = require('./config/index');
const router = require('./routes/index'); // Assuming this is where you've defined your routes
const errorHnadler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');


const app = express();

app.use(cookieParser());

app.use(express.json());

app.use(router); // Use the router in your Express app

dbConnect();

app.use('/storage', express.static(storage));



app.use(errorHnadler);

app.listen(PORT, () => {
  console.log(`Backend is running on port: ${PORT}`);
});
