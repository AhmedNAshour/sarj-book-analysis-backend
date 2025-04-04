module.exports = {
  // LLM API settings
  api: {
    groq: {
      model: "llama3-70b-8192",
    },
    sambanova: {
      model: "Meta-Llama-3.3-70B-Instruct",
    },
  },

  // Content chunking settings
  chunking: {
    defaultSize: 6000,
    lookbackWindow: 100,
  },

  // Analysis settings
  analysis: {
    defaultDelayBetweenChunks: 1000,
  },

  // Character processing settings
  characters: {
    significantMentionThreshold: 3,
    maxSignificantCharacters: 15,
  },

  // Relationship processing settings
  relationships: {
    significantStrengthThreshold: 2,
    maxSignificantRelationships: 20,
  },
};
