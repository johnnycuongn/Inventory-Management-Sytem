const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  // Set strictQuery mode for mongoose to prevent unknown field queries
  mongoose.set("strictQuery", true);

  if (!process.env.MONGODB_URL) {
    console.log("MongoDB URL not found");
    throw new Error("MongoDB URL not found");
  }

  if (isConnected) {
    console.log("MongoDB connection already established");
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = db.connections[0].readyState;

    console.log("MongoDB connection established");
  } catch (error) {
    console.log(error);
    throw new Error("MongoDB connection failed");
  }
};

module.exports = { connectDB };
