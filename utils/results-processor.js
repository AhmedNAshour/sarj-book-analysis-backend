// results-processor.js
const { extractJSON } = require("./content-processor");
const { generateCompletion } = require("./llm-client");
const prompts = require("./prompts");

/**
 * Merges characters and relationships from multiple chunks
 * @param {Array} chunkResults - Results from processed chunks
 * @returns {Object} Merged characters and relationships
 */
function improvedMerge(chunkResults) {
  // Maps to track unique characters and relationships
  const characterMap = new Map();
  const relationshipMap = new Map();

  // Combine all characters and relationships from chunk results
  const allCharacters = [];
  const allRelationships = [];

  // Process each chunk result
  chunkResults.forEach((result, chunkIndex) => {
    // Process characters
    if (result.characters) {
      result.characters.forEach((character) => {
        mergeCharacter(allCharacters, characterMap, character, chunkIndex);
      });
    }

    // Process relationships
    if (result.relationships) {
      result.relationships.forEach((relationship) => {
        mergeRelationship(
          allRelationships,
          relationshipMap,
          relationship,
          chunkIndex
        );
      });
    }
  });

  // Calculate character arcs
  allCharacters.forEach(processCharacterArcs);

  // Calculate relationship arcs
  allRelationships.forEach(processRelationshipArcs);

  return {
    characters: allCharacters,
    relationships: allRelationships,
  };
}

/**
 * Merges a character into the existing character map
 */
function mergeCharacter(allCharacters, characterMap, character, chunkIndex) {
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
    updateExistingCharacter(existingChar, character, chunkIndex);
  }
}

/**
 * Updates an existing character with new information
 */
function updateExistingCharacter(existingChar, character, chunkIndex) {
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

  // Append new description information
  if (character.description) {
    if (!existingChar.description) {
      existingChar.description = character.description;
    } else {
      // Just concatenate the descriptions - final refinement will handle deduplication
      existingChar.description += ` In another section: ${character.description}`;
    }
  }
}

/**
 * Merges a relationship into the existing relationship map
 */
function mergeRelationship(
  allRelationships,
  relationshipMap,
  relationship,
  chunkIndex
) {
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
    updateExistingRelationship(existingRel, relationship, chunkIndex);
  }
}

/**
 * Updates an existing relationship with new information
 */
function updateExistingRelationship(existingRel, relationship, chunkIndex) {
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

  // Append evidence information
  if (relationship.evidence) {
    if (!existingRel.evidence) {
      existingRel.evidence = relationship.evidence;
    } else {
      // Just concatenate the evidence - final refinement will handle deduplication
      existingRel.evidence += ` Later evidence: ${relationship.evidence}`;
    }
  }
}

/**
 * Processes character arcs to add metadata
 */
function processCharacterArcs(character) {
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
}

/**
 * Processes relationship arcs to add metadata
 */
function processRelationshipArcs(relationship) {
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
}

/**
 * Refines final results using the LLM
 */
async function enhancedRefineFinalResults(
  client,
  modelName,
  rawResults,
  title,
  author
) {
  // Convert raw results to JSON string for the prompt
  const resultsJson = JSON.stringify(rawResults, null, 2);

  const systemPrompt = prompts.createFinalRefinementPrompt(title, author);
  const userPrompt = `Here are the raw results from analyzing "${title}" by ${author}". Please refine them according to the guidelines:\n\n${resultsJson}`;

  try {
    const content = await generateCompletion(
      client,
      modelName,
      systemPrompt,
      userPrompt,
      { maxTokens: 8000 }
    );

    const jsonContent = extractJSON(content);
    return parseOrReturnOriginal(jsonContent, rawResults, "refinement");
  } catch (error) {
    console.warn("Error in final refinement:", error.message);
    return rawResults; // Return original results on error
  }
}

/**
 * Infers relationships between characters
 */
async function inferRelationships(client, modelName, results, title, author) {
  // Create a list of existing relationship pairs for quick lookup
  const existingRelationships = new Set();
  results.relationships.forEach((rel) => {
    const pair = [rel.source.toLowerCase(), rel.target.toLowerCase()]
      .sort()
      .join("|");
    existingRelationships.add(pair);
  });

  const systemPrompt = prompts.createRelationshipInferencePrompt(title, author);
  const resultsJson = JSON.stringify(results, null, 2);
  const userPrompt = `Here are the current analysis results for "${title}" by ${author}". Please identify any missing relationships between major characters:\n\n${resultsJson}`;

  try {
    const content = await generateCompletion(
      client,
      modelName,
      systemPrompt,
      userPrompt
    );
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

/**
 * Helper function to parse JSON or return original data on error
 */
function parseOrReturnOriginal(jsonContent, originalData, context) {
  try {
    return JSON.parse(jsonContent);
  } catch (parseError) {
    console.warn(`JSON parse error in ${context}:`, parseError.message);
    console.warn("Attempted to parse:", jsonContent);
    return originalData; // Return original data if parsing fails
  }
}

module.exports = {
  improvedMerge,
  enhancedRefineFinalResults,
  inferRelationships,
};
