const { Worker } = require("bullmq");
const path = require("node:path");
const Resume = require("../models/Resume");
const User = require("../models/User");
const AIAnalysis = require("../models/AIAnalysis");
const Document = require("../models/Document");
const { extractResumeText, extractProfileFromResume } = require("../services/resume-parser.service");
const { generatePseudoEmbedding } = require("../services/embedding.service");
const geminiService = require("../services/gemini.service");
const { createNotification } = require("../services/notification.service");
const logger = require("../utils/logger");
const { RESUME_QUEUE_NAME, resumeJobOptions } = require("../queues/constants");
const { createBullMQRedisConnection } = require("../queues/redisClient");
const { UPLOAD_DIR } = require("../config/env");

const createResumeProcessor = ({
  ResumeModel = Resume,
  UserModel = User,
  AIAnalysisModel = AIAnalysis,
  DocumentModel = Document,
  extractText = extractResumeText,
  profileFromText = extractProfileFromResume,
  createEmbedding = generatePseudoEmbedding,
  analyzeResume = geminiService.analyzeResume.bind(geminiService),
  notify = createNotification,
} = {}) => async (job) => {
  const { resumeId, candidateId } = job.data;
  const resume = await ResumeModel.findOne({ _id: resumeId, candidateId }).populate(
    "candidateId",
    "name profile",
  );
  if (!resume) throw new Error("Resume record was not found for processing");
  resume.processingStatus = "processing";
  await resume.save();

  const filePath = path.resolve(UPLOAD_DIR, path.basename(resume.fileUrl));
  const parsedText = await extractText(filePath, resume.fileType);
  if (!parsedText.trim()) throw new Error("Resume contains no readable text");

  const structuredData = profileFromText(parsedText, resume.candidateId);
  const embedding = createEmbedding(parsedText);
  resume.parsedText = parsedText;
  resume.structuredData = structuredData;
  resume.embedding = embedding;
  await resume.save();

  const analysisData = await analyzeResume(parsedText);
  await AIAnalysisModel.findOneAndUpdate(
    { resumeId: resume._id },
    {
      resumeId: resume._id,
      candidateId: resume.candidateId._id,
      ...analysisData,
    },
    { upsert: true, new: true },
  );

  await DocumentModel.findOneAndUpdate(
    { sourceType: "resume", sourceId: resume._id },
    {
      ownerId: resume.candidateId._id,
      sourceType: "resume",
      sourceId: resume._id,
      title: `${resume.candidateId.name}'s Resume`,
      content: parsedText,
      embedding,
      metadata: {
        candidateId: resume.candidateId._id,
        candidateName: resume.candidateId.name,
        documentType: "resume",
        chunkIndex: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  resume.processingStatus = "completed";
  await resume.save();

  await notify({
    userId: resume.candidateId._id,
    type: "application_status",
    title: "AI Resume Analysis Complete",
    message:
      analysisData.benchmarkScore == null
        ? `Your resume "${resume.fileName}" was processed. Automated analysis is unavailable; please review it manually.`
        : `Your resume "${resume.fileName}" was analyzed. ATS benchmark: ${analysisData.benchmarkScore}/100.`,
    referenceId: resume._id,
    referenceType: "resume",
  });

  return { resumeId: String(resume._id), processingStatus: "completed" };
};

const createResumeWorker = ({
  WorkerClass = Worker,
  processor = createResumeProcessor(),
  connection,
  ResumeModel = Resume,
  notify = createNotification,
} = {}) => {
  const redisConnection = connection
    ? null
    : createBullMQRedisConnection({ worker: true });
  const worker = new WorkerClass(RESUME_QUEUE_NAME, processor, {
    connection: connection || redisConnection.connection,
    concurrency: 3,
  });

  worker.on("completed", (job) => {
    logger.info(`Resume processing completed: ${job.id}`);
  });
  worker.on("failed", async (job, error) => {
    if (!job) return;
    const maxAttempts = job.opts?.attempts || resumeJobOptions.attempts;
    if (job.attemptsMade >= maxAttempts) {
      await ResumeModel.updateOne(
        { _id: job.data.resumeId, candidateId: job.data.candidateId },
        { $set: { processingStatus: "failed" } },
      ).catch((statusError) => {
      logger.error(`Could not persist final resume failure for ${job.id} (${statusError.name}).`);
      });
      await notify({
        userId: job.data.candidateId,
        type: "application_status",
        title: "Resume Processing Failed",
        message: "We could not process your resume after several attempts. Please try again or upload it again.",
        referenceId: job.data.resumeId,
        referenceType: "resume",
      });
    }
    logger.error(`Resume job ${job.id} failed on attempt ${job.attemptsMade} (${error.name}).`);
  });
  worker.on("error", (error) => {
    logger.error(`Resume worker error (${error.name || "WorkerError"}).`);
  });

  return worker;
};

module.exports = {
  createResumeProcessor,
  createResumeWorker,
};
