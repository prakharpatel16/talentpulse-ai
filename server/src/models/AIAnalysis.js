const mongoose = require("mongoose");

const AIAnalysisSchema = new mongoose.Schema(
  {
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
      unique: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    summary: {
      type: String,
      required: true,
    },
    summaryEvidence: {
      type: String,
      default: null,
    },
    benchmarkScore: {
      type: Number,
      default: 85,
    },
    yearsOfExperience: {
      type: Number,
      default: 5,
    },
    domain: {
      type: String,
      default: "Enterprise SaaS & Full-Stack Web Platforms",
    },
    strengths: [
      {
        type: String,
      },
    ],
    weakAreas: [
      {
        type: String,
      },
    ],
    suggestions: [
      {
        type: String,
      },
    ],
    skills: {
      technical: [{ type: String }],
      tools: [{ type: String }],
      soft: [{ type: String }],
    },
    missingInformation: [
      {
        type: String,
      },
    ],
    model: {
      type: String,
      default: "unverified",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("AIAnalysis", AIAnalysisSchema);
