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

  // Log chunk sizes for debugging
  console.log(
    `Created ${chunks.length} chunks with sizes: ${chunks
      .map((c) => c.length)
      .join(", ")}`
  );

  return chunks;
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

// Simplified chunk processing - focus on collecting raw data
async function processChunk(
  client,
  modelName,
  chunk,
  chunkIndex,
  totalChunks,
  title,
  author
) {
  // System prompt for initial character and relationship extraction
  const systemPrompt = `
    You are a literary analysis expert analyzing text from "${title}" by ${author}".
    
    This is chunk ${chunkIndex + 1} of ${totalChunks}.
    
    GUIDELINES FOR CHARACTER IDENTIFICATION:
    1. Identify each unique character who appears in this chunk
    2. Use the most complete/formal name for each character (e.g., "King Claudius" not just "King" or "Claudius")
    3. If a character is referred to by multiple names or titles, list these as aliases
    4. Count exact mentions of ALL references to the character (including pronouns when clearly referring to them)
    5. Provide a brief, factual description of the character based on this chunk
    
    GUIDELINES FOR RELATIONSHIPS:
    1. Identify relationships with evidence in this specific chunk
    2. Use the most complete/formal name for each character in the relationship
    3. Be specific about relationship types
    
    Respond ONLY with a JSON object in the following structure:
    {
      "characters": [
        {
          "name": "Character's most complete formal name",
          "aliases": ["Alternative name 1", "Title", "Nickname", etc.],
          "description": "Brief description based ONLY on information in this chunk",
          "importance": "major/minor/supporting",
          "mentions": exact number of times the character is referenced
        }
      ],
      "relationships": [
        {
          "source": "Character A's most complete formal name",
          "target": "Character B's most complete formal name",
          "type": "specific relationship type",
          "evidence": "Brief description of their interaction in this chunk",
          "strength": number of interactions in this chunk
        }
      ]
    }
    
    IMPORTANT:
    - Be precise about character identity
    - Include only relationships with evidence in this chunk
    - Return ONLY the JSON object with no additional text
  `;

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: chunk },
      ],
      temperature: 0,
      max_tokens: 4000,
    });

    let content;
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
      return {
        characters: Array.isArray(parsed.characters) ? parsed.characters : [],
        relationships: Array.isArray(parsed.relationships)
          ? parsed.relationships
          : [],
      };
    } catch (parseError) {
      console.warn("JSON parse error:", parseError.message);
      console.warn("Attempted to parse:", jsonContent);
      return { characters: [], relationships: [] };
    }
  } catch (error) {
    console.warn(
      `Error processing chunk ${chunkIndex + 1}/${totalChunks}:`,
      error.message
    );
    return { characters: [], relationships: [] };
  }
}

// Basic merging function to handle obvious duplicates
function basicMerge(chunkResults) {
  // Maps to track unique characters and relationships
  const characterMap = new Map();
  const relationshipSet = new Set();

  // Combine all characters and relationships from chunk results
  const allCharacters = [];
  const allRelationships = [];

  // Process each chunk result
  chunkResults.forEach((result) => {
    if (result.characters) {
      result.characters.forEach((character) => {
        // Use lowercase name as key for case-insensitive matching
        const key = character.name.toLowerCase();

        if (!characterMap.has(key)) {
          // Add new character to map
          characterMap.set(key, character);
          allCharacters.push(character);
        } else {
          // Update mentions count for existing character
          const existingChar = characterMap.get(key);
          existingChar.mentions += character.mentions;

          // Update importance if the new importance is higher
          const importanceRank = { major: 3, supporting: 2, minor: 1 };
          if (
            importanceRank[character.importance] >
            importanceRank[existingChar.importance]
          ) {
            existingChar.importance = character.importance;
          }

          // Collect new aliases
          if (character.aliases && Array.isArray(character.aliases)) {
            if (!existingChar.aliases) {
              existingChar.aliases = [];
            }

            character.aliases.forEach((alias) => {
              if (!existingChar.aliases.includes(alias)) {
                existingChar.aliases.push(alias);
              }
            });
          }

          // Append new description information if not redundant
          if (
            character.description &&
            !existingChar.description.includes(character.description)
          ) {
            existingChar.description += ` ${character.description}`;
          }
        }
      });
    }

    if (result.relationships) {
      result.relationships.forEach((relationship) => {
        // Create a unique key for the relationship
        const sortedNames = [
          relationship.source.toLowerCase(),
          relationship.target.toLowerCase(),
        ].sort();
        const key = `${sortedNames[0]}|${
          sortedNames[1]
        }|${relationship.type.toLowerCase()}`;

        if (!relationshipSet.has(key)) {
          relationshipSet.add(key);
          allRelationships.push(relationship);
        } else {
          // Find and update existing relationship
          const existingRel = allRelationships.find((rel) => {
            const relSortedNames = [
              rel.source.toLowerCase(),
              rel.target.toLowerCase(),
            ].sort();
            const relKey = `${relSortedNames[0]}|${
              relSortedNames[1]
            }|${rel.type.toLowerCase()}`;
            return relKey === key;
          });

          if (existingRel) {
            // Update strength
            existingRel.strength += relationship.strength;

            // Append evidence if new
            if (
              relationship.evidence &&
              !existingRel.evidence.includes(relationship.evidence)
            ) {
              existingRel.evidence += ` ${relationship.evidence}`;
            }
          }
        }
      });
    }
  });

  return {
    characters: allCharacters,
    relationships: allRelationships,
  };
}

