const express = require("express");
const router = express.Router();
const analysisService = require("../services/analysisService");
const bookService = require("../services/bookService");
const { getAllAnalyses } = require("../services/cacheService");

router.post("/:bookId/full", async (req, res) => {
  try {
    const { bookId } = req.params;
    const { options = {} } = req.body;

    // Add default options if not provided
    const analysisOptions = {
      provider: options.provider || "groq",
      chunkSize: options.chunkSize,
      delayBetweenChunks: options.delayBetweenChunks,
      overrideCache: options.overrideCache === true, // Explicit boolean check
      consistencyKey: options.consistencyKey || Date.now(),
    };

    console.log("Analysis options:", analysisOptions);

    if (!bookId) {
      return res.status(400).json({ error: "Book ID is required" });
    }

    // Fetch book content and metadata
    const bookContent = await bookService.fetchBookContent(bookId);
    const metadata = await bookService.fetchBookMetadata(bookId);

    // Use the new getBookAnalysis method that handles caching
    const analysis = await analysisService.getBookAnalysis(
      bookId,
      bookContent,
      metadata.title,
      metadata.author,
      analysisOptions
    );

    res.json({
      bookId,
      ...metadata,
      analysis,
      cached: !analysisOptions.overrideCache && analysis._id !== undefined,
    });
  } catch (error) {
    console.error("Error performing full analysis:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route to get cached analysis only, without performing analysis if not cached
router.get("/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;

    if (!bookId) {
      return res.status(400).json({ error: "Book ID is required" });
    }

    // Only check the cache, don't perform analysis
    const { getAnalysisByBookId } = require("../services/cacheService");
    const cachedAnalysis = await getAnalysisByBookId(bookId);

    if (!cachedAnalysis) {
      return res.status(404).json({
        error: "Analysis not found for this book",
        bookId,
      });
    }

    // Get metadata for the response
    const metadata = await bookService.fetchBookMetadata(bookId);

    res.json({
      bookId,
      ...metadata,
      analysis: cachedAnalysis,
      cached: true,
    });
  } catch (error) {
    console.error("Error fetching cached analysis:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route to delete cached analysis
router.delete("/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;

    if (!bookId) {
      return res.status(400).json({ error: "Book ID is required" });
    }

    const { deleteAnalysis } = require("../services/cacheService");
    const deleted = await deleteAnalysis(bookId);

    if (!deleted) {
      return res.status(404).json({
        error: "Analysis not found for this book",
        bookId,
      });
    }

    res.json({
      success: true,
      message: `Analysis for book ${bookId} has been deleted`,
      bookId,
    });
  } catch (error) {
    console.error("Error deleting cached analysis:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route to get all analyses with pagination
router.get("/", async (req, res) => {
  try {
    const { limit = 50, page = 1, sort = "-createdAt" } = req.query;
    const result = await getAllAnalyses({ limit, page, sort });

    res.json(result);
  } catch (error) {
    console.error("Error fetching all analyses:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
