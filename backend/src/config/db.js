const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer = null;

const connectDB = async () => {
  try {
    // Use in-memory MongoDB for local development (zero setup required)
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected (in-memory): ${conn.connection.host}`);

    // Return the server instance so it can be stopped on shutdown
    return mongoServer;
  } catch (err) {
    console.error(`❌ MongoDB Connection Failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
