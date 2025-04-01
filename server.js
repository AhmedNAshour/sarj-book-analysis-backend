const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const { connectDB, closeDB } = require("./utils/database");
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

    // Set up graceful shutdown
    process.on("SIGINT", async () => {
      console.log("SIGINT received, shutting down gracefully");
      await closeDB();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("SIGTERM received, shutting down gracefully");
      await closeDB();
      process.exit(0);
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
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/books", bookRoutes);
app.use("/api/analysis", analysisRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    dbConnection:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Start the server
startServer();
