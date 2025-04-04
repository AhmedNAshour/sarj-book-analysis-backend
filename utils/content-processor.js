const config = require("../config");

/**
 * Splits content into manageable chunks with intelligent boundaries
 * @param {string} content - The text content to chunk
 * @param {number} maxChunkSize - Maximum size of each chunk
 * @returns {string[]} Array of text chunks
 */
function chunkContent(content, maxChunkSize = config.chunking.defaultSize) {
  const cleanContent = content.trim();

  // If content is smaller than max chunk size, return it as a single chunk
  if (cleanContent.length <= maxChunkSize) {
    return [cleanContent];
  }

  const chunks = [];
  let position = 0;
  const totalLength = cleanContent.length;

  // Create chunks that maximize the use of available size
  while (position < totalLength) {
    let end = Math.min(position + maxChunkSize, totalLength);

    // If we're not at the end of the content, find better break point
    if (end < totalLength) {
      end = findBestBreakPoint(cleanContent, position, end, maxChunkSize);
    }

    const chunk = cleanContent.slice(position, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    position = end;
  }

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
 * @param {number} chunkSize - The chunk size
 * @returns {number} The adjusted end position
 */
function findBestBreakPoint(content, start, end, chunkSize) {
  // Calculate a reasonable lookback window (bigger for larger chunks)
  // Make lookback proportional to chunk size, but with a reasonable minimum and maximum
  const lookbackWindow = Math.min(
    Math.max(config.chunking.lookbackWindow || 100, chunkSize * 0.05),
    500 // Cap at 500 characters to avoid excessive lookback
  );

  const lookbackStart = Math.max(start, end - lookbackWindow);

  // Try to find the best semantic break in this order of preference:
  // 1. Double newline (paragraph break)
  const paragraphBreak = content.lastIndexOf("\n\n", end);
  if (paragraphBreak > lookbackStart) {
    return paragraphBreak + 2; // Move past the paragraph break
  }

  // 2. Single newline (line break)
  const lineBreak = content.lastIndexOf("\n", end);
  if (lineBreak > lookbackStart) {
    return lineBreak + 1; // Move past the newline
  }

  // 3. Period followed by space (sentence end)
  const sentenceBreak = content.lastIndexOf(". ", end);
  if (sentenceBreak > lookbackStart) {
    return sentenceBreak + 2; // Move past the period and space
  }

  // 4. Comma followed by space
  const commaBreak = content.lastIndexOf(", ", end);
  if (commaBreak > lookbackStart) {
    return commaBreak + 2; // Move past the comma and space
  }

  // 5. Space (word break)
  const spaceBreak = content.lastIndexOf(" ", end);
  if (spaceBreak > lookbackStart) {
    return spaceBreak + 1; // Move past the space
  }

  // If no good break found, just use the end position
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
