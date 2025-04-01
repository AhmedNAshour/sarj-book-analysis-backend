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
  const allInteractions = [];

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

    // Process interactions
    if (result.interactions) {
      result.interactions.forEach((interaction) => {
        // Add chunk index to the interaction for context tracking
        //Check if interaction does not already exist in allInteractions, using interaction.description as the id
        if (
          !allInteractions.some(
            (i) => i.description === interaction.description
          )
        ) {
          interaction.chunkIndex = chunkIndex;
          allInteractions.push(interaction);
        }
      });
    }
  });

  // Calculate character arcs
  allCharacters.forEach(processCharacterArcs);

  // Calculate relationship arcs
  allRelationships.forEach(processRelationshipArcs);

  // Update relationship with interaction counts
  updateRelationshipsWithInteractionCounts(allRelationships, allInteractions);

  return {
    characters: allCharacters,
    relationships: allRelationships,
    interactions: allInteractions,
  };
}

/**
 * Updates relationship objects with interaction counts based on the interactions array
 * @param {Array} relationships - Array of relationship objects
 * @param {Array} interactions - Array of interaction objects
 */
function updateRelationshipsWithInteractionCounts(relationships, interactions) {
  // Create a map to count interactions between character pairs
  const interactionCountMap = new Map();

  // Count interactions for each character pair
  interactions.forEach((interaction) => {
    // Skip interactions with less than 2 characters
    if (!interaction.characters || interaction.characters.length < 2) {
      return;
    }

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
  relationships.forEach((relationship) => {
    const source = relationship.source.toLowerCase();
    const target = relationship.target.toLowerCase();
    const key = `${source}|${target}`;

    // If we have interaction count data, use it to update numberOfInteractions
    // Otherwise, keep whatever value is already in the relationship
    const interactionCount = interactionCountMap.get(key);
    if (interactionCount !== undefined) {
      relationship.numberOfInteractions = interactionCount;
    } else if (!relationship.numberOfInteractions) {
      relationship.numberOfInteractions = 0;
    }

    // If there's a strength field and no numberOfInteractions field,
    // move the value to numberOfInteractions and delete strength
    if (
      relationship.strength !== undefined &&
      relationship.numberOfInteractions === undefined
    ) {
      relationship.numberOfInteractions = relationship.strength;
      delete relationship.strength;
    }
  });
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

    // Ensure we're using numberOfInteractions instead of strength
    if (
      relationship.strength !== undefined &&
      relationship.numberOfInteractions === undefined
    ) {
      relationship.numberOfInteractions = relationship.strength;
      delete relationship.strength;
    } else if (relationship.numberOfInteractions === undefined) {
      relationship.numberOfInteractions = 0;
    }

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

  // Update numberOfInteractions (formerly strength)
  if (relationship.numberOfInteractions !== undefined) {
    if (existingRel.numberOfInteractions === undefined) {
      existingRel.numberOfInteractions = 0;
    }
    existingRel.numberOfInteractions += relationship.numberOfInteractions;
  } else if (relationship.strength !== undefined) {
    // Handle the legacy strength field
    if (existingRel.numberOfInteractions === undefined) {
      existingRel.numberOfInteractions = 0;
    }
    existingRel.numberOfInteractions += relationship.strength;
  }

  // Remove any leftover strength field
  if (existingRel.strength !== undefined) {
    delete existingRel.strength;
  }

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

  // Normalize interaction character names
  if (results.interactions && Array.isArray(results.interactions)) {
    results.interactions.forEach((interaction) => {
      if (interaction.characters && Array.isArray(interaction.characters)) {
        interaction.characters = interaction.characters.map((charName) => {
          const lowerName = charName.toLowerCase();
          const canonicalName = nameVariationMap.get(lowerName);
          return canonicalName || charName; // Use canonical name if available, otherwise keep original
        });
      }
    });
  }

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
async function refineResults(client, modelName, rawResults, title, author) {
  // Store the interaction counts before refinement to ensure they're preserved
  const interactionCounts = new Map();
  if (rawResults.relationships) {
    rawResults.relationships.forEach((rel) => {
      const key = `${rel.source.toLowerCase()}|${rel.target.toLowerCase()}`;
      if (rel.numberOfInteractions !== undefined) {
        interactionCounts.set(key, rel.numberOfInteractions);
      } else if (rel.strength !== undefined) {
        // Handle legacy data that might still use strength
        interactionCounts.set(key, rel.strength);
      }
    });
  }

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
      { maxTokens: 80000 }
    );

    const jsonContent = extractJSON(content);
    const parsedResults = parseOrReturnOriginal(
      jsonContent,
      rawResults,
      "refinement"
    );

    // Restore interaction counts to refined relationships
    if (parsedResults.relationships) {
      parsedResults.relationships.forEach((rel) => {
        const key = `${rel.source.toLowerCase()}|${rel.target.toLowerCase()}`;
        const count = interactionCounts.get(key);
        if (count !== undefined) {
          rel.numberOfInteractions = count;
        }
      });
    }

    // Restore interactions to refined results
    if (parsedResults.interactions) {
      parsedResults.interactions = rawResults.interactions;
    }

    // Normalize character names to ensure consistency
    return normalizeCharacterNames(parsedResults);
  } catch (error) {
    console.warn("Error in final refinement:", error.message);
    return normalizeCharacterNames(rawResults); // Normalize even if refinement failed
  }
}

module.exports = {
  mergeResults,
  refineResults,
  normalizeCharacterNames,
};
