const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const { connectDB } = require("./utils/database");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config();

// Import routes
const bookRoutes = require("./routes/bookRoutes");
const analysisRoutes = require("./routes/analysisRoutes");

// Initialize Express app
const app = express();

// Connect to MongoDB with better error handling
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("MongoDB connection established successfully");

    // Configure mongoose for better error handling
    mongoose.set("strictQuery", false);

    // Start Express server after successful DB connection
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    // Exit with error in production, but allow retry in development
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}

// Middleware
app.use(express.json({ limit: "50mb" })); // Increase payload size limit
app.use(cors());

// Routes
app.use("/api/books", bookRoutes);
app.use("/api/analysis", analysisRoutes);

// Start the server
startServer();
