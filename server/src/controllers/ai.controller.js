const AIAnalysis = require("../models/AIAnalysis");
const Resume = require("../models/Resume");
const ApiResponse = require("../utils/apiResponse");
const { resumeQueue } = require("../queues");
const logger = require("../utils/logger");
const {
  canRecruiterAccessResume,
} = require("../services/authorization.service");

const startResumeAnalysis = async (req, res) => {
  const { resumeId } = req.params;
  const resume = await Resume.findById(resumeId).populate(
    "candidateId",
    "name email phone location",
  );
  if (!resume) {
    return ApiResponse.notFound(res, "Resume not found.");
  }

  const isOwner = resume.candidateId._id.toString() === req.user._id.toString();
  const isHiringRecruiter =
    !isOwner &&
    req.user.role === "recruiter" &&
    (await canRecruiterAccessResume(req.user._id, resume));
  if (!isOwner && !isHiringRecruiter) {
    return ApiResponse.forbidden(
      res,
      "Unauthorized to trigger analysis for this resume.",
    );
  }

  resume.processingStatus = "queued";
  await resume.save();

  let job;
  try {
    job = await resumeQueue.enqueueResumeAnalysis(
      resume._id,
      resume.candidateId._id,
    );
  } catch {
    resume.processingStatus = "failed";
    await resume.save();
    logger.error(`Could not queue resume processing for ${resume._id}.`);
    return ApiResponse.error(
      res,
      "Resume analysis could not be queued. Please try again later.",
      "QUEUE_UNAVAILABLE",
      503,
      { resumeId: String(resume._id) },
    );
  }

  return ApiResponse.accepted(
    res,
    {
      resumeId: String(resume._id),
      jobId: job.id,
      processingStatus: "queued",
    },
    "Resume analysis queued successfully.",
  );
};

const getResumeAnalysis = async (req, res) => {
  const { resumeId } = req.params;
  const resume = await Resume.findById(resumeId).populate(
    "candidateId",
    "name email profileImage profile",
  );
  if (!resume) {
    return ApiResponse.notFound(res, "Resume record not found.");
  }

  const isOwner = resume.candidateId._id.toString() === req.user._id.toString();
  const isHiringRecruiter =
    !isOwner &&
    req.user.role === "recruiter" &&
    (await canRecruiterAccessResume(req.user._id, resume));
  if (!isOwner && !isHiringRecruiter) {
    return ApiResponse.forbidden(res, "Unauthorized to view this analysis.");
  }

  const analysis = await AIAnalysis.findOne({ resumeId: resume._id });
  return ApiResponse.success(res, {
    analysis,
    processingStatus: resume.processingStatus,
    candidate: resume.candidateId,
    resume: {
      id: resume._id,
      fileName: resume.fileName,
      createdAt: resume.createdAt,
    },
  });
};

module.exports = {
  startResumeAnalysis,
  getResumeAnalysis,
};
