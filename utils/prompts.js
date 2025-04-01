// prompts.js - Improved version
const TEMPLATES = {
  // First chunk prompt focuses on establishing baseline character and relationship data
  FIRST_CHUNK_EXTRACTION: `
  GUIDELINES FOR CHARACTER IDENTIFICATION IN FIRST CHUNK:

1. Identify each unique character who appears in this chunk
2. Use the most complete/formal name for each character (e.g., "King Claudius" not just "King" or "Claudius")
3. If a character is referred to by multiple names or titles, list these as aliases
4. Count exact mentions of ALL references to the character (including pronouns when clearly referring to them)
5. For character descriptions, focus on:
   - Key personal traits and attributes revealed in this chunk
   - Emotional states, motivations, and inner conflicts shown
   - Their impact on other characters and the narrative
   - Any historical background or context revealed about them

6. For character roles, identify:
   - Narrative functions (protagonist, antagonist, mentor, foil, etc.)
   - Social/political positions (king, servant, soldier, advisor, etc.)
   - Familial roles (father, daughter, uncle, etc.)
   - Any other significant functions in the story

7. For character actions, record:
   - Significant events they initiate or participate in
   - Key decisions they make and their consequences
   - Important interactions with other characters
   - Notable dialogues or speeches they deliver
   - Pivotal moments in their development

GUIDELINES FOR RELATIONSHIPS IN FIRST CHUNK:

1. Create BIDIRECTIONAL RELATIONSHIPS between characters - THIS IS CRITICAL:
   - For each pair of characters (A and B) who interact or are mentioned together, create TWO distinct relationship entries:
     * One showing how A perceives and acts toward B
     * Another showing how B perceives and acts toward A
   - Even if one direction is less evident, infer it based on context
   - NEVER leave a relationship unidirectional

2. For EACH direction of a relationship, capture:
   - How the source character views the target character
   - The source character's feelings and attitudes toward the target
   - Actions the source takes that affect the target
   - The power dynamic between them from source to target
   - What the source character wants from or fears about the target

3. Strictly separate relationship information into two components:
   - TYPE: The structural relationship (e.g., father-son, mentor-student, neighbors, king-subject)
   - STATUS: The emotional or perceptual state FROM SOURCE TO TARGET (e.g., distrustful, admiring, vengeful)

4. AGGRESSIVELY INFER implied directional relationships:
   - If A is described as "father of B" and C is described as "father of D", consider if B and D might be cousins
   - If A is "brother of B" and C is "son of B", then A is C's uncle
   - If A is king and B is a noble, they have a king-subject relationship
   - If A loves B, but B loves C, then A and C might have a rivalry
   - Pay special attention to family connections that might be implicit in descriptions

5. For relationship TYPE, focus exclusively on structural connections:
   - Family: "father-son", "uncle-nephew", "siblings", "cousins"
   - Political: "king-subject", "ruler-heir", "rival-princes"
   - Social: "friends", "lovers", "neighbors"
   - Professional: "master-servant", "teacher-student"
   
   Use compound types when appropriate (e.g., "uncle-nephew + king-subject")
   
6. For relationship STATUS, focus on the source's perception of and attitude toward the target:
   - Emotional states: "loving", "antagonistic", "vengeful", "loyal", "distrustful"
   - Perceptual attitudes: "sees as threatening", "perceives as ally", "views with suspicion"
   - Dynamic patterns: "growing more suspicious of", "beginning to trust", "increasingly fearful of"

7. BE EXHAUSTIVE - find ALL possible directional relationships:
   - If two major characters both appear in this chunk, they MUST have relationships in both directions
   - Even if characters don't directly interact, consider their perceptions of each other
   - Think about how each character's actions or decisions might affect or reveal their view of other characters

Respond ONLY with a JSON object in the following structure:
{
  "characters": [
    {
      "name": "Character's most complete formal name",
      "aliases": ["Alternative name 1", "Title", "Nickname", etc.],
      "description": "Detailed narrative-focused description including key attributes, development, and significance to plot",
      "roles": ["Primary narrative role (protagonist, antagonist, etc.)", "Social/political position", "Familial role", "Other significant functions"],
      "actions": ["Specific significant action taken by or involving the character", "Another key action or event", "etc."],
      "importance": "major/minor/supporting",
      "mentions": exact number of times the character is referenced
    }
  ],
  "relationships": [
    {
      "source": "Character A's most complete formal name",
      "target": "Character B's most complete formal name",
      "type": "structural relationship type only (e.g., 'uncle-nephew + king-subject')",
      "status": "source's perception of and attitude toward target",
      "description": "Narrative overview of how source perceives and relates to target",
      "evidence": "Specific examples and quotes from this chunk showing how source perceives and acts toward target",
      "strength": number of interactions or references to this directional relationship in this chunk
    },
    {
      "source": "Character B's most complete formal name",
      "target": "Character A's most complete formal name",
      "type": "structural relationship type only (e.g., 'subject-king + nephew-uncle')",
      "status": "target's perception of and attitude toward source",
      "description": "Narrative overview of how target perceives and relates to source",
      "evidence": "Specific examples and quotes from this chunk showing how target perceives and acts toward source",
      "strength": number of interactions or references to this directional relationship in this chunk
    }
  ]
}

IMPORTANT:
- Be precise about character identity
- For character descriptions, focus on NARRATIVE ACTIONS and DEVELOPMENT, not just attributes
- ALWAYS create SEPARATE relationship entries for EACH DIRECTION between character pairs
- Ensure the status reflects the SOURCE character's perception of the TARGET
- Include relationships for ALL character pairs where any relationship can be inferred
- Return ONLY the JSON object with no additional text
`,

  // Subsequent chunk prompt with emphasis on progressive development
  SUBSEQUENT_CHUNK_EXTRACTION: `
  GUIDELINES FOR CHARACTER CONTINUATION IN THIS CHUNK:

1. EVOLVE CHARACTERS FROM PREVIOUS CHUNKS:
   - When you encounter a character from previous chunks:
     * MAINTAIN their name, aliases, and established importance
     * EVOLVE their description with new traits and narrative developments
     * EXPAND their roles list with any new or evolved roles
     * APPEND to their actions list with new actions from this chunk (without duplicating)
     * UPDATE their mention count to include mentions in this chunk
     * DEEPEN your understanding of their motivations, conflicts, and significance
   
2. ADD NEW CHARACTERS:
   - For new characters not previously encountered:
     * Establish their formal name, aliases, importance, and initial description
     * Connect them to existing characters where relationships can be inferred
     * Situate them within the narrative context established so far

3. For EACH character - new or continuing - develop a NARRATIVE-FOCUSED description that:
   - Shows how they have EVOLVED since previous chunks (for continuing characters)
   - Captures their actions and impacts within the narrative
   - Details their key relationships with other characters
   - Explains their motivations, conflicts, and internal struggles
   - Situates them within the ongoing plot

4. For character importance levels:
   - MAJOR: Central to the narrative with significant actions and decisions
   - SUPPORTING: Regular presence with influence on major characters or plot
   - MINOR: Limited appearance with minimal impact on major narrative arcs

GUIDELINES FOR RELATIONSHIP EVOLUTION IN THIS CHUNK:

1. EVOLVE EXISTING RELATIONSHIPS:
   - For each previously established relationship:
     * MAINTAIN the relationship type (structural connection)
     * UPDATE the relationship status if it has changed in this chunk
     * EXPAND the description to include new developments
     * ADD new evidence from this chunk
     * ADJUST the strength based on new interactions
   
2. COMPLETE BIDIRECTIONAL RELATIONSHIPS:
   - CRITICAL: For EVERY relationship found in EITHER previous chunks OR this chunk:
     * ENSURE both directions are fully defined
     * If you find A→B, you MUST also define B→A
     * If one direction is less evident, make your best inference
     * NEVER leave any relationship unidirectional
   
3. ADD NEW RELATIONSHIPS:
   - When new characters appear or new connections emerge:
     * Create BIDIRECTIONAL relationships between them and relevant existing characters
     * Infer connections based on narrative context and character descriptions
     * Connect new characters to the existing relationship network

4. EVOLVE each relationship description to show:
   - How the relationship has changed since previous chunks
   - Key moments or interactions in this chunk that affect the relationship
   - Shifts in power dynamics or emotional attitudes
   - The impact of the relationship on both characters and the broader narrative

5. RELATIONSHIP CONSISTENCY REQUIREMENTS:
   - EVERY major character MUST have defined relationships with ALL other major characters
   - EVERY relationship MUST be bidirectional (if A→B exists, B→A must also exist)
   - ALL major character pairs should have relationships defined even if they haven't directly interacted

6. ALWAYS REMEMBER TO:
   - CREATE separate entries for BOTH DIRECTIONS of every relationship
   - ENSURE relationship types reflect structural connections only
   - ENSURE relationship status captures emotional/perceptual states only
   - PROVIDE rich, narrative-focused descriptions that show evolution over time
   - INCLUDE specific evidence from the current chunk

CRITICAL INSTRUCTIONS FOR USING PREVIOUS CHUNK CONTEXT:

1. KNOWLEDGE ACCUMULATION:
   - Your analysis is CUMULATIVE - BUILD ON previous knowledge, don't replace it
   - Previous character descriptions contain valuable information - incorporate it
   - Previous relationships provide foundation - enhance them with new developments
   
2. COMPLETENESS CHECK:
   - Before finalizing, VERIFY that ALL major character pairs have BIDIRECTIONAL relationships
   - For any missing relationship direction, INFER it based on context and character descriptions
   - NEVER leave any relationship unidirectional

Respond ONLY with a JSON object in the following structure:
{
  "characters": [
    {
      "name": "Character's most complete formal name",
      "aliases": ["Alternative name 1", "Title", "Nickname", etc.],
      "description": "Evolving, narrative-focused description including previous information PLUS new developments",
      "roles": ["Updated/expanded list of narrative, social, and familial roles based on all chunks so far"],
      "actions": ["All previous actions from earlier chunks", "New actions from this chunk", "etc."],
      "importance": "major/minor/supporting",
      "mentions": updated count including mentions from this chunk
    }
  ],
  "relationships": [
    {
      "source": "Character A's most complete formal name",
      "target": "Character B's most complete formal name",
      "type": "structural relationship type only (e.g., 'uncle-nephew + king-subject')",
      "status": "source's perception of and attitude toward target, updated based on new developments",
      "description": "Evolving narrative overview of how source perceives and relates to target",
      "evidence": "Specific examples and quotes showing how source perceives and acts toward target",
      "strength": updated strength based on all interactions
    }
  ]
}

IMPORTANT:
- Create a COMPLETE bidirectional network of relationships between all major characters
- Focus on character and relationship EVOLUTION across chunks
- Return ONLY the JSON object with no additional text
`,

  // Final refinement prompt with emphasis on thorough bidirectionality
  FINAL_REFINEMENT: `
 I will provide you with raw character and relationship data extracted from the text.
Your task is to refine this data and CRUCIALLY to infer ALL missing BIDIRECTIONAL relationships between characters based on their descriptions.

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
   
4. For the roles field:
   - Organize by narrative function, social position, and familial role
   - Ensure roles reflect the character's complete journey
   - Include any changes in role throughout the narrative
   - Connect roles to thematic elements when relevant

5. For the actions field:
   - Arrange actions in chronological order
   - Include all significant plot contributions
   - Highlight actions that reveal character development
   - Ensure key relationship moments are captured
   - Include pivotal decisions and their consequences

FOR RELATIONSHIPS:
1. Create comprehensive BIDIRECTIONAL relationship analyses:
   - For EACH pair of characters, ensure BOTH directions are analyzed separately
   - Each directional relationship should capture how the source perceives and acts toward the target
   - Ensure that the perceptions and attitudes in opposite directions are distinct and accurate

2. For each directional relationship, include:
   - How the source's perception of the target evolves over the narrative
   - Key turning points that change how the source views the target
   - How the source's attitude affects their actions toward the target
   - Thematic significance of this directional relationship
   - Impact on both characters' development
   
3. Maintain BOTH description and evidence fields:
   - DESCRIPTION: A substantive narrative analysis of the relationship
   - EVIDENCE: Specific examples, quotes, or interactions from the text
   - Ensure that both fields provide complementary information
   - If one field is missing, use the other field to create appropriate content

4. BIDIRECTIONAL RELATIONSHIP INFERENCE - THIS IS CRITICAL:
   - You MUST thoroughly review each character description for explicit and implicit relationships
   - For EVERY pair of major characters, evaluate BOTH directions of their relationship
   - After reading character descriptions, create a comprehensive list of ALL possible directional relationships
   - Do NOT rely solely on the relationships already provided - many directions are missing
   - Be especially thorough with characters who are mentioned in each other's descriptions
   - Include adversarial, familial, political, and social relationships even if not directly stated

5. For family relationships, infer connections like:
   - If A is "brother of B" and C is "son of B", then A is C's uncle AND C is A's nephew
   - If A and B are siblings, and C is A's child, and D is B's child, then C and D are cousins in both directions
   - If A is married to B, and C is B's sibling, then A and C are in-laws (in both directions)
   - If A is married to B, and C is B's child from a previous relationship, then A is C's step-parent AND C is A's step-child

6. For political relationships, infer connections like:
   - If A is king, and B is a courtier, then A is B's ruler AND B is A's subject
   - If A is advisor to the king, and B is a foreign ambassador, they have political relationships in both directions
   - If A and B are both knights or nobles, they have peer relationships (in both directions)

7. For adversarial relationships, infer connections like:
   - If A killed B's father, A views B as a potential threat AND B views A with hatred
   - If A and B are both pursuing the throne, A sees B as a rival AND B sees A as an obstacle
   - If A is plotting against B, A views B as a target AND B might be suspicious of A

8. Strictly separate relationship information into two clear components:
   
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
   
   - STATUS: The source character's perception of and attitude toward the target:
     * Emotional states: "distrustful of", "vengeful toward", "loving", "loyal to", "suspicious of"
     * Perceptual attitudes: "sees as a threat", "views as an ally", "perceives as naive"
     * Dynamic patterns: "growing resentment", "increasing admiration", "developing fear"
     
     STATUS should capture how the source feels about and perceives the target.

9. ANALYZE NARRATIVE PARALLELS AND SYMMETRIES:
   - Identify characters with parallel roles or journeys (e.g., sons avenging fathers)
   - Recognize foil relationships (characters who contrast each other)
   - Note characters who serve similar narrative functions
   
10. ENSURE BIDIRECTIONAL RELATIONSHIP COMPLETENESS (CRITICAL):
   - EVERY major character should have defined relationships in BOTH directions with ALL other major characters they interact with
   - Create a matrix of all major characters and check that relationships are defined in both directions between them
   - For major antagonists and protagonists, ALWAYS define relationships in both directions even if indirect
   - Include relationships that might not involve direct interaction but are narratively important
   - Do not limit yourself to relationships explicitly mentioned in the text

11. Make directional relationship descriptions informative by explaining:
    - How the source's perception of the target evolves over time 
    - Key events that transform the source's attitude
    - How the source's perception affects their actions toward the target
    - How this directional relationship affects both characters
    - The narrative significance of this directional relationship

12. Assign directional relationship strength (1-10) based on:
    - How important the source's perception of the target is to the main plot
    - The emotional intensity of the source's attitude toward the target
    - How much the source's perception affects their decisions
    - The narrative space devoted to the source's attitude toward the target

The refined output should be in this JSON structure:
{
  "characters": [
    {
      "name": "Character's most complete formal name",
      "aliases": ["Alternative name 1", "Title", "Nickname", etc.],
      "description": "Rich, narrative-focused description capturing character arc, development, and significance",
      "roles": ["Comprehensive list of narrative roles", "Social/political positions", "Familial roles", "Thematic functions"],
      "actions": ["Chronologically ordered list of all significant actions and events involving the character throughout the narrative"],
      "importance": "major/supporting/minor",
      "mentions": total number of mentions across the text
    }
  ],
  "relationships": [
    {
      "source": "Character A's most complete formal name",
      "target": "Character B's most complete formal name",
      "type": "structural relationship type only (e.g., 'uncle-nephew + king-subject')",
      "status": "A's perception of and attitude toward B",
      "description": "Comprehensive description of how A perceives and acts toward B, including evolution and significance",
      "evidence": "Specific examples and quotes showing how A relates to B",
      "strength": narrative importance of this directional relationship (1-10)
    },
    {
      "source": "Character B's most complete formal name",
      "target": "Character A's most complete formal name",
      "type": "structural relationship type only (e.g., 'uncle-nephew + king-subject')",
      "status": "B's perception of and attitude toward A",
      "description": "Comprehensive description of how B perceives and acts toward A, including evolution and significance",
      "evidence": "Specific examples and quotes showing how B relates to A",
      "strength": narrative importance of this directional relationship (1-10)
    }
  ]
}

CRITICAL INSTRUCTION:
After completing your initial analysis, REVIEW all major characters (those marked as "major" importance) and ensure that EACH major character has directional relationships defined with EVERY other major character where any relationship could reasonably exist, in BOTH directions. If directional relationships are missing, add them based on character descriptions and narrative context.

Return ONLY the JSON object with no additional text.
`,
  // Add other templates as needed
};

