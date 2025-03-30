const Groq = require("groq-sdk");
const OpenAI = require("openai");

// Factory function to create appropriate client based on provider
function createLLMClient(provider) {
  switch (provider.toLowerCase()) {
    case "groq":
      return new Groq({ apiKey: process.env.GROQ_API_KEY });
    case "sambanova":
      return new OpenAI({
        apiKey: process.env.SAMBANOVA_API_KEY,
        baseURL: process.env.SAMBANOVA_API_BASE_URL,
      });
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

// Get model name based on provider
function getModelName(provider) {
  switch (provider.toLowerCase()) {
    case "groq":
      return "llama3-70b-8192";
    case "sambanova":
      return "Meta-Llama-3.3-70B-Instruct";
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

// Split content into manageable chunks with fixed-size boundaries for consistency
function chunkContent(content, maxChunkSize = 8000) {
  // Ensure we're working with a clean string
  const cleanContent = content.trim();

  // If content is smaller than max chunk size, return it as a single chunk
  if (cleanContent.length <= maxChunkSize) {
    return [cleanContent];
  }

  const chunks = [];
  const totalLength = cleanContent.length;

  // Calculate optimal chunk size to get evenly sized chunks
  // This creates predictable, consistently sized chunks
  let optimalChunkCount = Math.ceil(totalLength / maxChunkSize);
  let optimalChunkSize = Math.ceil(totalLength / optimalChunkCount);

  // Create chunks of optimal size
  for (let i = 0; i < totalLength; i += optimalChunkSize) {
    // Calculate end position
    let end = Math.min(i + optimalChunkSize, totalLength);

    // If we're not at the end of the content, try to find a better break point
    if (end < totalLength) {
      // Look for natural break points within a window (paragraph or space)
      const lookbackWindow = Math.min(100, optimalChunkSize / 10);

      // First try to find paragraph break
      const paragraphBreak = cleanContent.lastIndexOf("\n\n", end);
      if (paragraphBreak > end - lookbackWindow && paragraphBreak > i) {
        end = paragraphBreak;
      } else {
        // Otherwise look for space
        const spaceBreak = cleanContent.lastIndexOf(" ", end);
        if (spaceBreak > end - lookbackWindow && spaceBreak > i) {
          end = spaceBreak;
        }
      }
    }

    // Extract the chunk and trim whitespace
    const chunk = cleanContent.slice(i, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
  }

  // Log chunk sizes for debugging consistency
  console.log(
    `Created ${chunks.length} chunks with sizes: ${chunks
      .map((c) => c.length)
      .join(", ")}`
  );

  return chunks;
}

// Format previous characters for context passing
function formatPreviousCharacters(characters, limit = 10) {
  if (!characters || characters.length === 0) {
    return "";
  }

  // Sort characters by mentions and take the most important ones
  const topCharacters = [...characters]
    .sort((a, b) => (b.mentions || 0) - (a.mentions || 0))
    .slice(0, limit);

  return topCharacters
    .map((char) => {
      // Include aliases if available
      const aliasText =
        char.aliases && char.aliases.length > 0
          ? ` (also known as: ${char.aliases.join(", ")})`
          : "";

      return `- ${char.name}${aliasText}: ${
        char.description || "No description available"
      } [Mentions: ${char.mentions || 0}]`;
    })
    .join("\n");
}

// Format previous relationships for context passing
function formatPreviousRelationships(relationships, limit = 8) {
  if (!relationships || relationships.length === 0) {
    return "";
  }

  // Sort relationships by strength and take the most important ones
  const topRelationships = [...relationships]
    .sort((a, b) => (b.strength || 0) - (a.strength || 0))
    .slice(0, limit);

  return topRelationships
    .map((rel) => {
      return `- ${rel.source} and ${rel.target}: ${
        rel.type || "unknown"
      } relationship (${rel.description || "No description"})`;
    })
    .join("\n");
}

// Improved JSON extraction function
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

// Improved chunk processing with context passing
async function processChunkWithContext(
  client,
  modelName,
  chunk,
  chunkIndex,
  totalChunks,
  title,
  author,
  contextSoFar // New parameter for context passing
) {
  // Generate context sections from previously identified entities
  const previousCharactersContext =
    contextSoFar.characters.length > 0
      ? `PREVIOUSLY IDENTIFIED CHARACTERS:\n${formatPreviousCharacters(
          contextSoFar.characters
        )}\n\n`
      : "";

  const previousRelationshipsContext =
    contextSoFar.relationships.length > 0
      ? `PREVIOUSLY IDENTIFIED RELATIONSHIPS:\n${formatPreviousRelationships(
          contextSoFar.relationships
        )}\n\n`
      : "";

  // Enhanced system prompt with context from previous chunks
  const systemPrompt = `
    You are a literary analysis expert analyzing text from "${title}" by ${author}".
    
    This is chunk ${chunkIndex + 1} of ${totalChunks}.
    
    ${previousCharactersContext}
    ${previousRelationshipsContext}
    
    GUIDELINES FOR CHARACTER IDENTIFICATION:
    1. Identify each unique character who appears in this chunk
    2. Use the most complete/formal name for each character (e.g., "King Claudius" not just "King" or "Claudius")
    3. If a character is referred to by multiple names or titles, list these as aliases
    4. Count exact mentions of ALL references to the character (including pronouns when clearly referring to them)
    5. If a character was previously identified, use EXACTLY the same primary name for consistency
    6. For previously identified characters, provide ONLY NEW information in their description - do not repeat what's already in the context
    7. If you have no new information about a character, but they appear in this chunk, simply count their mentions and set description to ""
    
    GUIDELINES FOR RELATIONSHIPS:
    1. Only identify relationships with clear evidence in this specific chunk
    2. Use the most complete/formal name for each character in the relationship
    3. Be specific about relationship types (e.g., "maternal uncle" not just "family")
    4. Maintain consistency with previously identified relationships when possible
    5. For previously identified relationships, provide ONLY NEW observations - do not repeat what's already in the context
    
    Respond ONLY with a JSON object in the following structure:
    {
      "characters": [
        {
          "name": "Character's most complete formal name",
          "aliases": ["Alternative name 1", "Title", "Nickname", etc.],
          "description": "Brief description based ONLY on information in this chunk",
          "importance": "major/minor/supporting",
          "mentions": exact number of times the character is referenced (by name, title, or clear pronoun)
        }
      ],
      "relationships": [
        {
          "source": "Character A's most complete formal name",
          "target": "Character B's most complete formal name",
          "type": "specific relationship type (maternal uncle/close friend/bitter enemy/etc.)",
          "strength": number of interactions in this chunk,
          "description": "Brief description of their relationship as evidenced in this chunk"
        }
      ]
    }
    
    IMPORTANT RULES:
    - Use the most complete formal name as the primary identifier for each character
    - Include ALL aliases and alternative ways the character is referred to in the text
    - Be extremely precise about character identity - never create separate entries for the same character
    - Only include relationships with clear textual evidence in this specific chunk
    - Return ONLY the JSON object with no additional text or commentary
  `;

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: chunk },
      ],
      temperature: 0, // Set to 0 for maximum consistency
      max_tokens: 4000,
    });

    let content;

    // Handle different response formats
    if (response.choices && response.choices[0]) {
      content = response.choices[0].message.content;
    } else {
      console.warn("Unexpected response format:", JSON.stringify(response));
      throw new Error("Unexpected response format");
    }

    // Extract JSON from potentially markdown-formatted response
    const jsonContent = extractJSON(content);

    try {
      const parsed = JSON.parse(jsonContent);

      // Ensure the returned object has the expected structure
      return {
        characters: Array.isArray(parsed.characters) ? parsed.characters : [],
        relationships: Array.isArray(parsed.relationships)
          ? parsed.relationships
          : [],
      };
    } catch (parseError) {
      console.warn("JSON parse error:", parseError.message);
      console.warn("Attempted to parse:", jsonContent);

      // Provide a fallback empty result structure
      return {
        characters: [],
        relationships: [],
      };
    }
  } catch (error) {
    console.warn(
      `Error processing chunk ${chunkIndex + 1}/${totalChunks}:`,
      error.message
    );
    if (error.response) {
      console.warn(
        "Response content:",
        error.response.content || "No content available"
      );
    }
    // Return empty structure on error
    return { characters: [], relationships: [] };
  }
}

