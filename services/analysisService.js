// Perform full book analysis (characters and relationships)
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Split content into manageable chunks
function chunkContent(content, maxChunkSize = 5000) {
  // Split by paragraphs to avoid cutting in the middle of sentences
  const paragraphs = content.split(/\n\s*\n/);

  const chunks = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the chunk size,
    // save the current chunk and start a new one
    if (
      currentChunk.length + paragraph.length > maxChunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Analyze book content in chunks to extract both characters and relationships
async function analyzeBook(content, title = "Unknown", author = "Unknown") {
  try {
    const chunks = chunkContent(content);
    console.log(`Split content into ${chunks.length} chunks for analysis`);

    // Track characters and relationships across chunks
    const characterMap = new Map();
    const relationshipMap = new Map();

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);

      const chunk = chunks[i];
      const chunkPrefix =
        chunks.length > 1
          ? `this is chunk ${i + 1} of ${chunks.length} from the book`
          : "this is the book";

      const systemPrompt = `
        You are a literary analysis expert. Analyze the provided text excerpt from "${title}" by ${author}" and extract both characters and their relationships.
        
        Format your response as a JSON object with the following structure:
        {
          "characters": [
            {
              "name": "Character Name",
              "description": "Brief description of the character",
              "importance": "major/minor/supporting" (based on frequency and role),
              "mentions": Number of times mentioned
            }
          ],
          "relationships": [
            {
              "source": "Character A",
              "target": "Character B",
              "type": "relationship type (e.g., friends, enemies, family)",
              "strength": Number representing interaction count,
              "description": "Brief description of their relationship"
            }
          ]
        }
        
        For relationships, only include pairs of characters that actually interact in this chunk.
        Return ONLY the JSON object without additional text.
      `;

      try {
        const response = await groq.chat.completions.create({
          model: "llama3-70b-8192",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${chunkPrefix}: ${chunk}` },
          ],
          temperature: 0.2,
          max_tokens: 4000,
        });

        const chunkResult = JSON.parse(response.choices[0].message.content);

        // Merge characters with existing entries
        chunkResult.characters.forEach((character) => {
          const existingChar = characterMap.get(character.name.toLowerCase());

          if (existingChar) {
            // Update existing character
            existingChar.mentions += character.mentions;

            // Update importance if needed
            const importanceRank = { major: 3, supporting: 2, minor: 1 };
            if (
              importanceRank[character.importance] >
              importanceRank[existingChar.importance]
            ) {
              existingChar.importance = character.importance;
            }

            // Enhance description if the new one has more information
            if (
              character.description.length > existingChar.description.length
            ) {
              existingChar.description = character.description;
            }
          } else {
            // Add new character
            characterMap.set(character.name.toLowerCase(), character);
          }
        });

        // Merge relationships with existing entries
        chunkResult.relationships.forEach((relationship) => {
          // Create a unique key for each relationship
          // Sort names to ensure A→B and B→A are considered the same relationship
          const names = [relationship.source, relationship.target].sort();
          const relationshipKey = `${names[0]}|${names[1]}`;

          const existingRelationship = relationshipMap.get(relationshipKey);

          if (existingRelationship) {
            // Update existing relationship
            existingRelationship.strength += relationship.strength;

            // Enhance description if the new one has more information
            if (
              relationship.description.length >
              existingRelationship.description.length
            ) {
              existingRelationship.description = relationship.description;
            }

            // Keep the most specific relationship type
            if (
              relationship.type !== "unknown" &&
              existingRelationship.type === "unknown"
            ) {
              existingRelationship.type = relationship.type;
            }
          } else {
            // Add new relationship
            relationshipMap.set(relationshipKey, relationship);
          }
        });
      } catch (chunkError) {
        console.warn(`Error processing chunk ${i + 1}:`, chunkError.message);
        // Continue with next chunk despite errors
      }

      // Pause between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Return the combined results
    return {
      characters: Array.from(characterMap.values()),
      relationships: Array.from(relationshipMap.values()),
    };
  } catch (error) {
    console.error("Error analyzing book with Groq:", error);
    throw new Error("Failed to analyze book content");
  }
}

module.exports = {
  analyzeBook,
};
