const express = require("express");
const router = express.Router();
const analysisService = require("../services/analysisService");
const bookService = require("../services/bookService");

router.post("/:bookId/full", async (req, res) => {
  try {
    const { bookId } = req.params;
    const { options } = req.body;
    console.log(options);

    if (!bookId) {
      return res.status(400).json({ error: "Book ID is required" });
    }

    // Fetch book content and metadata
    const bookContent = await bookService.fetchBookContent(bookId);
    const metadata = await bookService.fetchBookMetadata(bookId);

    const analysis = await analysisService.analyzeBook(
      bookContent,
      metadata.title,
      metadata.author,
      options
    );
    res.json({ bookId, ...metadata, analysis });
  } catch (error) {
    console.error("Error performing full analysis:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
