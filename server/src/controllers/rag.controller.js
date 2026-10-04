const Document = require("../models/Document");
const Thread = require("../models/Thread");
const Job = require("../models/Job");
const Application = require("../models/Application");
const ApiResponse = require("../utils/apiResponse");
const geminiService = require("../services/gemini.service");
const {
  generatePseudoEmbedding,
  cosineSimilarity,
} = require("../services/embedding.service");

const queryAssistant = async (req, res) => {
  const { question, threadId, requisitionId } = req.body;

  if (!question || question.trim() === "") {
    return ApiResponse.badRequest(res, "Question cannot be empty.");
  }

  let jobContext = null;
  if (requisitionId) {
    jobContext = await Job.findOne({
      _id: requisitionId,
      recruiterId: req.user._id,
    });
    if (!jobContext) {
      return ApiResponse.notFound(res, "Requisition not found");
    }
  }

  // Vector embedding for query
  const queryEmbedding = generatePseudoEmbedding(question);

  const recruiterJobIds = await Job.find({
    recruiterId: req.user._id,
  }).distinct("_id");
  const applicantIds = await Application.find({
    jobId: { $in: recruiterJobIds },
  }).distinct("candidateId");
  const allDocs = await Document.find({
    $or: [
      { ownerId: req.user._id },
      { "metadata.recruiterId": req.user._id },
      { "metadata.jobId": { $in: recruiterJobIds } },
      { "metadata.candidateId": { $in: applicantIds } },
    ],
  }).limit(50);

  // Calculate semantic relevance scores
  const scoredDocs = allDocs.map((doc) => {
    const similarity =
      doc.embedding?.length > 0
        ? cosineSimilarity(queryEmbedding, doc.embedding)
        : 0.5;
    return {
      doc,
      similarity,
    };
  });

  scoredDocs.sort((a, b) => b.similarity - a.similarity);
  const relevantDocs = scoredDocs.slice(0, 4).map((item) => item.doc);

  // Generate synthesized response via Gemini AI
  const ragResult = await geminiService.queryRAG({
    question,
    documents: relevantDocs,
    jobContext,
  });

  // Persist conversation thread
  let thread = null;
  if (threadId) {
    thread = await Thread.findOne({ _id: threadId, recruiterId: req.user._id });
  }

  if (!thread) {
    thread = await Thread.create({
      recruiterId: req.user._id,
      requisitionId: requisitionId || null,
      title: question.slice(0, 45) + (question.length > 45 ? "..." : ""),
      messages: [],
    });
  }

  thread.messages.push({
    sender: "user",
    content: question,
    sources: [],
    createdAt: new Date(),
  });

  thread.messages.push({
    sender: "assistant",
    content: ragResult.answer,
    sources: ragResult.sources,
    createdAt: new Date(),
  });

  await thread.save();

  return ApiResponse.success(res, {
    threadId: thread._id,
    answer: ragResult.answer,
    sources: ragResult.sources,
    messages: thread.messages,
  });
};

const getThreads = async (req, res) => {
  const threads = await Thread.find({ recruiterId: req.user._id })
    .populate("requisitionId", "title requisitionCode")
    .sort({ updatedAt: -1 });

  return ApiResponse.success(res, { threads });
};

const getThreadById = async (req, res) => {
  const thread = await Thread.findOne({
    _id: req.params.id,
    recruiterId: req.user._id,
  }).populate("requisitionId", "title requisitionCode");

  if (!thread) {
    return ApiResponse.notFound(res, "Conversation thread not found");
  }

  return ApiResponse.success(res, { thread });
};

const createThread = async (req, res) => {
  const { title = "New Conversation", requisitionId } = req.body;

  if (
    requisitionId &&
    !(await Job.exists({ _id: requisitionId, recruiterId: req.user._id }))
  ) {
    return ApiResponse.notFound(res, "Requisition not found");
  }

  const thread = await Thread.create({
    recruiterId: req.user._id,
    requisitionId: requisitionId || null,
    title,
    messages: [],
  });

  return ApiResponse.created(res, { thread });
};

module.exports = {
  queryAssistant,
  getThreads,
  getThreadById,
  createThread,
};
