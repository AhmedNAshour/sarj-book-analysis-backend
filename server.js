const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const { connectDB, closeDB } = require("./utils/database");
const mongoose = require("mongoose");

dotenv.config();

const bookRoutes = require("./routes/bookRoutes");
const analysisRoutes = require("./routes/analysisRoutes");

const app = express();

async function startServer() {
  try {
    await connectDB();
    console.log("MongoDB connection established successfully");

    mongoose.set("strictQuery", false);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    process.on("SIGINT", async () => {
      console.log("SIGINT received, shutting down");
      await closeDB();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("SIGTERM received, shutting down");
      await closeDB();
      process.exit(0);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/books", bookRoutes);
app.use("/api/analysis", analysisRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    dbConnection:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

startServer();
