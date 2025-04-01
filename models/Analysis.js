const mongoose = require("mongoose");

const AnalysisSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    characters: [
      {
        name: String,
        importance: String,
        description: String,
        aliases: [String],
        mentions: Number,
      },
    ],
    relationships: [
      {
        source: String,
        target: String,
        type: String,
        strength: Number,
        status: String,
        description: String,
        evidence: String,
      },
    ],
    meta: {
      consistencyKey: String,
      chunksProcessed: Number,
      characterCount: Number,
      relationshipCount: Number,
      relationshipPairsCount: Number,
      bidirectionalAnalysis: Boolean,
      analysisDate: Date,
      provider: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analysis", AnalysisSchema);
