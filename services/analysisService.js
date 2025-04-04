const { createLLMClient, getModelName } = require("../utils/llm-client");
const { chunkContent } = require("../utils/content-processor");
const { processChunk } = require("../utils/character-analyzer");
const {
  mergeResults,
  refineResults,
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
      try {
        const cachedAnalysis = await getAnalysisByBookId(bookId);
        if (cachedAnalysis) {
          return cachedAnalysis;
        }
      } catch (error) {
        console.warn(
          `Cache check failed, will perform new analysis: ${error.message}`
        );
      }
    } else if (overrideCache) {
      // Delete any existing analysis
      try {
        const deleted = await deleteAnalysis(bookId);
        if (deleted) {
          console.log(`Deleted existing analysis for book ID: ${bookId}`);
        }
      } catch (error) {
        console.warn(`Failed to delete existing analysis: ${error.message}`);
      }
    }

    // Perform new analysis
    const analysis = await analyzeBook(content, title, author, options);

    // Save to cache
    const savedAnalysis = await saveAnalysis(bookId, analysis, options);

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

    console.log("Performing enhanced final refinement with LLM");
    const refinedResults = await refineResults(
      client,
      modelName,
      result,
      title,
      author
    );

    // Merge the latest merged result with the refined result
    console.log("Merging latest merged result with refined result");
    const finalMergedResults = mergeResults([result, refinedResults]);

    // Update interaction counts based on actual interactions
    const updatedResults = updateInteractionCounts(
      finalMergedResults,
      result.interactions
    );

    // Create final result object with metadata
    return createFinalResult(
      title,
      author,
      updatedResults,
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
  let cumulativeResults = {
    characters: [],
    relationships: [],
    interactions: [],
  };

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

    chunkResults.push(result);

    // Incrementally merge to build cumulative knowledge
    cumulativeResults = mergeResults(chunkResults.slice(0, i + 1));

    // Add delay between chunks - Might be needed to prevent rate limiting
    // if (i < chunks.length - 1) {
    //   await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));
    // }
  }

  return cumulativeResults;
}

/**
 * Updates relationship interaction counts based on actual interactions
 * @param {Object} results - The refined results
 * @param {Array} interactions - The original interactions list
 * @returns {Object} Updated results with correct interaction counts
 */
function updateInteractionCounts(results, interactions) {
  // Create a map to count interactions between character pairs
  const interactionCountMap = new Map();

  // Count interactions for each character pair
  interactions.forEach((interaction) => {
    // For each pair of characters in the interaction
    for (let i = 0; i < interaction.characters.length; i++) {
      for (let j = i + 1; j < interaction.characters.length; j++) {
        const sourceChar = interaction.characters[i];
        const targetChar = interaction.characters[j];

        // Create keys for both directions
        const keyAB = `${sourceChar.toLowerCase()}|${targetChar.toLowerCase()}`;
        const keyBA = `${targetChar.toLowerCase()}|${sourceChar.toLowerCase()}`;

        // Increment counts
        interactionCountMap.set(
          keyAB,
          (interactionCountMap.get(keyAB) || 0) + 1
        );
        interactionCountMap.set(
          keyBA,
          (interactionCountMap.get(keyBA) || 0) + 1
        );
      }
    }
  });

  // Update relationship objects with interaction counts
  results.relationships.forEach((relationship) => {
    const source = relationship.source.toLowerCase();
    const target = relationship.target.toLowerCase();
    const key = `${source}|${target}`;

    const interactionCount = interactionCountMap.get(key);
    if (interactionCount !== undefined) {
      relationship.numberOfInteractions = interactionCount;
    } else {
      relationship.numberOfInteractions = 1;
    }
  });

  return results;
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

  // Count total interactions
  const totalInteractions = normalizedResults.interactions
    ? normalizedResults.interactions.length
    : 0;

  return {
    title,
    author,
    characters: normalizedResults.characters,
    relationships: normalizedResults.relationships,
    interactions: normalizedResults.interactions,
    meta: {
      consistencyKey,
      chunksProcessed,
      characterCount: normalizedResults.characters.length,
      relationshipCount: normalizedResults.relationships.length,
      relationshipPairsCount: relationshipPairs.size,
      interactionsCount: totalInteractions,
      bidirectionalAnalysis: true,
      analysisDate: new Date().toISOString(),
    },
  };
}

module.exports = {
  analyzeBook,
  getBookAnalysis,
};
