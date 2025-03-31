// Main improvements:
// 1. Enhanced processChunk function with better prompts for richer character descriptions
// 2. Added progressive context passing between chunks
// 3. Improved relationship extraction with more narrative context
// 4. Better handling of character descriptions and relationships across chunks

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

// Enhanced chunk processing with progressive context
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
  // Create a context summary from previous results if available
  let contextSummary = "";

  if (previousResults && chunkIndex > 0) {
    // Extract most important characters from previous chunks
    const significantCharacters = previousResults.characters
      .filter(
        (char) =>
          char.mentions > 3 ||
          char.importance === "major" ||
          char.importance === "supporting"
      )
      .slice(0, 15); // Limit to prevent context overflow

    // Extract most important relationships from previous chunks
    const significantRelationships = previousResults.relationships
      .filter((rel) => rel.strength > 2)
      .slice(0, 20); // Limit to prevent context overflow

    // Format character and relationship summaries for the prompt
    const characterSummaries = significantCharacters
      .map((char) => {
        return `- ${char.name}${
          char.aliases ? ` (${char.aliases.join(", ")})` : ""
        }: ${char.description.substring(0, 200)}${
          char.description.length > 200 ? "..." : ""
        }`;
      })
      .join("\n");

    const relationshipSummaries = significantRelationships
      .map((rel) => {
        return `- ${rel.source} & ${rel.target}: ${rel.type} (${
          rel.status
        }) - ${rel.evidence ? rel.evidence.substring(0, 150) : "No evidence"}${
          rel.evidence && rel.evidence.length > 150 ? "..." : ""
        }`;
      })
      .join("\n");

    contextSummary = `
CONTEXT FROM PREVIOUS CHUNKS:

CHARACTERS:
${characterSummaries}

RELATIONSHIPS:
${relationshipSummaries}

Use this context to inform your analysis of the current chunk, especially when identifying continuing character arcs and developing relationships. When you find information that extends or contradicts previous knowledge, prioritize updating and expanding rather than simply repeating.
`;
  }

  // Enhanced system prompt for initial character and relationship extraction
  const systemPrompt = `
You are a literary analysis expert analyzing text from "${title}" by ${author}".

This is chunk ${chunkIndex + 1} of ${totalChunks}.

${contextSummary}

GUIDELINES FOR CHARACTER IDENTIFICATION:

1. Identify each unique character who appears in this chunk
2. Use the most complete/formal name for each character (e.g., "King Claudius" not just "King" or "Claudius")
3. If a character is referred to by multiple names or titles, list these as aliases
4. Count exact mentions of ALL references to the character (including pronouns when clearly referring to them)
5. For character descriptions, include:
   - Key personal traits and attributes revealed in this chunk
   - Specific actions they take and their significance
   - Key decisions, emotional states, and motivations shown
   - Their impact on other characters and the narrative
   - How they change or develop within this chunk
   - Any historical background or context revealed about them
   - THEIR RELATIONSHIPS with other characters, both explicit and implied

GUIDELINES FOR RELATIONSHIPS:
1. Identify ALL relationships with evidence in this specific chunk, including:
   - Direct interactions between characters present in the chunk
   - Relationships mentioned or referenced even if one or both characters aren't present
   - Implied relationships based on narrative context or character descriptions
   - Parallel or contrasting character journeys (foil relationships)
   - Relationships where one character affects another without direct contact
   - Characters who are mentioned together or in relation to the same events or people
   
2. For each relationship, capture:
   - Specific interactions and their outcomes
   - Power dynamics between characters
   - Changes in the relationship during this chunk
   - Emotional resonance and impact on each character
   - How this relationship affects the larger narrative

3. Strictly separate relationship information into two components:
   - TYPE: The structural relationship (e.g., father-son, mentor-student, neighbors, king-subject)
   - STATUS: The emotional or dynamic state (e.g., friendly, antagonistic, suspicious)

4. For RELATIONSHIP TYPE, focus exclusively on structural connections:
   - Family: "father-son", "uncle-nephew", "siblings", "cousins"
   - Political: "king-subject", "ruler-heir", "rival-princes"
   - Social: "friends", "lovers", "neighbors"
   - Professional: "master-servant", "teacher-student"
   
   Use compound types when appropriate (e.g., "uncle-nephew + king-subject")
   
5. For RELATIONSHIP STATUS, focus on emotional qualities and dynamics:
   - Emotional states: "loving", "antagonistic", "vengeful", "loyal"
   - Dynamic patterns: "complicated", "deteriorating", "strengthening"

6. AGGRESSIVELY INFER implied relationships:
   - If A is described as "father of B" and C is described as "father of D", consider if B and D might be cousins
   - If A is "brother of B" and C is "son of B", then A is C's uncle
   - If A is king and B is a noble, they have a king-subject relationship
   - If A loves B, but B loves C, then A and C might have a rivalry
   - Pay special attention to family connections that might be implicit in descriptions
   - Consider political and power relationships based on characters' roles and status

7. For the evidence field, provide specific examples from the text that demonstrate:
   - How characters interact with or affect each other
   - Direct quotes or paraphrased exchanges that reveal relationship dynamics
   - Narrative commentary that illuminates the relationship

8. BE EXHAUSTIVE - find ALL possible relationships:
   - If two major characters both appear in this chunk, they MUST have some kind of relationship
   - Even if characters don't directly interact, consider their relationship to each other
   - Think about how each character's actions or decisions might affect other characters

Respond ONLY with a JSON object in the following structure:
{
  "characters": [
    {
      "name": "Character's most complete formal name",
      "aliases": ["Alternative name 1", "Title", "Nickname", etc.],
      "description": "Detailed description based on this chunk, including key actions, interactions, development, and narrative importance",
      "importance": "major/minor/supporting",
      "mentions": exact number of times the character is referenced
    }
  ],
  "relationships": [
    {
      "source": "Character A's most complete formal name",
      "target": "Character B's most complete formal name",
      "type": "structural relationship type only (e.g., 'uncle-nephew + king-subject')",
      "status": "emotional or dynamic state of the relationship",
      "evidence": "Specific examples and quotes from this chunk showing their relationship and its impact",
      "strength": number of interactions or references to this relationship in this chunk
    }
  ]
}

IMPORTANT:
- Be precise about character identity
- For character descriptions, focus on NARRATIVE ACTIONS and DEVELOPMENT, not just attributes
- Include ALL relationships with evidence in this chunk, even indirect or implied ones
- For relationship TYPE, focus ONLY on structural connections (family, professional roles, etc.)
- For relationship STATUS, capture ONLY the emotional/dynamic quality (allies, enemies, suspicious, etc.)
- DON'T LIMIT RELATIONSHIPS TO DIRECT INTERACTIONS - include relationships based on mentions or narrative influence
- Return ONLY the JSON object with no additional text
1. Identify ALL relationships with evidence in this specific chunk, including:
   - Direct interactions between characters present in the chunk
   - Relationships mentioned or referenced even if one or both characters aren't present
   - Implied relationships based on narrative context or character descriptions
   - Parallel or contrasting character journeys (foil relationships)
   - Relationships where one character affects another without direct contact
   
2. For each relationship, capture:
   - Specific interactions and their outcomes
   - Power dynamics between characters
   - Changes in the relationship during this chunk
   - Emotional resonance and impact on each character
   - How this relationship affects the larger narrative

3. Strictly separate relationship information into two components:
   - TYPE: The structural relationship (e.g., father-son, mentor-student, neighbors, king-subject)
   - STATUS: The emotional or dynamic state (e.g., friendly, antagonistic, suspicious)

4. For RELATIONSHIP TYPE, focus exclusively on structural connections:
   - Family: "father-son", "uncle-nephew", "siblings", "cousins"
   - Political: "king-subject", "ruler-heir", "rival-princes"
   - Social: "friends", "lovers", "neighbors"
   - Professional: "master-servant", "teacher-student"
   
   Use compound types when appropriate (e.g., "uncle-nephew + king-subject")
   
5. For RELATIONSHIP STATUS, focus on emotional qualities and dynamics:
   - Emotional states: "loving", "antagonistic", "vengeful", "loyal"
   - Dynamic patterns: "complicated", "deteriorating", "strengthening"

6. AGGRESSIVELY INFER implied relationships:
   - If A is described as "father of B" and C is described as "father of D", consider if B and D might be cousins
   - If A is "brother of B" and C is "son of B", then A is C's uncle
   - If A is king and B is a noble, they have a king-subject relationship
   - If A loves B, but B loves C, then A and C might have a rivalry
   - Pay special attention to family connections that might be implicit in descriptions
   - Consider political and power relationships based on characters' roles and status

7. For the evidence field, provide specific examples from the text that demonstrate:
   - How characters interact with or affect each other
   - Direct quotes or paraphrased exchanges that reveal relationship dynamics
   - Narrative commentary that illuminates the relationship

8. BE EXHAUSTIVE - find ALL possible relationships:
   - If two major characters both appear in this chunk, they MUST have some kind of relationship
   - Even if characters don't directly interact, consider their relationship to each other
   - Think about how each character's actions or decisions might affect other characters

Respond ONLY with a JSON object in the following structure:
{
  "characters": [
    {
      "name": "Character's most complete formal name",
      "aliases": ["Alternative name 1", "Title", "Nickname", etc.],
      "description": "Detailed description based on this chunk, including key actions, interactions, development, and narrative importance",
      "importance": "major/minor/supporting",
      "mentions": exact number of times the character is referenced
    }
  ],
  "relationships": [
    {
      "source": "Character A's most complete formal name",
      "target": "Character B's most complete formal name",
      "type": "structural relationship type only (e.g., 'uncle-nephew + king-subject')",
      "status": "emotional or dynamic state of the relationship",
      "evidence": "Specific examples and quotes from this chunk showing their relationship and its impact",
      "strength": number of interactions or references to this relationship in this chunk
    }
  ]
}

IMPORTANT:
- Be precise about character identity
- For character descriptions, focus on NARRATIVE ACTIONS and DEVELOPMENT, not just attributes
- Include ALL relationships with evidence in this chunk, even indirect or implied ones
- For relationship TYPE, focus ONLY on structural connections (family, professional roles, etc.)
- For relationship STATUS, capture ONLY the emotional/dynamic quality (allies, enemies, suspicious, etc.)
- DON'T LIMIT RELATIONSHIPS TO DIRECT INTERACTIONS - include relationships based on mentions or narrative influence
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

// Improved merging function with better character and relationship consolidation
function improvedMerge(chunkResults) {
  // Maps to track unique characters and relationships
  const characterMap = new Map();
  const relationshipMap = new Map();

  // Combine all characters and relationships from chunk results
  const allCharacters = [];
  const allRelationships = [];

  // Process each chunk result
  chunkResults.forEach((result, chunkIndex) => {
    if (result.characters) {
      result.characters.forEach((character) => {
        // Use lowercase name as key for case-insensitive matching
        const key = character.name.toLowerCase();

        if (!characterMap.has(key)) {
          // Add new character to map
          character.firstAppearance = chunkIndex;
          character.lastAppearance = chunkIndex;
          character.chunkAppearances = [chunkIndex];
          characterMap.set(key, character);
          allCharacters.push(character);
        } else {
          // Update existing character
          const existingChar = characterMap.get(key);

          // Update appearance tracking
          existingChar.lastAppearance = chunkIndex;
          existingChar.chunkAppearances.push(chunkIndex);

          // Update mentions count
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

          // Simply append new description information
          if (character.description) {
            if (!existingChar.description) {
              existingChar.description = character.description;
            } else {
              // Just concatenate the descriptions - final refinement will handle deduplication
              existingChar.description += ` In another section: ${character.description}`;
            }
          }
        }
      });
    }

    if (result.relationships) {
      result.relationships.forEach((relationship) => {
        // Create a more specific relationship key that includes both characters
        const source = relationship.source.toLowerCase();
        const target = relationship.target.toLowerCase();
        const sortedNames = [source, target].sort();
        const baseKey = `${sortedNames[0]}|${sortedNames[1]}`;
        const typeKey = relationship.type
          ? relationship.type.toLowerCase()
          : "unknown";
        const key = `${baseKey}|${typeKey}`;

        // Check if we already have this relationship pair and type
        if (!relationshipMap.has(key)) {
          relationship.firstAppearance = chunkIndex;
          relationship.lastAppearance = chunkIndex;
          relationship.chunkAppearances = [chunkIndex];
          relationshipMap.set(key, relationship);
          allRelationships.push(relationship);
        } else {
          // Update existing relationship
          const existingRel = relationshipMap.get(key);

          // Update appearance tracking
          existingRel.lastAppearance = chunkIndex;
          existingRel.chunkAppearances.push(chunkIndex);

          // Update strength
          existingRel.strength += relationship.strength;

          // Merge status information if available and new
          if (relationship.status) {
            if (!existingRel.status) {
              existingRel.status = relationship.status;
            } else if (!existingRel.status.includes(relationship.status)) {
              // Add new status information
              existingRel.status = `${existingRel.status}, ${relationship.status}`;
            }
          }

          // Simply append evidence information
          if (relationship.evidence) {
            if (!existingRel.evidence) {
              existingRel.evidence = relationship.evidence;
            } else {
              // Just concatenate the evidence - final refinement will handle deduplication
              existingRel.evidence += ` Later evidence: ${relationship.evidence}`;
            }
          }
        }
      });
    }
  });

  // Calculate character arcs
  allCharacters.forEach((character) => {
    const appearances = character.chunkAppearances || [];
    delete character.chunkAppearances;

    // Calculate arc span (how much of the text they appear in)
    if (appearances.length > 0) {
      const firstAppearance = character.firstAppearance;
      const lastAppearance = character.lastAppearance;
      const arcSpan = lastAppearance - firstAppearance + 1;

      // Add narrative arc information
      character.arcSpan = arcSpan;
      character.appearanceCount = appearances.length;

      // Determine if the character has a continuous presence or sporadic appearances
      character.presencePattern =
        appearances.length === arcSpan ? "continuous" : "intermittent";
    }

    delete character.firstAppearance;
    delete character.lastAppearance;
  });

  // Calculate relationship arcs
  allRelationships.forEach((relationship) => {
    const appearances = relationship.chunkAppearances || [];
    delete relationship.chunkAppearances;

    // Calculate relationship development
    if (appearances.length > 0) {
      const firstAppearance = relationship.firstAppearance;
      const lastAppearance = relationship.lastAppearance;
      const arcSpan = lastAppearance - firstAppearance + 1;

      // Add relationship development information
      relationship.arcSpan = arcSpan;
      relationship.appearanceCount = appearances.length;

      // Determine if the relationship has a continuous presence or sporadic appearances
      relationship.developmentPattern =
        appearances.length === arcSpan ? "continuous" : "intermittent";
    }

    delete relationship.firstAppearance;
    delete relationship.lastAppearance;
  });

  return {
    characters: allCharacters,
    relationships: allRelationships,
  };
}

// Enhanced final refinement function with better prompts
async function enhancedRefineFinalResults(
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
Your task is to refine this data and CRUCIALLY to infer ALL missing relationships between characters based on their descriptions.

REFINEMENT GUIDELINES:

FOR CHARACTERS:
1. Create rich, narrative-focused character profiles that capture:
   - Their complete arc across the story
   - Key actions and decisions that define them
   - Relationships that shape their development
   - Motivations and internal conflicts
   - Transformation throughout the narrative
   - Thematic significance

2. Technical improvements:
   - Eliminate redundancies in character descriptions
   - Ensure character descriptions focus on narrative actions and development
   - Standardize importance levels (major/supporting/minor) based on mentions, arc span, and narrative impact
   - Verify character names use their most formal, complete form
   - Remove duplicate aliases
   - Improve readability by organizing description in chronological order
   
3. For each major character, include:
   - A clear introduction of who they are
   - Key relationships that define them
   - Their main conflict or struggle
   - How they change throughout the narrative
   - Their final state or resolution

FOR RELATIONSHIPS:
1. Create comprehensive relationship analyses that include:
   - How the relationship evolves over the course of the narrative
   - Key turning points or moments that define the relationship
   - Power dynamics and how they shift
   - Thematic significance of the relationship
   - Impact on both characters and the wider narrative

2. RELATIONSHIP INFERENCE - THIS IS CRITICAL:
   - You MUST thoroughly review each character description for explicit and implicit relationships
   - For EVERY pair of major characters, evaluate if a relationship exists or should exist
   - After reading character descriptions, create a comprehensive list of ALL possible relationships
   - Do NOT rely solely on the relationships already provided - many are missing
   - Be especially thorough with characters who are mentioned in each other's descriptions
   - Include adversarial, familial, political, and social relationships even if not directly stated

3. For family relationships, infer connections like:
   - If A is "brother of B" and C is "son of B", then A is C's uncle
   - If A and B are siblings, and C is A's child, and D is B's child, then C and D are cousins
   - If A is married to B, and C is B's sibling, then A and C are in-laws
   - If A is married to B, and C is B's child from a previous relationship, then A is C's step-parent

4. For political relationships, infer connections like:
   - If A is king, and B is a courtier, then they have a ruler-subject relationship
   - If A is advisor to the king, and B is a foreign ambassador, they have a political relationship
   - If A and B are both knights or nobles, they have a peer relationship

5. For adversarial relationships, infer connections like:
   - If A killed B's father, they have an antagonistic relationship
   - If A and B are both pursuing the throne, they are rivals
   - If A is plotting against B, they are enemies or conspirators

6. Strictly separate relationship information into two clear components:
   
   - TYPE: ONLY the objective structural relationship(s). These are factual, social positions or connections that would appear on a family tree, court hierarchy, or social network diagram:
     * Family: "father-son", "uncle-nephew", "siblings", "cousins"
     * Political: "king-subject", "ruler-heir", "rival-princes", "allies"
     * Social: "friends", "lovers", "neighbors", "classmates"
     * Professional: "master-servant", "teacher-student", "employer-employee"
     
     TYPE must never include emotional qualities or dynamic states.
     
     EXAMPLES OF CORRECT TYPES:
     ✓ "uncle-nephew + king-subject" (Claudius-Hamlet)
     ✓ "prince-prince + rival-heirs" (Hamlet-Fortinbras)
     ✓ "courtiers + classmates" (Rosencrantz-Guildenstern)
     
     EXAMPLES OF INCORRECT TYPES:
     ✗ "friends-turned-enemies" (emotional journey, not structural)
     ✗ "allies + admirer" ("admirer" is an emotional state)
     ✗ "co-conspirators" (a role/action, not a structural position)
   
   - STATUS: The emotional or dynamic state of the relationship:
     * Emotional states: "loving", "antagonistic", "vengeful", "loyal", "distrustful"
     * Dynamic patterns: "complicated", "deteriorating", "strengthening"
     * Relationship journey: "friends-turned-enemies", "reluctant-allies-becoming-friends"
     
     STATUS should capture how characters feel about each other and how their relationship evolves.

7. ANALYZE NARRATIVE PARALLELS AND SYMMETRIES:
   - Identify characters with parallel roles or journeys (e.g., sons avenging fathers)
   - Recognize foil relationships (characters who contrast each other)
   - Note characters who serve similar narrative functions
   
8. ENSURE RELATIONSHIP COMPLETENESS (CRITICAL):
   - EVERY major character should have defined relationships with ALL other major characters they interact with
   - Create a matrix of all major characters and check that relationships are defined between them
   - For major antagonists and protagonists, ALWAYS define their relationship even if indirect
   - Include relationships that might not involve direct interaction but are narratively important
   - Do not limit yourself to relationships explicitly mentioned in the text

9. Make relationship descriptions informative by explaining:
   - How the relationship evolves over time 
   - Key events that transform the relationship
   - How each dimension of the relationship affects the characters and story
   - How the multiple relationship types interact or conflict with each other
   - The narrative significance of the relationship

10. Assign relationship strength (1-10) based on:
    - How central the relationship is to the main plot
    - The emotional intensity of the relationship
    - How much the relationship affects character decisions
    - The narrative space devoted to the relationship

The refined output should be in this JSON structure:
{
  "characters": [
    {
      "name": "Character's most complete formal name",
      "aliases": ["Alternative name 1", "Title", "Nickname", etc.],
      "description": "Rich, narrative-focused description capturing character arc, development, and significance",
      "importance": "major/supporting/minor",
      "mentions": total number of mentions across the text
    }
  ],
  "relationships": [
    {
      "source": "Character A's most complete formal name",
      "target": "Character B's most complete formal name",
      "type": "structural relationship type only (e.g., 'uncle-nephew + king-subject')",
      "status": "emotional or dynamic state of the relationship",
      "description": "Comprehensive description of the relationship, its evolution, and narrative significance",
      "strength": narrative importance of this relationship (1-10)
    }
  ]
}

CRITICAL INSTRUCTION:
After completing your initial analysis, REVIEW all major characters (those marked as "major" importance) and ensure that EACH major character has at least one relationship defined with EVERY other major character where any relationship could reasonably exist. If relationships are missing, add them based on character descriptions and narrative context.

Return ONLY the JSON object with no additional text.
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

// Main analysis function with progressive context enhancement and explicit relationship inference
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

    // Process chunks with progressive context enhancement
    const chunkResults = [];
    let cumulativeResults = { characters: [], relationships: [] };

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);

      // Pass accumulated results to inform the current chunk analysis
      const result = await processChunk(
        client,
        modelName,
        chunks[i],
        i,
        chunks.length,
        title,
        author,
        cumulativeResults // Pass accumulated knowledge
      );

      // Print out the results from each chunk
      console.log(`\n=== CHUNK ${i + 1} RESULTS ===`);
      console.log(`Characters found: ${result.characters.length}`);
      console.log(`Relationships found: ${result.relationships.length}`);
      console.log(`=== END OF CHUNK ${i + 1} RESULTS ===\n`);

      chunkResults.push(result);

      // Incrementally merge to build cumulative knowledge
      // This ensures each subsequent chunk has context from all previous chunks
      cumulativeResults = improvedMerge(chunkResults.slice(0, i + 1));

      // Add delay between chunks
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));
      }
    }

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
    const finalResults = {
      title,
      author,
      characters: resultWithInferredRelationships.characters,
      relationships: resultWithInferredRelationships.relationships,
      meta: {
        consistencyKey,
        chunksProcessed: chunks.length,
        characterCount: resultWithInferredRelationships.characters.length,
        relationshipCount: resultWithInferredRelationships.relationships.length,
        analysisDate: new Date().toISOString(),
      },
    };

    return finalResults;
  } catch (error) {
    console.error(`Error analyzing book with ${options.provider}:`, error);
    throw new Error(`Failed to analyze book content: ${error.message}`);
  }
}

// Add a dedicated relationship inference function
async function inferRelationships(client, modelName, results, title, author) {
  // Extract only major characters for relationship matrix
  const majorCharacters = results.characters.filter(
    (c) => c.importance === "major"
  );

  // Create a list of existing relationship pairs for quick lookup
  const existingRelationships = new Set();
  results.relationships.forEach((rel) => {
    const pair = [rel.source.toLowerCase(), rel.target.toLowerCase()]
      .sort()
      .join("|");
    existingRelationships.add(pair);
  });

  // Create a system prompt focused solely on relationship inference
  const systemPrompt = `
