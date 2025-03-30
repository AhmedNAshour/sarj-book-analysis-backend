const express = require("express");
const router = express.Router();
const bookService = require("../services/bookService");

router.get("/:bookId/content", async (req, res) => {
  const bookId = req.params.bookId;
  try {
    const content = await bookService.fetchBookContent(bookId);
    res.json({ message: `Book ID is valid, ${bookId}!`, content: content });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching book content", error: error.message });
  }
});

router.get("/:bookId/metadata", async (req, res) => {
  const bookId = req.params.bookId;
  try {
    const metadata = await bookService.fetchBookMetadata(bookId);
    res.json({ message: `Book ID is valid, ${bookId}!`, metadata: metadata });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching book metadata", error: error.message });
  }
});

module.exports = router;