// Process chunks sequentially with context passing
async function processChunksSequentially(
  client,
  modelName,
  chunks,
  title,
  author,
  delayBetweenChunks = 1000
) {
  // Initialize context
  const context = {
    characters: [],
    relationships: [],
  };

  // Initialize character and relationship maps
  const characterMap = new Map();
  const relationshipMap = new Map();

  const results = [];

  // Process chunks sequentially to maintain context
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length} with context`);

    // Process current chunk with context from previous chunks
    const chunkResult = await processChunkWithContext(
      client,
      modelName,
      chunks[i],
      i,
      chunks.length,
      title,
      author,
      context
    );

    results.push(chunkResult);

    // Update character map
    mergeCharacters(characterMap, chunkResult.characters);

    // Update relationship map
    mergeRelationships(
      relationshipMap,
      chunkResult.relationships,
      characterMap
    );

    // Update context for next chunk
    context.characters = Array.from(characterMap.values());
    context.relationships = Array.from(relationshipMap.values());

    // Add delay between chunks
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));
    }
  }

  return results;
}

// Improved character merging with alias handling
function mergeCharacters(characterMap, characters) {
  if (!characters || !Array.isArray(characters)) {
    return;
  }

  characters.forEach((character) => {
    if (!character || typeof character.name !== "string") {
      return;
    }

    // Normalize character name for consistent lookup
    const normalizedName = character.name.toLowerCase().trim();

    if (!normalizedName) {
      return; // Skip entries with empty names
    }

    // Check for existing character with same name
    let existingChar = characterMap.get(normalizedName);

    // If no direct match, check if this character matches any aliases in existing characters
    if (!existingChar) {
      // Check if this character's name matches any alias in existing characters
      for (const [key, value] of characterMap.entries()) {
        if (value.aliases && Array.isArray(value.aliases)) {
          const normalizedAliases = value.aliases.map((alias) =>
            alias.toLowerCase().trim()
          );

          if (normalizedAliases.includes(normalizedName)) {
            existingChar = value;
            break;
          }
        }
      }
    }

    if (existingChar) {
      // Update existing character with more precise mention counting
      existingChar.mentions =
        (existingChar.mentions || 0) + (character.mentions || 1);

      // Update importance if needed
      const importanceRank = { major: 3, supporting: 2, minor: 1 };
      const existingRank = importanceRank[existingChar.importance] || 0;
      const newRank = importanceRank[character.importance] || 0;

      if (newRank > existingRank) {
        existingChar.importance = character.importance;
      }

      // Merge descriptions - only add if there's new information
      if (character.description && character.description.trim()) {
        if (!existingChar.description) {
          existingChar.description = character.description;
        } else {
          // Add new information - the LLM should already be providing only new info
          // but we'll concatenate it carefully
          const existingDesc = existingChar.description.trim();
          const newInfo = character.description.trim();

          if (newInfo && !existingDesc.includes(newInfo)) {
            existingChar.description =
              existingDesc +
              (existingDesc.endsWith(".") ? " " : ". ") +
              newInfo;
          }
        }
      }

      // Merge aliases
      if (character.aliases && Array.isArray(character.aliases)) {
        if (!existingChar.aliases) {
          existingChar.aliases = [];
        }

        character.aliases.forEach((alias) => {
          const normalizedAlias = alias.toLowerCase().trim();
          const existingAliases = existingChar.aliases.map((a) =>
            a.toLowerCase().trim()
          );

          if (
            !existingAliases.includes(normalizedAlias) &&
            normalizedAlias !== normalizedName
          ) {
            existingChar.aliases.push(alias);
          }
        });
      }

      // Add the character's name as an alias if it's different from the existing character name
      if (
        character.name !== existingChar.name &&
        (!existingChar.aliases ||
          !existingChar.aliases.includes(character.name))
      ) {
        if (!existingChar.aliases) {
          existingChar.aliases = [];
        }
        existingChar.aliases.push(character.name);
      }
    } else {
      // Add new character with normalized fields
      characterMap.set(normalizedName, {
        name: character.name, // Keep original casing
        aliases: Array.isArray(character.aliases) ? [...character.aliases] : [],
        description: character.description || "",
        importance: character.importance || "minor",
        mentions: character.mentions || 1,
      });
    }
  });
}

// Improved relationship merging with alias handling
function mergeRelationships(relationshipMap, relationships, characterMap) {
  if (!relationships || !Array.isArray(relationships)) {
    return;
  }

  // Create an alias lookup map for faster character resolution
  const aliasToCharacterMap = new Map();

  // Build alias map from character map
  for (const [normalizedName, character] of characterMap.entries()) {
    aliasToCharacterMap.set(normalizedName, character.name);

    if (character.aliases && Array.isArray(character.aliases)) {
      character.aliases.forEach((alias) => {
        const normalizedAlias = alias.toLowerCase().trim();
        aliasToCharacterMap.set(normalizedAlias, character.name);
      });
    }
  }

  relationships.forEach((relationship) => {
    if (!relationship || !relationship.source || !relationship.target) {
      return;
    }

    // Normalize character names
    const sourceNormalized = relationship.source.toLowerCase().trim();
    const targetNormalized = relationship.target.toLowerCase().trim();

    // Resolve canonical names using alias map
    const sourceCanonical =
      aliasToCharacterMap.get(sourceNormalized) || relationship.source;
    const targetCanonical =
      aliasToCharacterMap.get(targetNormalized) || relationship.target;

    // Skip if we can't resolve the characters
    if (!sourceCanonical || !targetCanonical) {
      return;
    }

    // Use canonical names sorted alphabetically for consistent key generation
    const names = [
      sourceCanonical.toLowerCase(),
      targetCanonical.toLowerCase(),
    ].sort();
    const relationshipKey = `${names[0]}|${names[1]}`;

    const existingRelationship = relationshipMap.get(relationshipKey);

    if (existingRelationship) {
      // Update existing relationship with cumulative strength
      existingRelationship.strength =
        (existingRelationship.strength || 1) + (relationship.strength || 1);

      // Merge relationship descriptions - only add if there's new information
      if (relationship.description && relationship.description.trim()) {
        if (!existingRelationship.description) {
          existingRelationship.description = relationship.description;
        } else {
          // Add new information - the LLM should already be providing only new info
          const existingDesc = existingRelationship.description.trim();
          const newInfo = relationship.description.trim();

          if (newInfo && !existingDesc.includes(newInfo)) {
            existingRelationship.description =
              existingDesc +
              (existingDesc.endsWith(".") ? " " : ". ") +
              newInfo;
          }
        }
      }

      // Keep the most specific relationship type
      if (
        relationship.type &&
        relationship.type !== "unknown" &&
        (!existingRelationship.type || existingRelationship.type === "unknown")
      ) {
        existingRelationship.type = relationship.type;
      }
    } else {
      // Add new relationship with canonical names
      relationshipMap.set(relationshipKey, {
        source: sourceCanonical,
        target: targetCanonical,
        type: relationship.type || "unknown",
        strength: relationship.strength || 1,
        description: relationship.description || "",
      });
    }
  });
}

// Improved book analysis function with sequential processing and context passing
async function analyzeBook(content, title, author, options) {
  const {
    provider,
    chunkSize = 6000,
    delayBetweenChunks = 1000,
    consistencyKey = Date.now(),
  } = options;

  console.log(`Starting analysis with consistency key: ${consistencyKey}`);
  console.log(`Parameters: chunkSize=${chunkSize}`);

  try {
    const client = createLLMClient(provider);
    const modelName = getModelName(provider);

    console.log(`Using provider: ${provider} with model: ${modelName}`);

    // Create chunks
    const chunks = chunkContent(content, chunkSize);
    console.log(`Split content into ${chunks.length} chunks for analysis`);

    // Process chunks sequentially with context passing
    const chunkResults = await processChunksSequentially(
      client,
      modelName,
      chunks,
      title,
      author,
      delayBetweenChunks
    );

    // Track characters and relationships across chunks
    const characterMap = new Map();
    const relationshipMap = new Map();

    // Merge results from all chunks
    chunkResults.forEach((result, index) => {
      console.log(`Merging results from chunk ${index + 1}/${chunks.length}`);

      if (result.characters) {
        mergeCharacters(characterMap, result.characters);
      }

      if (result.relationships) {
        mergeRelationships(relationshipMap, result.relationships, characterMap);
      }
    });

    // Sort characters by mentions for consistent ordering
    const sortedCharacters = Array.from(characterMap.values()).sort(
      (a, b) => (b.mentions || 0) - (a.mentions || 0)
    );

    // Sort relationships by strength for consistent ordering
    const sortedRelationships = Array.from(relationshipMap.values()).sort(
      (a, b) => (b.strength || 0) - (a.strength || 0)
    );

    // Return the combined and sorted results
    return {
      characters: sortedCharacters,
      relationships: sortedRelationships,
      meta: {
        consistencyKey,
        chunksProcessed: chunks.length,
        characterCount: sortedCharacters.length,
        relationshipCount: sortedRelationships.length,
      },
    };
  } catch (error) {
    console.error(`Error analyzing book with ${options.provider}:`, error);
    throw new Error(`Failed to analyze book content: ${error.message}`);
  }
}

module.exports = {
  analyzeBook,
};
