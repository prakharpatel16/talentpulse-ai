const Job = require("../models/Job");
const Resume = require("../models/Resume");
const User = require("../models/User");
const Application = require("../models/Application");
const ApiResponse = require("../utils/apiResponse");
const geminiService = require("../services/gemini.service");

const matchResumeWithJob = async (req, res) => {
  const { resumeId, jobId } = req.body;

  const job = await Job.findById(jobId).populate("companyId");
  if (!job) {
    return ApiResponse.notFound(res, "Job not found");
  }

  if (req.user.role === "candidate") {
    if (job.status !== "published") {
      return ApiResponse.notFound(res, "Job not found");
    }
    if (
      resumeId &&
      !(await Resume.exists({ _id: resumeId, candidateId: req.user._id }))
    ) {
      return ApiResponse.forbidden(res, "You can only match your own resume.");
    }
  } else if (job.recruiterId.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(
      res,
      "You can only match resumes against your own roles.",
    );
  }

  const resume = await Resume.findById(resumeId).populate(
    "candidateId",
    "name profile",
  );
  if (!resume) {
    return ApiResponse.notFound(res, "Resume not found");
  }

  if (
    req.user.role === "recruiter" &&
    !(await Application.exists({
      jobId,
      candidateId: resume.candidateId._id,
      resumeId,
    }))
  ) {
    return ApiResponse.forbidden(
      res,
      "This candidate has not applied to the selected role.",
    );
  }

  const matchResult = await geminiService.calculateMatch(
    job,
    resume.parsedText || resume.structuredData?.summary || "",
    resume.candidateId?.profile?.skills || [],
  );

  return ApiResponse.success(res, {
    job: {
      id: job._id,
      title: job.title,
      company: job.companyId?.name || "Company",
      requiredSkills: job.requiredSkills,
    },
    candidate: {
      id: resume.candidateId._id,
      name: resume.candidateId.name,
    },
    ...matchResult,
  });
};

const getJobMatches = async (req, res) => {
  const { jobId } = req.params;
  const job = await Job.findById(jobId);
  if (!job) {
    return ApiResponse.notFound(res, "Job not found");
  }

  if (job.recruiterId.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(
      res,
      "You can only view matches for your own roles.",
    );
  }

  // Find all applications for this job
  const applications = await Application.find({ jobId })
    .populate("candidateId", "name email profileImage profile")
    .populate("resumeId")
    .sort({ matchPercentage: -1 });

  return ApiResponse.success(res, {
    job: {
      id: job._id,
      title: job.title,
      requiredSkills: job.requiredSkills,
    },
    matches: applications.map((app) => ({
      applicationId: app._id,
      candidate: app.candidateId,
      status: app.status,
      matchPercentage: app.matchPercentage,
      matchData: app.matchData,
      appliedAt: app.appliedAt,
    })),
  });
};

const compareCandidates = async (req, res) => {
  const { jobId, candidateIds } = req.body;

  if (
    !candidateIds ||
    !Array.isArray(candidateIds) ||
    candidateIds.length === 0
  ) {
    return ApiResponse.badRequest(
      res,
      "Please provide an array of candidate IDs to compare.",
    );
  }
  if (candidateIds.length > 10) {
    return ApiResponse.badRequest(
      res,
      "Compare no more than 10 candidates at a time.",
    );
  }

  const job = await Job.findById(jobId).populate("companyId");
  if (!job) {
    return ApiResponse.notFound(res, "Requisition not found");
  }
  if (job.recruiterId.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(
      res,
      "You can only compare candidates for your own roles.",
    );
  }

  const allowedCandidates = await Application.find({
    jobId,
    candidateId: { $in: candidateIds },
  }).distinct("candidateId");
  if (allowedCandidates.length !== new Set(candidateIds.map(String)).size) {
    return ApiResponse.forbidden(
      res,
      "All candidates must have applied to the selected role.",
    );
  }

  const candidatesData = await Promise.all(
    candidateIds.map(async (cid) => {
      const candidate = await User.findById(cid).select("-passwordHash");
      if (!candidate) return null;

      const application = await Application.findOne({
        candidateId: cid,
        jobId,
      });

      const matchScore = application?.matchPercentage ?? null;
      const skills = candidate.profile?.skills || [];

      return {
        candidate: {
          id: candidate._id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          location: candidate.location,
          profileImage: candidate.profileImage,
          currentRole:
            candidate.profile?.experience?.[0]?.position ||
            candidate.title ||
            null,
        },
        applicationId: application?._id,
        status: application?.status || "applied",
        overallScore: matchScore,
        matchingSkills: job.requiredSkills.filter((s) =>
          skills.some(
            (cs) =>
              typeof cs === "string" && cs.toLowerCase() === s.toLowerCase(),
          ),
        ),
        missingSkills: job.requiredSkills.filter(
          (s) =>
            !skills.some(
              (cs) =>
                typeof cs === "string" && cs.toLowerCase() === s.toLowerCase(),
            ),
        ),
        evidence: application?.matchData || null,
        assessmentLimitations:
          "Skill overlap is informational and is not a hiring recommendation.",
      };
    }),
  );

  const validCandidates = candidatesData.filter(Boolean);

  return ApiResponse.success(res, {
    job: {
      id: job._id,
      title: job.title,
      requisitionCode: job.requisitionCode || "REQ-1042",
      department: job.department,
      requiredSkills: job.requiredSkills,
    },
    candidates: validCandidates,
  });
};

module.exports = {
  matchResumeWithJob,
  getJobMatches,
  compareCandidates,
};
