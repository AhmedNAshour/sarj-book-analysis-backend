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
`,

  RELATIONSHIP_INFERENCE: `
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
`,

  FINAL_REFINEMENT: `
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
