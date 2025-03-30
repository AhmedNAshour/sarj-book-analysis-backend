const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();
const bookRoutes = require("./routes/bookRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const app = express();

app.use(express.json());
app.use(cors());
app.use("/api/books", bookRoutes);
app.use("/api/analysis", analysisRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
