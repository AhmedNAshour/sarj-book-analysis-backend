// results-processor.js
const { extractJSON } = require("./content-processor");
const { generateCompletion } = require("./llm-client");
const prompts = require("./prompts");

/**
 * Merges characters and relationships from multiple chunks
 * @param {Array} chunkResults - Results from processed chunks
 * @returns {Object} Merged characters and relationships
 */
function mergeResults(chunkResults) {
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

  // Merge roles with deduplication
  if (character.roles && Array.isArray(character.roles)) {
    if (!existingChar.roles || !Array.isArray(existingChar.roles)) {
      existingChar.roles = [];
    }

    character.roles.forEach((role) => {
      // Only add roles that don't already exist (case-insensitive check)
      if (
        !existingChar.roles.some(
          (existingRole) => existingRole.toLowerCase() === role.toLowerCase()
        )
      ) {
        existingChar.roles.push(role);
      }
    });
  }

  // Append new actions (maintaining chronological order)
  if (character.actions && Array.isArray(character.actions)) {
    if (!existingChar.actions || !Array.isArray(existingChar.actions)) {
      existingChar.actions = [];
    }
    character.actions.forEach((action) => {
      if (!existingChar.actions.includes(action)) {
        existingChar.actions.push(action);
      }
    });
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
      //TODO: Figure out if LLM can handle this better, or at least make sure descriptions are full from each chunk
      // existingChar.description += ` In another section: ${character.description}`;
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
  // Create a directional relationship key that preserves source-target direction
  const source = relationship.source.toLowerCase();
  const target = relationship.target.toLowerCase();
  const directionKey = `${source}|${target}`;
  const typeKey = relationship.type;
  const key = `${directionKey}`;

  // Check if we already have this directional relationship
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

  // Update strength (only for the specific direction)
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

  //Check if current type is different from existing type, if so, add both to existingRel.types, type is a string
  if (relationship.type && !existingRel.type.includes(relationship.type)) {
    existingRel.type = `${existingRel.type}, ${relationship.type}`;
  }

  // Handle description field
  if (relationship.description) {
    if (!existingRel.description) {
      existingRel.description = relationship.description;
    } else {
      //TODO: Figure out if LLM can handle this better, or at least make sure descriptions are full from each chunk
      // Concatenate the descriptions
      // existingRel.description += ` Later information: ${relationship.description}`;
    }
  }

  // Handle evidence field
  if (relationship.evidence) {
    if (!existingRel.evidence) {
      existingRel.evidence = relationship.evidence;
    } else {
      //TODO: Figure out if LLM can handle this better, or at least make sure descriptions are full from each chunk
      // Concatenate the evidence
      // existingRel.evidence += ` Later evidence: ${relationship.evidence}`;
    }
  }
}

/**
 * Processes character arcs to add metadata
 */
function processCharacterArcs(character) {
  // Remove all tracking data that's no longer needed
  delete character.chunkAppearances;
  delete character.firstAppearance;
  delete character.lastAppearance;
}

/**
 * Processes relationship arcs to add metadata
 */
function processRelationshipArcs(relationship) {
  // Remove all tracking data that's no longer needed
  delete relationship.chunkAppearances;
  delete relationship.firstAppearance;
  delete relationship.lastAppearance;
}

/**
 * Normalizes character names in the relationships to ensure consistency
 * and updates aliases for characters that are referenced by alternate names
 * @param {Object} results - The results object containing characters and relationships
 * @returns {Object} The results with normalized character names
 */
function normalizeCharacterNames(results) {
  if (!results.characters || !results.relationships) {
    return results;
  }

  // Create a map of characters by their canonical name
  const characterMap = new Map();
  results.characters.forEach((character) => {
    characterMap.set(character.name.toLowerCase(), character);
  });

  // Create a map of all possible name variations (including aliases) to canonical names
  const nameVariationMap = new Map();
  results.characters.forEach((character) => {
    // Map canonical name
    nameVariationMap.set(character.name.toLowerCase(), character.name);

    // Map aliases
    if (character.aliases && Array.isArray(character.aliases)) {
      character.aliases.forEach((alias) => {
        nameVariationMap.set(alias.toLowerCase(), character.name);
      });
    }
  });

  // Normalize relationship names and collect new aliases
  const aliasUpdates = new Map();

  results.relationships.forEach((relationship) => {
    // Check source name
    const sourceLower = relationship.source.toLowerCase();
    const canonicalSource = nameVariationMap.get(sourceLower);

    if (canonicalSource && canonicalSource !== relationship.source) {
      // Add this variant as an alias if it's not already in aliases
      const sourceChar = characterMap.get(canonicalSource.toLowerCase());

      // Add to alias updates to process after loop
      if (!aliasUpdates.has(canonicalSource.toLowerCase())) {
        aliasUpdates.set(canonicalSource.toLowerCase(), new Set());
      }
      aliasUpdates.get(canonicalSource.toLowerCase()).add(relationship.source);

      // Update relationship source to canonical name
      relationship.source = canonicalSource;
    }

    // Check target name
    const targetLower = relationship.target.toLowerCase();
    const canonicalTarget = nameVariationMap.get(targetLower);

    if (canonicalTarget && canonicalTarget !== relationship.target) {
      // Add this variant as an alias
      const targetChar = characterMap.get(canonicalTarget.toLowerCase());

      // Add to alias updates to process after loop
      if (!aliasUpdates.has(canonicalTarget.toLowerCase())) {
        aliasUpdates.set(canonicalTarget.toLowerCase(), new Set());
      }
      aliasUpdates.get(canonicalTarget.toLowerCase()).add(relationship.target);

      // Update relationship target to canonical name
      relationship.target = canonicalTarget;
    }
  });

  // Apply alias updates
  aliasUpdates.forEach((aliasSet, characterNameLower) => {
    const character = characterMap.get(characterNameLower);
    if (character) {
      // Initialize aliases array if it doesn't exist
      if (!character.aliases) {
        character.aliases = [];
      }

      // Add new aliases that don't already exist
      aliasSet.forEach((alias) => {
        if (!character.aliases.includes(alias) && alias !== character.name) {
          character.aliases.push(alias);
        }
      });
    }
  });

  return results;
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
        // Ensure new relationships have both fields but don't copy between them
        const normalizedRelationships = inferredRelations.newRelationships.map(
          (rel) => {
            // Clone the relationship to avoid modifying the original
            const normalizedRel = { ...rel };

            // Set empty string for missing fields but don't copy between them
            if (!normalizedRel.description) {
              normalizedRel.description = "";
            }

            if (!normalizedRel.evidence) {
              normalizedRel.evidence = "";
            }

            return normalizedRel;
          }
        );

        results.relationships = [
          ...results.relationships,
          ...normalizedRelationships,
        ];
      }

      // Apply name normalization to ensure consistency
      return normalizeCharacterNames(results);
    } catch (parseError) {
      console.warn(
        "JSON parse error in relationship inference:",
        parseError.message
      );
      console.warn("Attempted to parse:", jsonContent);
      // Return original results with name normalization applied
      return normalizeCharacterNames(results);
    }
  } catch (error) {
    console.warn("Error in relationship inference:", error.message);
    // Return original results with name normalization applied
    return normalizeCharacterNames(results);
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
      { maxTokens: 20000 }
    );

    const jsonContent = extractJSON(content);
    const parsedResults = parseOrReturnOriginal(
      jsonContent,
      rawResults,
      "refinement"
    );

    // Normalize character names to ensure consistency
    return normalizeCharacterNames(parsedResults);
  } catch (error) {
    console.warn("Error in final refinement:", error.message);
    return normalizeCharacterNames(rawResults); // Normalize even if refinement failed
  }
}

module.exports = {
  mergeResults,
  enhancedRefineFinalResults,
  inferRelationships,
  normalizeCharacterNames,
};
