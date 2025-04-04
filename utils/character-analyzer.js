const { extractJSON } = require("./content-processor");
const { generateCompletion } = require("./llm-client");
const prompts = require("./prompts");

/**
 * Processes a text chunk to extract characters and relationships
 * @param {Object} client - The LLM client
 * @param {string} modelName - The model name
 * @param {string} chunk - The text chunk to process
 * @param {number} chunkIndex - The index of the current chunk
 * @param {number} totalChunks - The total number of chunks
 * @param {string} title - The book title
 * @param {string} author - The book author
 * @param {Object} previousResults - Results from previous chunks
 * @returns {Promise<Object>} Extracted characters and relationships
 */
async function processChunk(
  client,
  modelName,
  chunk,
  chunkIndex,
  totalChunks,
  title,
  author,
  previousResults = null
) {
  // Create context summary from previous results
  const contextSummary = prompts.buildContextSummary(
    previousResults,
    chunkIndex
  );

  // Generate the system prompt
  const systemPrompt = prompts.createCharacterExtractionPrompt(
    title,
    author,
    chunkIndex,
    totalChunks,
    contextSummary
  );

  try {
    // Generate completion using the LLM
    const content = await generateCompletion(
      client,
      modelName,
      systemPrompt,
      chunk
    );

    // Extract JSON from potentially markdown-formatted response
    const jsonContent = extractJSON(content);

    try {
      const parsed = JSON.parse(jsonContent);
      return {
        characters: Array.isArray(parsed.characters) ? parsed.characters : [],
        relationships: Array.isArray(parsed.relationships)
          ? parsed.relationships
          : [],
        interactions: Array.isArray(parsed.interactions)
          ? parsed.interactions
          : [],
      };
    } catch (parseError) {
      logParsingError(parseError, jsonContent, chunkIndex, totalChunks);
      return { characters: [], relationships: [], interactions: [] };
    }
  } catch (error) {
    console.warn(
      `Error processing chunk ${chunkIndex + 1}/${totalChunks}:`,
      error.message
    );
    return { characters: [], relationships: [], interactions: [] };
  }
}

/**
 * Logs a parsing error with context
 */
function logParsingError(error, content, chunkIndex, totalChunks) {
  console.warn(
    `JSON parse error in chunk ${chunkIndex + 1}/${totalChunks}:`,
    error.message
  );
  console.warn("Attempted to parse:", content.substring(0, 200) + "...");
}

module.exports = {
  processChunk,
};
