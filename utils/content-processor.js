// content-processor.js
const config = require("../config");

/**
 * Splits content into manageable chunks with intelligent boundaries
 * @param {string} content - The text content to chunk
 * @param {number} maxChunkSize - Maximum size of each chunk
 * @returns {string[]} Array of text chunks
 */
function chunkContent(content, maxChunkSize = config.chunking.defaultSize) {
  // Ensure we're working with a clean string
  const cleanContent = content.trim();

  // If content is smaller than max chunk size, return it as a single chunk
  if (cleanContent.length <= maxChunkSize) {
    return [cleanContent];
  }

  const chunks = [];
  const totalLength = cleanContent.length;

  // Calculate optimal chunk size to get evenly sized chunks
  let optimalChunkCount = Math.ceil(totalLength / maxChunkSize);
  let optimalChunkSize = Math.ceil(totalLength / optimalChunkCount);

  // Create chunks of optimal size with intelligent boundaries
  for (let i = 0; i < totalLength; i += optimalChunkSize) {
    // Calculate end position
    let end = Math.min(i + optimalChunkSize, totalLength);

    // If we're not at the end of the content, try to find a better break point
    if (end < totalLength) {
      end = findBestBreakPoint(cleanContent, i, end, optimalChunkSize);
    }

    // Extract the chunk and trim whitespace
    const chunk = cleanContent.slice(i, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
  }

  // Log chunk sizes for debugging
  console.log(
    `Created ${chunks.length} chunks with sizes: ${chunks
      .map((c) => c.length)
      .join(", ")}`
  );

  return chunks;
}

/**
 * Find the best break point near the end position
 * @param {string} content - The full content
 * @param {number} start - Start position of current chunk
 * @param {number} end - Target end position
 * @param {number} chunkSize - The optimal chunk size
 * @returns {number} The adjusted end position
 */
function findBestBreakPoint(content, start, end, chunkSize) {
  // Look for natural break points within a window
  const lookbackWindow = Math.min(
    config.chunking.lookbackWindow || 100,
    chunkSize / 10
  );

  // First try to find paragraph break
  const paragraphBreak = content.lastIndexOf("\n\n", end);
  if (paragraphBreak > end - lookbackWindow && paragraphBreak > start) {
    return paragraphBreak;
  }

  // Otherwise look for space
  const spaceBreak = content.lastIndexOf(" ", end);
  if (spaceBreak > end - lookbackWindow && spaceBreak > start) {
    return spaceBreak;
  }

  return end;
}

/**
 * Extracts JSON from text response, handling various formats
 * @param {string} text - Text containing JSON
 * @returns {string} The extracted JSON string
 */
function extractJSON(text) {
  // First, try to find JSON inside markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const cleanedJson = jsonMatch[1].trim();
      JSON.parse(cleanedJson); // Validate it's valid JSON
      return cleanedJson;
    } catch (e) {
      // If parsing fails, continue to the next method
    }
  }

  // If no code blocks, try to find JSON object directly
  const jsonObjectMatch = text.match(/(\{[\s\S]*\})/);
  if (jsonObjectMatch) {
    try {
      const cleanedJson = jsonObjectMatch[0].trim();
      JSON.parse(cleanedJson); // Validate it's valid JSON
      return cleanedJson;
    } catch (e) {
      // If parsing fails, continue to additional checks
    }
  }

  // Try to find the largest valid JSON object
  let largestValidJson = "";

  // Look for anything that looks like a JSON object
  const potentialJsons = Array.from(text.matchAll(/(\{[\s\S]*?\})/g)).map(
    (m) => m[0]
  );

  for (const jsonCandidate of potentialJsons) {
    try {
      JSON.parse(jsonCandidate);
      if (jsonCandidate.length > largestValidJson.length) {
        largestValidJson = jsonCandidate;
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  if (largestValidJson) {
    return largestValidJson;
  }

  // Return a fallback empty structure if no valid JSON found
  return '{"characters":[],"relationships":[]}';
}

module.exports = {
  chunkContent,
  extractJSON,
};
