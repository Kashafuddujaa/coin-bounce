const mongoose = require('mongoose');
const { MONGODB_CONNECTION_STRING } = require('../config/index');

const dbConnect = async () => {
  try {
    mongoose.set('strict', false); // Use 'strict' instead of 'strictQuery'
    const conn = await mongoose.connect(MONGODB_CONNECTION_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`Database connected to host: ${conn.connection.host}`);
  } catch (error) {
    console.log(`Error: ${error}`);
  }
};

module.exports = dbConnect;
