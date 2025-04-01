const mongoose = require("mongoose");
const Analysis = require("../models/Analysis");

/**
 * Validates and sanitizes analysis data before saving to database
 * @param {Object} analysis - The analysis data to sanitize
 * @returns {Object} The sanitized analysis object
 */
function sanitizeAnalysisData(analysis) {
  // Handle relationships sanitization
  const sanitizedRelationships = Array.isArray(analysis.relationships)
    ? analysis.relationships.map((rel) => ({
        source: String(rel.source || ""),
        target: String(rel.target || ""),
        type: String(rel.type || ""),
        status: String(rel.status || ""),
        description: String(rel.description || ""),
        evidence: String(rel.evidence || ""),
      }))
    : [];

  // Handle interactions sanitization
  const sanitizedInteractions = Array.isArray(analysis.interactions)
    ? analysis.interactions.map((interaction) => ({
        characters: Array.isArray(interaction.characters)
          ? interaction.characters.map(String)
          : [],
        description: String(interaction.description || ""),
        context: String(interaction.context || ""),
        type: String(interaction.type || ""),
        chunkIndex: Number(
          isNaN(interaction.chunkIndex) ? 0 : interaction.chunkIndex
        ),
      }))
    : [];

  // Handle characters sanitization
  const sanitizedCharacters = Array.isArray(analysis.characters)
    ? analysis.characters.map((char) => ({
        name: String(char.name || ""),
        importance: String(char.importance || ""),
        description: String(char.description || ""),
        aliases: Array.isArray(char.aliases) ? char.aliases.map(String) : [],
        mentions: Number(isNaN(char.mentions) ? 0 : char.mentions),
      }))
    : [];

  // Handle metadata
  const meta = {
    consistencyKey: String(analysis.meta?.consistencyKey || ""),
    chunksProcessed: Number(
      isNaN(analysis.meta?.chunksProcessed) ? 0 : analysis.meta.chunksProcessed
    ),
    characterCount: Number(
      isNaN(analysis.meta?.characterCount) ? 0 : analysis.meta.characterCount
    ),
    relationshipCount: Number(
      isNaN(analysis.meta?.relationshipCount)
        ? 0
        : analysis.meta.relationshipCount
    ),
    relationshipPairsCount: Number(
      isNaN(analysis.meta?.relationshipPairsCount)
        ? 0
        : analysis.meta.relationshipPairsCount
    ),
    bidirectionalAnalysis: Boolean(
      analysis.meta?.bidirectionalAnalysis || false
    ),
    analysisDate: new Date(analysis.meta?.analysisDate || Date.now()),
    provider: String(analysis.meta?.provider || ""),
  };

  return {
    title: String(analysis.title || ""),
    author: String(analysis.author || ""),
    characters: sanitizedCharacters,
    relationships: sanitizedRelationships,
    interactions: sanitizedInteractions,
    meta,
  };
}

/**
 * Checks if an analysis exists for a given book ID
 * @param {string} bookId - The book ID to check
 * @returns {Promise<Object|null>} The analysis object if found, null otherwise
 */
async function getAnalysisByBookId(bookId) {
  if (!bookId) {
    throw new Error("Book ID is required");
  }

  try {
    return await Analysis.findOne({ bookId }).lean();
  } catch (error) {
    console.error(`Error fetching analysis for book ${bookId}:`, error);
    throw new Error(`Database error fetching analysis: ${error.message}`);
  }
}

/**
 * Saves a new analysis result to the database using upsert
 * @param {string} bookId - The book ID
 * @param {Object} analysis - The analysis results
 * @param {Object} options - The analysis options used
 * @returns {Promise<Object>} The saved analysis document
 */
async function saveAnalysis(bookId, analysis, options = {}) {
  if (!bookId) {
    throw new Error("Book ID is required");
  }

  if (!analysis) {
    throw new Error("Analysis data is required");
  }

  try {
    // Sanitize the analysis data
    const sanitizedData = sanitizeAnalysisData(analysis);

    // Update metadata with provider from options
    sanitizedData.meta.provider = String(
      options.provider || sanitizedData.meta.provider
    );

    // Use findOneAndUpdate with upsert for atomic operation
    const result = await Analysis.findOneAndUpdate(
      { bookId },
      {
        bookId,
        ...sanitizedData,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    console.log(`Analysis saved successfully for book ${bookId}`);
    return result;
  } catch (error) {
    console.error(`Error saving analysis for book ${bookId}:`, error);

    // Handle MongoDB validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      throw new Error(
        `Duplicate entry for book ID ${bookId}. Use update instead.`
      );
    }

    throw new Error(`Failed to save analysis to database: ${error.message}`);
  }
}

/**
 * Updates an existing analysis in the database
 * @param {string} bookId - The book ID
 * @param {Object} updateData - The fields to update
 * @returns {Promise<Object|null>} The updated document or null if not found
 */
async function updateAnalysis(bookId, updateData) {
  if (!bookId) {
    throw new Error("Book ID is required");
  }

  if (!updateData || Object.keys(updateData).length === 0) {
    throw new Error("Update data is required");
  }

  try {
    // We don't allow updating the bookId
    if (updateData.bookId) {
      delete updateData.bookId;
    }

    const result = await Analysis.findOneAndUpdate(
      { bookId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!result) {
      return null;
    }

    console.log(`Analysis updated successfully for book ${bookId}`);
    return result;
  } catch (error) {
    console.error(`Error updating analysis for book ${bookId}:`, error);
    throw new Error(`Failed to update analysis: ${error.message}`);
  }
}

/**
 * Deletes an existing analysis for a book ID
 * @param {string} bookId - The book ID
 * @returns {Promise<boolean>} True if deleted, false otherwise
 */
async function deleteAnalysis(bookId) {
  if (!bookId) {
    throw new Error("Book ID is required");
  }

  try {
    const result = await Analysis.deleteOne({ bookId });
    const wasDeleted = result.deletedCount > 0;

    if (wasDeleted) {
      console.log(`Analysis deleted successfully for book ${bookId}`);
    } else {
      console.log(`No analysis found to delete for book ${bookId}`);
    }

    return wasDeleted;
  } catch (error) {
    console.error(`Error deleting analysis for book ${bookId}:`, error);
    throw new Error(`Failed to delete analysis: ${error.message}`);
  }
}

/**
 * Retrieves all analyses with optional pagination
 * @param {Object} options - Pagination options
 * @returns {Promise<Array>} Array of analysis documents
 */
async function getAllAnalyses(
  options = { limit: 50, page: 1, sort: "-createdAt" }
) {
  try {
    const limit = Number(options.limit) || 50;
    const page = Number(options.page) || 1;
    const skip = (page - 1) * limit;
    const sort = options.sort || "-createdAt";

    const analyses = await Analysis.find({})
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Analysis.countDocuments();

    return {
      analyses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error retrieving all analyses:", error);
    throw new Error(`Failed to retrieve analyses: ${error.message}`);
  }
}

module.exports = {
  getAnalysisByBookId,
  saveAnalysis,
  updateAnalysis,
  deleteAnalysis,
  getAllAnalyses,
};