You are a literary analysis expert analyzing "${title}" by ${author}".

I will provide you with character and relationship data that has already been analyzed.
Your sole task is to identify MISSING relationships between major characters.

For each pair of major characters that does NOT already have a defined relationship, determine:
1. Whether any relationship exists or should exist based on the narrative context
2. The structural relationship type (e.g., king-subject, rivals, friends)
3. The emotional/dynamic state of their relationship
4. A description of how they relate to each other in the narrative
5. The strength of this relationship (1-10)

GUIDELINES:

1. Consider the following types of relationships:
   - Direct interactions described in character profiles
   - Indirect connections through other characters
   - Parallel or contrasting narrative functions
   - Political or power dynamics implied by their roles
   - Family connections that can be logically inferred
   - Relationships based on shared experiences or goals
   
2. Focus particularly on:
   - Major characters who would logically interact but lack a defined relationship
   - Characters who are mentioned in each other's descriptions
   - Characters who have familial or political connections to the same third parties
   - Characters serving similar or opposing functions in the narrative

3. For EACH identified missing relationship, provide:
   - SOURCE: The first character's name
   - TARGET: The second character's name
   - TYPE: Structural relationship (e.g., "rivals", "king-subject", "in-laws")
   - STATUS: Emotional/dynamic state (e.g., "distrustful", "respectful distance")
   - DESCRIPTION: A substantive description of their relationship
   - STRENGTH: A rating from 1-10 of the relationship's narrative importance

