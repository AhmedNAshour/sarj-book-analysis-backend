const mongoose = require("mongoose");

/**
 * Establish connection to MongoDB database
 * @returns {Promise} Promise representing the connection to MongoDB
 */
async function connectDB() {
  try {
    const connectionString =
      process.env.MONGODB_URI || "mongodb://localhost:27017/sarj-book-analysis";
    await mongoose.connect(connectionString);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
