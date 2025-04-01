const mongoose = require("mongoose");

/**
 * Establish connection to MongoDB database
 * @returns {Promise} Promise representing the connection to MongoDB
 */
async function connectDB() {
  try {
    const connectionString =
      process.env.MONGODB_URI || "mongodb://localhost:27017/sarj-book-analysis";

    // Set Mongoose options for better stability
    const mongooseOptions = {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    };

    await mongoose.connect(connectionString, mongooseOptions);
    console.log("MongoDB Connected");

    // Set up connection event listeners
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
      // Don't exit in production, as mongoose will attempt to reconnect automatically
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected, attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected successfully");
    });
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    // In production, we might want to retry rather than exit immediately
    if (process.env.NODE_ENV === "production") {
      console.error("Failed to connect to MongoDB. Retrying in 5 seconds...");
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
}

/**
 * Gracefully close the MongoDB connection
 */
async function closeDB() {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
  }
}

module.exports = { connectDB, closeDB };