// Final refinement function using LLM
async function refineFinalResults(
  client,
  modelName,
  rawResults,
  title,
  author
) {
  // Convert raw results to JSON string for the prompt
  const resultsJson = JSON.stringify(rawResults, null, 2);

  const systemPrompt = `
    You are a literary analysis expert finalizing an analysis of "${title}" by ${author}".
    
    I will provide you with raw character and relationship data extracted from the text.
    Your task is to refine this data to create a coherent, non-redundant, and accurate analysis.
    
    REFINEMENT GUIDELINES:
    
    FOR CHARACTERS:
    1. Eliminate redundancies in character descriptions
    2. Ensure character descriptions are concise, accurate, and meaningful
    3. Standardize importance levels (major/supporting/minor) based on mentions and narrative impact
    4. Verify character names use their most formal, complete form
    5. Remove duplicate aliases
    
    FOR RELATIONSHIPS:
    1. Standardize relationship types with clear directionality when appropriate
       - For example, use "father-son" not just "family" or "paternal"
    2. Identify important relationships missing from the raw data
       - Characters can have significant relationships even without direct interaction
    3. Ensure relationship descriptions clearly explain the nature of the connection
    4. Make sure relationships have accurate strengths based on narrative importance
    
    The refined output should be in this JSON structure:
    {
      "characters": [
        {
          "name": "Character's most complete formal name",
          "aliases": ["Alternative name 1", "Title", "Nickname", etc.],
          "description": "Concise, non-redundant description of the character",
          "importance": "major/supporting/minor",
          "mentions": total number of mentions across the text
        }
      ],
      "relationships": [
        {
          "source": "Character A's most complete formal name",
          "target": "Character B's most complete formal name",
          "type": "specific directional relationship type",
          "description": "Clear description of their relationship",
          "strength": narrative importance of this relationship (1-10)
        }
      ]
    }
    
    IMPORTANT:
    - Focus on quality over quantity
    - Ensure there are no redundancies in descriptions
    - Make sure all major narrative relationships are captured, even indirect ones
    - Return ONLY the JSON object with no additional text
  `;

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here are the raw results from analyzing "${title}" by ${author}. Please refine them according to the guidelines:\n\n${resultsJson}`,
        },
      ],
      temperature: 0,
      max_tokens: 8000,
    });

    let content;
    if (response.choices && response.choices[0]) {
      content = response.choices[0].message.content;
    } else {
      console.warn("Unexpected response format:", JSON.stringify(response));
      throw new Error("Unexpected response format");
    }

    // Extract JSON from potentially markdown-formatted response
    const jsonContent = extractJSON(content);

    try {
      return JSON.parse(jsonContent);
    } catch (parseError) {
      console.warn("JSON parse error in refinement:", parseError.message);
      console.warn("Attempted to parse:", jsonContent);
      return rawResults; // Return original results if parsing fails
    }
  } catch (error) {
    console.warn("Error in final refinement:", error.message);
    return rawResults; // Return original results on error
  }
}

// Main analysis function
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

    // Process chunks and collect raw results
    const chunkResults = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      const result = await processChunk(
        client,
        modelName,
        chunks[i],
        i,
        chunks.length,
        title,
        author
      );
      chunkResults.push(result);

      // Add delay between chunks
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));
      }
    }

    // Basic merging to handle obvious duplicates
    console.log("Performing basic merge of chunk results");
    const mergedResults = basicMerge(chunkResults);

    // Final refinement with LLM
    console.log("Performing final refinement with LLM");
    const refinedResults = await refineFinalResults(
      client,
      modelName,
      mergedResults,
      title,
      author
    );

    // Add metadata
    const finalResults = {
      characters: refinedResults.characters,
      relationships: refinedResults.relationships,
      meta: {
        consistencyKey,
        chunksProcessed: chunks.length,
        characterCount: refinedResults.characters.length,
        relationshipCount: refinedResults.relationships.length,
      },
    };

    return finalResults;
  } catch (error) {
    console.error(`Error analyzing book with ${options.provider}:`, error);
    throw new Error(`Failed to analyze book content: ${error.message}`);
  }
}

module.exports = {
  analyzeBook,
};
