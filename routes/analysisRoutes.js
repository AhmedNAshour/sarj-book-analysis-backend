const express = require("express");
const router = express.Router();
const analysisService = require("../services/analysisService");
const bookService = require("../services/bookService");

router.post("/:bookId/full", async (req, res) => {
  try {
    const { bookId } = req.params;
    const { content, options } = req.body;
    console.log(options);

    let bookContent = content;
    let metadata = { title: "Unknown", author: "Unknown" };

    // If content is not provided, fetch it
    if (!bookContent) {
      if (!bookId) {
        return res
          .status(400)
          .json({ error: "Either bookId or content must be provided" });
      }

      bookContent = await bookService.fetchBookContent(bookId);
      metadata = await bookService.fetchBookMetadata(bookId);
    }

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
