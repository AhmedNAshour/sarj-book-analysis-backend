// prompts.js
const TEMPLATES = {
  CHARACTER_EXTRACTION: `
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
1. Create SEPARATE BIDIRECTIONAL RELATIONSHIPS to capture how each character perceives the other:
   - For each character pair (A and B), create TWO distinct relationship entries:
     * One showing how A perceives and acts toward B
     * Another showing how B perceives and acts toward A
   - Each direction might have different perceptions, emotions, and dynamics

2. For EACH direction of a relationship, capture:
   - How the source character views the target character
   - The source character's feelings and attitudes toward the target
   - Actions the source takes that affect the target
   - What the source character wants from or fears about the target
   - How the source character's perception evolves in this chunk

3. Identify ALL relationship directions with evidence in this specific chunk, including:
   - Direct interactions between characters present in the chunk
   - Relationships mentioned or referenced even if one or both characters aren't present
   - Implied relationships based on narrative context or character descriptions
   - Parallel or contrasting character journeys (foil relationships)
   - Relationships where one character affects another without direct contact
   - Characters who are mentioned together or in relation to the same events or people
   
4. For each directional relationship, capture:
   - Specific interactions and their outcomes
   - Power dynamics from source to target
   - Changes in how the source views the target during this chunk
   - Emotional attitudes the source has toward the target
   - How the source's perception affects their actions toward the target

5. Strictly separate relationship information into two components:
   - TYPE: The structural relationship (e.g., father-son, mentor-student, neighbors, king-subject)
   - STATUS: The emotional or perceptual state FROM SOURCE TO TARGET (e.g., distrustful, admiring, vengeful)

6. For RELATIONSHIP TYPE, focus exclusively on structural connections:
   - Family: "father-son", "uncle-nephew", "siblings", "cousins"
   - Political: "king-subject", "ruler-heir", "rival-princes"
   - Social: "friends", "lovers", "neighbors"
   - Professional: "master-servant", "teacher-student"
   
   Use compound types when appropriate (e.g., "uncle-nephew + king-subject")
   
7. For RELATIONSHIP STATUS, focus on the source's perception of and attitude toward the target:
   - Emotional states: "loving", "antagonistic", "vengeful", "loyal", "distrustful"
   - Perceptual attitudes: "sees as threatening", "perceives as ally", "views with suspicion"
   - Dynamic patterns: "growing more suspicious of", "beginning to trust", "increasingly fearful of"

8. AGGRESSIVELY INFER implied directional relationships:
   - If A is described as "father of B" and C is described as "father of D", consider if B and D might be cousins
   - If A is "brother of B" and C is "son of B", then A is C's uncle
   - If A is king and B is a noble, they have a king-subject relationship
   - If A loves B, but B loves C, then A and C might have a rivalry
   - Pay special attention to family connections that might be implicit in descriptions
   - Consider political and power relationships based on characters' roles and status

9. For the evidence field, provide specific examples from the text that demonstrate:
   - How the source interacts with or affects the target
   - Direct quotes or paraphrased exchanges that reveal the source's attitude
   - Narrative commentary that illuminates the source's perception

10. BE EXHAUSTIVE - find ALL possible directional relationships:
   - If two major characters both appear in this chunk, they MUST have relationships in both directions
   - Even if characters don't directly interact, consider their perceptions of each other
   - Think about how each character's actions or decisions might affect or reveal their view of other characters

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
      "status": "source's perception of and attitude toward target",
      "evidence": "Specific examples and quotes from this chunk showing how source perceives and acts toward target",
      "strength": number of interactions or references to this directional relationship in this chunk
    }
  ]
}

IMPORTANT:
- Be precise about character identity
- For character descriptions, focus on NARRATIVE ACTIONS and DEVELOPMENT, not just attributes
- ALWAYS create SEPARATE relationship entries for EACH DIRECTION between character pairs
- Ensure the status reflects the SOURCE character's perception of the TARGET
- For relationship TYPE, focus ONLY on structural connections (family, professional roles, etc.)
- For relationship STATUS, capture ONLY the source's perception of and attitude toward the target
- DON'T LIMIT RELATIONSHIPS TO DIRECT INTERACTIONS - include relationships based on mentions or narrative influence
- Return ONLY the JSON object with no additional text
`,

  RELATIONSHIP_INFERENCE: `
For each pair of major characters, determine BOTH DIRECTIONS of their relationship:
1. How Character A perceives, feels about, and acts toward Character B
2. How Character B perceives, feels about, and acts toward Character A

For EACH direction that is NOT already defined, determine:
1. Whether any relationship exists or should exist based on the narrative context
2. The structural relationship type (e.g., king-subject, rivals, friends)
3. The source character's perception of and attitude toward the target
4. A description of how the source relates to the target in the narrative
5. The strength of this directional relationship (1-10)

GUIDELINES:

1. Consider the following types of relationships:
   - Direct interactions described in character profiles
   - Indirect connections through other characters
   - Parallel or contrasting narrative functions
   - Political or power dynamics implied by their roles
   - Family connections that can be logically inferred
   - Relationships based on shared experiences or goals
   
2. Focus particularly on:
   - Major characters who would logically interact but lack relationships in one or both directions
   - Characters who are mentioned in each other's descriptions
   - Characters who have familial or political connections to the same third parties
   - Characters serving similar or opposing functions in the narrative

3. For EACH identified missing directional relationship, provide:
   - SOURCE: The character who perceives/acts toward the target
   - TARGET: The character who is perceived/acted upon
   - TYPE: Structural relationship (e.g., "rivals", "king-subject", "in-laws")
   - STATUS: Source's perception of and attitude toward target (e.g., "distrustful", "admiring", "vengeful")
   - DESCRIPTION: A substantive description of how the source perceives and acts toward the target
   - STRENGTH: A rating from 1-10 of this directional relationship's importance

4. Be thorough - ensure ALL major character pairs have defined relationships in BOTH directions

Respond with a JSON object containing ONLY the new directional relationships you've identified:
{
  "newRelationships": [
    {
      "source": "Character A's name",
      "target": "Character B's name",
      "type": "structural relationship type",
      "status": "A's perception of and attitude toward B",
      "description": "Description of how A perceives and acts toward B",
      "strength": narrative importance of this direction (1-10)
    },
    {
      "source": "Character B's name",
      "target": "Character A's name",
      "type": "structural relationship type",
      "status": "B's perception of and attitude toward A",
      "description": "Description of how B perceives and acts toward A",
      "strength": narrative importance of this direction (1-10)
    }
  ]
}

If there are no missing directional relationships to add, return an empty array.
`,

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

3. BIDIRECTIONAL RELATIONSHIP INFERENCE - THIS IS CRITICAL:
   - You MUST thoroughly review each character description for explicit and implicit relationships
   - For EVERY pair of major characters, evaluate BOTH directions of their relationship
   - After reading character descriptions, create a comprehensive list of ALL possible directional relationships
   - Do NOT rely solely on the relationships already provided - many directions are missing
   - Be especially thorough with characters who are mentioned in each other's descriptions
   - Include adversarial, familial, political, and social relationships even if not directly stated

4. For family relationships, infer connections like:
   - If A is "brother of B" and C is "son of B", then A is C's uncle AND C is A's nephew
   - If A and B are siblings, and C is A's child, and D is B's child, then C and D are cousins in both directions
   - If A is married to B, and C is B's sibling, then A and C are in-laws (in both directions)
   - If A is married to B, and C is B's child from a previous relationship, then A is C's step-parent AND C is A's step-child

5. For political relationships, infer connections like:
   - If A is king, and B is a courtier, then A is B's ruler AND B is A's subject
   - If A is advisor to the king, and B is a foreign ambassador, they have political relationships in both directions
   - If A and B are both knights or nobles, they have peer relationships (in both directions)

6. For adversarial relationships, infer connections like:
   - If A killed B's father, A views B as a potential threat AND B views A with hatred
   - If A and B are both pursuing the throne, A sees B as a rival AND B sees A as an obstacle
   - If A is plotting against B, A views B as a target AND B might be suspicious of A

7. Strictly separate relationship information into two clear components:
   
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

8. ANALYZE NARRATIVE PARALLELS AND SYMMETRIES:
   - Identify characters with parallel roles or journeys (e.g., sons avenging fathers)
   - Recognize foil relationships (characters who contrast each other)
   - Note characters who serve similar narrative functions
   
9. ENSURE BIDIRECTIONAL RELATIONSHIP COMPLETENESS (CRITICAL):
   - EVERY major character should have defined relationships in BOTH directions with ALL other major characters they interact with
   - Create a matrix of all major characters and check that relationships are defined in both directions between them
   - For major antagonists and protagonists, ALWAYS define relationships in both directions even if indirect
   - Include relationships that might not involve direct interaction but are narratively important
   - Do not limit yourself to relationships explicitly mentioned in the text

10. Make directional relationship descriptions informative by explaining:
    - How the source's perception of the target evolves over time 
    - Key events that transform the source's attitude
    - How the source's perception affects their actions toward the target
    - How this directional relationship affects both characters
    - The narrative significance of this directional relationship

11. Assign directional relationship strength (1-10) based on:
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
      "strength": narrative importance of this directional relationship (1-10)
    },
    {
      "source": "Character B's most complete formal name",
      "target": "Character A's most complete formal name",
      "type": "structural relationship type only (e.g., 'uncle-nephew + king-subject')",
      "status": "B's perception of and attitude toward A",
      "description": "Comprehensive description of how B perceives and acts toward A, including evolution and significance",
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
 * Creates a character extraction prompt with all variables inserted
 */
function createCharacterExtractionPrompt(
  title,
  author,
  chunkIndex,
  totalChunks,
  contextSummary = ""
) {
  return `
  You are a literary analysis expert analyzing text from "${title}" by ${author}".
  
  This is chunk ${chunkIndex + 1} of ${totalChunks}.
  
  ${contextSummary}
  
  ${TEMPLATES.CHARACTER_EXTRACTION}
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

/**
 * Builds context summary for chunk processing
 */
function buildContextSummary(previousResults, chunkIndex) {
  if (!previousResults || chunkIndex <= 0) {
    return "";
  }

  // Extract most important characters from previous chunks
  const significantCharacters = previousResults.characters
    .filter(
      (char) =>
        char.mentions > 3 ||
        char.importance === "major" ||
        char.importance === "supporting"
    )
    .slice(0, 15);

  // Format character summaries
  const characterSummaries = significantCharacters
    .map((char) => {
      return `- ${char.name}${
        char.aliases ? ` (${char.aliases.join(", ")})` : ""
      }: ${char.description.substring(0, 200)}${
        char.description.length > 200 ? "..." : ""
      }`;
    })
    .join("\n");

  // Extract most important relationships from previous chunks
  const significantRelationships = previousResults.relationships
    .filter((rel) => rel.strength > 2)
    .slice(0, 20);

  // Format relationship summaries
  const relationshipSummaries = significantRelationships
    .map((rel) => {
      return `- ${rel.source} & ${rel.target}: ${rel.type} (${rel.status}) - ${
        rel.evidence ? rel.evidence.substring(0, 150) : "No evidence"
      }${rel.evidence && rel.evidence.length > 150 ? "..." : ""}`;
    })
    .join("\n");

  return `
  CONTEXT FROM PREVIOUS CHUNKS:
  
  CHARACTERS:
  ${characterSummaries}
  
  RELATIONSHIPS:
  ${relationshipSummaries}
  
  Use this context to inform your analysis of the current chunk, especially when identifying continuing character arcs and developing relationships. When you find information that extends or contradicts previous knowledge, prioritize updating and expanding rather than simply repeating.
  `;
}

module.exports = {
  createCharacterExtractionPrompt,
  createRelationshipInferencePrompt,
  createFinalRefinementPrompt,
  buildContextSummary,
};
