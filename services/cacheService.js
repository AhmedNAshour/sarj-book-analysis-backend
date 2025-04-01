const Analysis = require("../models/Analysis");

/**
 * Checks if an analysis exists for a given book ID
 * @param {string} bookId - The book ID to check
 * @returns {Promise<Object|null>} The analysis object if found, null otherwise
 */
async function getAnalysisByBookId(bookId) {
  try {
    return await Analysis.findOne({ bookId });
  } catch (error) {
    console.error(`Error fetching analysis for book ${bookId}:`, error);
    return null;
  }
}

/**
 * Saves a new analysis result to the database
 * @param {string} bookId - The book ID
 * @param {Object} analysis - The analysis results
 * @param {Object} options - The analysis options used
 * @returns {Promise<Object>} The saved analysis document
 */
async function saveAnalysis(bookId, analysis, options) {
  try {
    // Ensure relationships are properly structured
    let sanitizedRelationships = [];
    if (analysis.relationships && Array.isArray(analysis.relationships)) {
      sanitizedRelationships = analysis.relationships.map((rel) => ({
        source: String(rel.source || ""),
        target: String(rel.target || ""),
        type: String(rel.type || ""),
        strength: Number(rel.strength || 0),
        status: String(rel.status || ""),
        description: String(rel.description || ""),
        evidence: String(rel.evidence || ""),
      }));
    }

    // Ensure characters are properly structured
    let sanitizedCharacters = [];
    if (analysis.characters && Array.isArray(analysis.characters)) {
      sanitizedCharacters = analysis.characters.map((char) => ({
        name: String(char.name || ""),
        importance: String(char.importance || ""),
        description: String(char.description || ""),
        aliases: Array.isArray(char.aliases) ? char.aliases.map(String) : [],
        mentions: Number(char.mentions || 0),
      }));
    }

    const analysisDocument = new Analysis({
      bookId,
      title: String(analysis.title || ""),
      author: String(analysis.author || ""),
      characters: sanitizedCharacters,
      relationships: sanitizedRelationships,
      meta: {
        consistencyKey: String(analysis.meta?.consistencyKey || ""),
        chunksProcessed: Number(analysis.meta?.chunksProcessed || 0),
        characterCount: Number(analysis.meta?.characterCount || 0),
        relationshipCount: Number(analysis.meta?.relationshipCount || 0),
        relationshipPairsCount: Number(
          analysis.meta?.relationshipPairsCount || 0
        ),
        bidirectionalAnalysis: Boolean(
          analysis.meta?.bidirectionalAnalysis || false
        ),
        analysisDate: new Date(analysis.meta?.analysisDate || Date.now()),
        provider: String(options.provider || ""),
      },
    });

    // console.log(analysisDocument);

    // return await analysisDocument.save();
  } catch (error) {
    console.error(`Error saving analysis for book ${bookId}:`, error);
    throw new Error(`Failed to save analysis to database: ${error.message}`);
  }
}

/**
 * Deletes an existing analysis for a book ID
 * @param {string} bookId - The book ID
 * @returns {Promise<boolean>} True if deleted, false otherwise
 */
async function deleteAnalysis(bookId) {
  try {
    const result = await Analysis.deleteOne({ bookId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error(`Error deleting analysis for book ${bookId}:`, error);
    return false;
  }
}

module.exports = {
  getAnalysisByBookId,
  saveAnalysis,
  deleteAnalysis,
};