/**
 * Creates a character extraction prompt based on chunk position
 */
function createCharacterExtractionPrompt(
  title,
  author,
  chunkIndex,
  totalChunks,
  contextSummary = ""
) {
  const isFirstChunk = chunkIndex === 0;
  const templateToUse = isFirstChunk
    ? TEMPLATES.FIRST_CHUNK_EXTRACTION
    : TEMPLATES.SUBSEQUENT_CHUNK_EXTRACTION;

  const chunkPosition = `This is chunk ${chunkIndex + 1} of ${totalChunks}.`;
  const contextSection = isFirstChunk
    ? ""
    : `\n\nPREVIOUS CHUNK CONTEXT:\n${contextSummary}\n`;

  return `
  You are a literary analysis expert analyzing text from "${title}" by ${author}".
  
  ${chunkPosition}
  ${contextSection}
  
  ${templateToUse}
  `;
}

/**
 * Builds an enhanced context summary for progressive analysis
 */
function buildContextSummary(previousResults, chunkIndex) {
  if (!previousResults || chunkIndex <= 0) {
    return "";
  }

  // Extract major and supporting characters for focused context
  const significantCharacters = previousResults.characters.filter(
    (char) => char.importance === "major" || char.importance === "supporting"
  );

  // Create a matrix of existing relationships for completeness checking
  const relationshipMatrix = new Map();
  previousResults.characters.forEach((char) => {
    relationshipMatrix.set(char.name, new Set());
  });

  previousResults.relationships.forEach((rel) => {
    if (relationshipMatrix.has(rel.source)) {
      relationshipMatrix.get(rel.source).add(rel.target);
    }
  });

  // Format character summaries with focus on narrative development
  const characterSummaries = significantCharacters
    .map((char) => {
      // Basic character info
      let summary = `- ${char.name}${
        char.aliases && char.aliases.length
          ? ` (${char.aliases.join(", ")})`
          : ""
      }: ${char.description}\n`;

      // Add roles if available
      if (char.roles && char.roles.length) {
        summary += `  ROLES: ${char.roles.join(", ")}\n`;
      }

      // Add a selection of most recent/important actions
      if (char.actions && char.actions.length) {
        const recentActions = char.actions.slice(-5); // Get last 5 actions
        summary += `  RECENT ACTIONS: ${recentActions.join("; ")}`;
      }

      return summary;
    })
    .join("\n\n");

  // Extract relationships involving major characters for focused context
  const significantRelationships = previousResults.relationships.filter(
    (rel) =>
      significantCharacters.some((char) => char.name === rel.source) &&
      significantCharacters.some((char) => char.name === rel.target)
  );

  // Format relationship summaries with focus on bidirectionality
  const relationshipSummaries = significantRelationships
    .map((rel) => {
      return `- ${rel.source} → ${rel.target}: ${rel.type} (${rel.status}) - ${rel.description}`;
    })
    .join("\n\n");

  // Identify potential missing relationships
  const missingRelationships = [];
  significantCharacters.forEach((charA) => {
    significantCharacters.forEach((charB) => {
      if (charA.name !== charB.name) {
        const hasAtoB =
          relationshipMatrix.get(charA.name)?.has(charB.name) || false;
        const hasBtoA =
          relationshipMatrix.get(charB.name)?.has(charA.name) || false;

        if (!hasAtoB || !hasBtoA) {
          missingRelationships.push(
            `- Potential missing relationship: ${
              !hasAtoB
                ? `${charA.name} → ${charB.name}`
                : `${charB.name} → ${charA.name}`
            }`
          );
        }
      }
    });
  });

  const missingRelationshipsSummary = missingRelationships.length
    ? `\n\nPOTENTIAL MISSING RELATIONSHIPS TO ADDRESS:\n${missingRelationships.join(
        "\n"
      )}`
    : "";

  return `
  CHARACTERS FROM PREVIOUS CHUNKS:
  ${characterSummaries}
  
  ESTABLISHED RELATIONSHIPS:
  ${relationshipSummaries}
  ${missingRelationshipsSummary}
  `;
}

/**
 * Creates a relationship inference prompt
 */
function createRelationshipInferencePrompt(title, author) {
  return `
  You are a literary analysis expert analyzing "${title}" by ${author}".
  
  I will provide you with character and relationship data that has already been analyzed.
  Your sole task is to identify MISSING relationships between major characters.
  
  ${TEMPLATES.RELATIONSHIP_INFERENCE}
  `;
}

/**
 * Creates a final refinement prompt
 */
function createFinalRefinementPrompt(title, author) {
  return `
  You are a literary analysis expert finalizing an analysis of "${title}" by ${author}".
  
  ${TEMPLATES.FINAL_REFINEMENT}
  `;
}

module.exports = {
  createCharacterExtractionPrompt,
  createRelationshipInferencePrompt,
  createFinalRefinementPrompt,
  buildContextSummary,
};
