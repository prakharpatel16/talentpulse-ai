const Resume = require("../models/Resume");
const AIAnalysis = require("../models/AIAnalysis");
const Document = require("../models/Document");
const ApiResponse = require("../utils/apiResponse");
const { resumeQueue } = require("../queues");
const logger = require("../utils/logger");
const {
  canRecruiterAccessResume,
} = require("../services/authorization.service");
const path = require("node:path");
const { UPLOAD_DIR } = require("../config/env");

const uploadResume = async (req, res) => {
  if (!req.file) {
    return ApiResponse.badRequest(
      res,
      "Please upload a PDF or DOCX resume document.",
    );
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const fileName = req.file.originalname;
  const fileType = req.file.mimetype;
  const fileSize = req.file.size;

  // Check if candidate already has a primary resume
  const existingCount = await Resume.countDocuments({
    candidateId: req.user._id,
  });
  const isPrimary = existingCount === 0;

  const resume = await Resume.create({
    candidateId: req.user._id,
    fileUrl,
    fileName,
    fileType,
    fileSize,
    isPrimary,
    processingStatus: "queued",
    parsedText: "",
  });

  let job;
  try {
    job = await resumeQueue.enqueueResumeAnalysis(resume._id, req.user._id);
  } catch {
    resume.processingStatus = "failed";
    await resume.save();
    logger.error(`Could not queue resume processing for ${resume._id}.`);
    return ApiResponse.error(
      res,
      "Resume uploaded, but background processing could not be queued. Please retry from the resume analysis endpoint.",
      "QUEUE_UNAVAILABLE",
      503,
      { resumeId: String(resume._id) },
    );
  }

  return ApiResponse.created(
    res,
    {
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        jobId: job.id,
        processingStatus: "queued",
        isPrimary: resume.isPrimary,
      },
    },
    "Resume uploaded successfully and queued for background processing.",
  );
};

const getMyResumes = async (req, res) => {
  const resumes = await Resume.find({ candidateId: req.user._id }).sort({
    createdAt: -1,
  });

  // Attach analysis info if available
  const enriched = await Promise.all(
    resumes.map(async (r) => {
      const analysis = await AIAnalysis.findOne({ resumeId: r._id }).select(
        "benchmarkScore summary summaryEvidence domain yearsOfExperience strengths weakAreas suggestions skills missingInformation model",
      );
      const obj = r.toObject();
      obj.analysis = analysis;
      return obj;
    }),
  );

  return ApiResponse.success(res, { resumes: enriched });
};

const getResumeById = async (req, res) => {
  const resume = await Resume.findById(req.params.id);
  if (!resume) {
    return ApiResponse.notFound(res, "Resume record not found");
  }

  const isCandidate = resume.candidateId.toString() === req.user._id.toString();
  const isHiringRecruiter =
    !isCandidate &&
    req.user.role === "recruiter" &&
    (await canRecruiterAccessResume(req.user._id, resume));

  if (!isCandidate && !isHiringRecruiter) {
    return ApiResponse.forbidden(res, "Unauthorized to view this resume.");
  }

  const analysis = await AIAnalysis.findOne({ resumeId: resume._id });

  return ApiResponse.success(res, {
    resume,
    analysis,
  });
};

const downloadResume = async (req, res) => {
  const resume = await Resume.findById(req.params.id);
  if (!resume) {
    return ApiResponse.notFound(res, "Resume record not found");
  }

  const isCandidate = resume.candidateId.toString() === req.user._id.toString();
  const isHiringRecruiter =
    !isCandidate &&
    req.user.role === "recruiter" &&
    (await canRecruiterAccessResume(req.user._id, resume));
  if (!isCandidate && !isHiringRecruiter) {
    return ApiResponse.forbidden(res, "Unauthorized to download this resume.");
  }

  return res.download(
    path.basename(resume.fileUrl),
    resume.fileName,
    { root: UPLOAD_DIR },
    (error) => {
      if (error && !res.headersSent) {
        ApiResponse.notFound(res, "Resume file not found");
      }
    },
  );
};

const deleteResume = async (req, res) => {
  const resume = await Resume.findOneAndDelete({
    _id: req.params.id,
    candidateId: req.user._id,
  });
  if (!resume) {
    return ApiResponse.notFound(res, "Resume not found or unauthorized");
  }

  await AIAnalysis.deleteOne({ resumeId: req.params.id });
  await Document.deleteMany({ sourceId: req.params.id });

  return ApiResponse.success(res, {}, "Resume deleted successfully");
};

const setPrimaryResume = async (req, res) => {
  await Resume.updateMany(
    { candidateId: req.user._id },
    { $set: { isPrimary: false } },
  );
  const resume = await Resume.findOneAndUpdate(
    { _id: req.params.id, candidateId: req.user._id },
    { $set: { isPrimary: true } },
    { new: true },
  );

  if (!resume) {
    return ApiResponse.notFound(res, "Resume not found");
  }

  return ApiResponse.success(res, { resume }, "Set as primary resume");
};

module.exports = {
  uploadResume,
  getMyResumes,
  getResumeById,
  downloadResume,
  deleteResume,
  setPrimaryResume,
};
