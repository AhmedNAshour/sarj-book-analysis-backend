// index.js
const { createLLMClient, getModelName } = require("../utils/llm-client");
const { chunkContent } = require("../utils/content-processor");
const { processChunk } = require("../utils/character-analyzer");
const {
  mergeResults,
  enhancedRefineFinalResults,
  inferRelationships,
  normalizeCharacterNames,
} = require("../utils/results-processor");
const {
  getAnalysisByBookId,
  saveAnalysis,
  deleteAnalysis,
} = require("./cacheService");
const config = require("../config");

/**
 * Retrieves or generates a book analysis based on options
 * @param {string} bookId - The book ID
 * @param {string} content - The book content as text
 * @param {string} title - The book title
 * @param {string} author - The book author
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} The analysis results
 */
async function getBookAnalysis(bookId, content, title, author, options) {
  const { overrideCache = false } = options;

  try {
    // Check cache first if not overriding
    if (!overrideCache) {
      console.log(`Checking for cached analysis for book ID: ${bookId}`);
      try {
        const cachedAnalysis = await getAnalysisByBookId(bookId);
        if (cachedAnalysis) {
          console.log(`Using cached analysis for book ID: ${bookId}`);
          return cachedAnalysis;
        }
        console.log(`No cached analysis found for book ID: ${bookId}`);
      } catch (error) {
        console.warn(
          `Cache check failed, will perform new analysis: ${error.message}`
        );
      }
    } else if (overrideCache) {
      console.log(`Cache override requested for book ID: ${bookId}`);

      // Delete any existing analysis
      try {
        const deleted = await deleteAnalysis(bookId);
        if (deleted) {
          console.log(`Deleted existing analysis for book ID: ${bookId}`);
        }
      } catch (error) {
        console.warn(`Failed to delete existing analysis: ${error.message}`);
        // Continue with analysis despite deletion error
      }
    }

    // Perform new analysis
    const analysis = await analyzeBook(content, title, author, options);

    // Save to cache
    console.log(`Saving analysis to database for book ID: ${bookId}`);
    const savedAnalysis = await saveAnalysis(bookId, analysis, options);
    console.log(`Analysis saved with ID: ${savedAnalysis?._id}`);

    return savedAnalysis || analysis;
  } catch (error) {
    console.error(`Error in getBookAnalysis for ${bookId}:`, error);
    throw new Error(`Failed to analyze book: ${error.message}`);
  }
}

/**
 * Main function to analyze a book's characters and relationships
 * @param {string} content - The book content as text
 * @param {string} title - The book title
 * @param {string} author - The book author
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} The analysis results
 */
async function analyzeBook(content, title, author, options) {
  const {
    provider,
    chunkSize = config.chunking.defaultSize,
    delayBetweenChunks = config.analysis.defaultDelayBetweenChunks,
    consistencyKey = Date.now(),
  } = options;

  console.log(`Starting analysis with consistency key: ${consistencyKey}`);
  console.log(`Parameters: chunkSize=${chunkSize}`);

  try {
    // Initialize LLM client
    const client = createLLMClient(provider);
    const modelName = getModelName(provider);
    console.log(`Using provider: ${provider} with model: ${modelName}`);

    // Create chunks
    const chunks = chunkContent(content, chunkSize);
    console.log(`Split content into ${chunks.length} chunks for analysis`);

    // Process chunks with progressive context enhancement
    const result = await processAllChunks(
      client,
      modelName,
      chunks,
      title,
      author,
      delayBetweenChunks
    );

    // Final merging with improved algorithm
    console.log("Using cumulative results from all chunks");
    console.log("Pre-refined final result: ", result);

    // Enhanced final refinement with LLM
    console.log("Performing enhanced final refinement with LLM");
    const refinedResults = await enhancedRefineFinalResults(
      client,
      modelName,
      result,
      title,
      author
    );

    // Perform a dedicated relationship inference pass to catch any missing relationships
    console.log("Performing relationship inference pass");
    const resultWithInferredRelationships = await inferRelationships(
      client,
      modelName,
      refinedResults,
      title,
      author
    );

    // Add metadata
    return createFinalResult(
      title,
      author,
      resultWithInferredRelationships,
      chunks.length,
      consistencyKey
    );
  } catch (error) {
    console.error(`Error analyzing book with ${options.provider}:`, error);
    throw new Error(`Failed to analyze book content: ${error.message}`);
  }
}

/**
 * Process all chunks with progressive context
 */
async function processAllChunks(
  client,
  modelName,
  chunks,
  title,
  author,
  delayBetweenChunks
) {
  const chunkResults = [];
  let cumulativeResults = { characters: [], relationships: [] };

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}`);

    // Process the current chunk with accumulated context
    const result = await processChunk(
      client,
      modelName,
      chunks[i],
      i,
      chunks.length,
      title,
      author,
      cumulativeResults
    );

    // Log results
    console.log(`\n=== CHUNK ${i + 1} RESULTS ===`);
    console.log(`Characters found: ${result.characters.length}`);
    console.log(`Relationships found: ${result.relationships.length}`);
    console.log(`=== END OF CHUNK ${i + 1} RESULTS ===\n`);

    chunkResults.push(result);

    // console.log("Chunk number", i + 1, "results", result);

    // Incrementally merge to build cumulative knowledge
    cumulativeResults = mergeResults(chunkResults.slice(0, i + 1));

    // console.log("Cumulative results", cumulativeResults);

    // Add delay between chunks
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));
    }
  }

  return cumulativeResults;
}

/**
 * Creates the final result object with metadata
 */
function createFinalResult(
  title,
  author,
  results,
  chunksProcessed,
  consistencyKey
) {
  // Normalize character names to ensure consistency
  const normalizedResults = normalizeCharacterNames(results);

  // Count bidirectional relationship pairs
  const relationshipPairs = new Set();
  normalizedResults.relationships.forEach((rel) => {
    const pair = [rel.source.toLowerCase(), rel.target.toLowerCase()]
      .sort()
      .join("|");
    relationshipPairs.add(pair);
  });

  return {
    title,
    author,
    characters: normalizedResults.characters,
    relationships: normalizedResults.relationships,
    meta: {
      consistencyKey,
      chunksProcessed,
      characterCount: normalizedResults.characters.length,
      relationshipCount: normalizedResults.relationships.length,
      relationshipPairsCount: relationshipPairs.size,
      bidirectionalAnalysis: true,
      analysisDate: new Date().toISOString(),
    },
  };
}

module.exports = {
  analyzeBook,
  getBookAnalysis,
};
