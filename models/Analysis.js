const mongoose = require("mongoose");

const CharacterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Character name is required"],
    trim: true,
  },
  importance: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  aliases: [String],
  mentions: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const RelationshipSchema = new mongoose.Schema({
  source: {
    type: String,
    required: [true, "Source character is required"],
    trim: true,
  },
  target: {
    type: String,
    required: [true, "Target character is required"],
    trim: true,
  },
  type: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  evidence: {
    type: String,
    trim: true,
  },
  numberOfInteractions: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const InteractionSchema = new mongoose.Schema({
  characters: {
    type: [String],
    required: [true, "Characters involved in the interaction are required"],
  },
  description: {
    type: String,
    required: [true, "Interaction description is required"],
    trim: true,
  },
  context: {
    type: String,
    required: [true, "Interaction context is required"],
    trim: true,
  },
  type: {
    type: String,
    required: [true, "Interaction type is required"],
    trim: true,
  },
  chunkIndex: {
    type: Number,
    required: [true, "Chunk index is required"],
    min: 0,
  },
});

const MetaDataSchema = new mongoose.Schema({
  consistencyKey: String,
  chunksProcessed: {
    type: Number,
    default: 0,
    min: 0,
  },
  characterCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  relationshipCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  relationshipPairsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  bidirectionalAnalysis: {
    type: Boolean,
    default: false,
  },
  analysisDate: {
    type: Date,
    default: Date.now,
  },
  provider: String,
});

const AnalysisSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      required: [true, "Book ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Book title is required"],
      trim: true,
      index: true,
    },
    author: {
      type: String,
      required: [true, "Book author is required"],
      trim: true,
      index: true,
    },
    characters: [CharacterSchema],
    relationships: [RelationshipSchema],
    interactions: [InteractionSchema],
    meta: {
      type: MetaDataSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AnalysisSchema.index({ bookId: 1, createdAt: -1 });
AnalysisSchema.index({ author: 1, title: 1 });

AnalysisSchema.virtual("characterCount").get(function () {
  return this.characters?.length || 0;
});

AnalysisSchema.virtual("relationshipCount").get(function () {
  return this.relationships?.length || 0;
});

AnalysisSchema.pre("save", function (next) {
  if (this.isModified("relationships")) {
    // Ensure source and target characters exist in characters array
    const characterNames = new Set(
      this.characters.map((c) => c.name.toLowerCase())
    );

    const invalidRelationships = this.relationships.filter((rel) => {
      const source = rel.source.toLowerCase();
      const target = rel.target.toLowerCase();
      return !characterNames.has(source) || !characterNames.has(target);
    });

    if (invalidRelationships.length > 0) {
      console.warn(
        `Warning: ${invalidRelationships.length} relationships reference characters not in character list`
      );
    }
  }

  next();
});

module.exports = mongoose.model("Analysis", AnalysisSchema);