4. Be thorough - ensure ALL major character pairs have been considered

Respond with a JSON object containing ONLY the new relationships you've identified:
{
  "newRelationships": [
    {
      "source": "Character A's name",
      "target": "Character B's name",
      "type": "structural relationship type",
      "status": "emotional or dynamic state",
      "description": "Comprehensive description of the relationship",
      "strength": narrative importance (1-10)
    }
  ]
}

If there are no missing relationships to add, return an empty array.
`;

  const resultsJson = JSON.stringify(results, null, 2);

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here are the current analysis results for "${title}" by ${author}. Please identify any missing relationships between major characters:\n\n${resultsJson}`,
        },
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
      const inferredRelations = JSON.parse(jsonContent);
      console.log(
        `Identified ${
          inferredRelations.newRelationships?.length || 0
        } new relationships`
      );

      // Combine the original and new relationships
      if (
        inferredRelations.newRelationships &&
        inferredRelations.newRelationships.length > 0
      ) {
        results.relationships = [
          ...results.relationships,
          ...inferredRelations.newRelationships,
        ];
      }

      return results;
    } catch (parseError) {
      console.warn(
        "JSON parse error in relationship inference:",
        parseError.message
      );
      console.warn("Attempted to parse:", jsonContent);
      return results; // Return original results if parsing fails
    }
  } catch (error) {
    console.warn("Error in relationship inference:", error.message);
    return results; // Return original results on error
  }
}

module.exports = {
  analyzeBook,
};
