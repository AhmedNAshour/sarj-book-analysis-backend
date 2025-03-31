// index.js
const { createLLMClient, getModelName } = require("../utils/llm-client");
const { chunkContent } = require("../utils/content-processor");
const { processChunk } = require("../utils/character-analyzer");
const {
  improvedMerge,
  enhancedRefineFinalResults,
  inferRelationships,
} = require("../utils/results-processor");
const config = require("../config");

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
    const chunkResults = await processAllChunks(
      client,
      modelName,
      chunks,
      title,
      author,
      delayBetweenChunks
    );

    // Final merging with improved algorithm
    console.log("Performing improved merge of chunk results");
    const mergedResults = improvedMerge(chunkResults);

    // Enhanced final refinement with LLM
    console.log("Performing enhanced final refinement with LLM");
    const refinedResults = await enhancedRefineFinalResults(
      client,
      modelName,
      mergedResults,
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

    // Incrementally merge to build cumulative knowledge
    cumulativeResults = improvedMerge(chunkResults.slice(0, i + 1));

    // Add delay between chunks
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));
    }
  }

  return chunkResults;
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
  // Count bidirectional relationship pairs
  const relationshipPairs = new Set();
  results.relationships.forEach((rel) => {
    const pair = [rel.source.toLowerCase(), rel.target.toLowerCase()]
      .sort()
      .join("|");
    relationshipPairs.add(pair);
  });

  return {
    title,
    author,
    characters: results.characters,
    relationships: results.relationships,
    meta: {
      consistencyKey,
      chunksProcessed,
      characterCount: results.characters.length,
      relationshipCount: results.relationships.length,
      relationshipPairsCount: relationshipPairs.size,
      bidirectionalAnalysis: true,
      analysisDate: new Date().toISOString(),
    },
  };
}

module.exports = {
  analyzeBook,
};
