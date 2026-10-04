const Interview = require("../models/Interview");
const Job = require("../models/Job");
const User = require("../models/User");
const Application = require("../models/Application");
const ApiResponse = require("../utils/apiResponse");
const geminiService = require("../services/gemini.service");
const { createNotification } = require("../services/notification.service");
const { invalidateRecruiterOverview } = require("../services/cacheInvalidation.service");

const createInterview = async (req, res) => {
  const {
    jobId,
    candidateId,
    experienceLevel = "senior",
    requiredSkills = [],
    interviewType = "technical",
    numberOfQuestions = 5,
  } = req.body;

  const job = await Job.findById(jobId);
  if (!job) {
    return ApiResponse.notFound(res, "Job requisition not found");
  }
  if (job.recruiterId.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(
      res,
      "You can only create interviews for your own roles.",
    );
  }

  const candidate = await User.findById(candidateId);
  if (!candidate) {
    return ApiResponse.notFound(res, "Candidate not found");
  }
  if (candidate.role !== "candidate") {
    return ApiResponse.badRequest(
      res,
      "Interviews can only be assigned to candidates.",
    );
  }
  if (!(await Application.exists({ jobId, candidateId }))) {
    return ApiResponse.forbidden(
      res,
      "The candidate must have applied to this role first.",
    );
  }

  const skillsToUse =
    requiredSkills.length > 0 ? requiredSkills : job.requiredSkills;

  // Generate initial questions using AI service
  const generatedQuestions = await geminiService.generateInterviewQuestions({
    jobTitle: job.title,
    requiredSkills: skillsToUse,
    experienceLevel,
    interviewType,
    numberOfQuestions,
  });

  const formattedQuestions = generatedQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    answer: "",
    evaluation: {
      relevance: 0,
      technicalUnderstanding: 0,
      completeness: 0,
      clarity: 0,
      feedback: "",
    },
  }));

  const interview = await Interview.create({
    jobId,
    candidateId,
    recruiterId: req.user._id,
    experienceLevel,
    requiredSkills: skillsToUse,
    interviewType,
    numberOfQuestions,
    questions: formattedQuestions,
    status: "created",
  });

  // Update application status to 'interview'
  await Application.findOneAndUpdate(
    { candidateId, jobId },
    { $set: { status: "interview" } },
  );
  await invalidateRecruiterOverview(req.user._id);

  // Notify candidate
  await createNotification({
    userId: candidateId,
    type: "interview_assigned",
    title: "New AI Technical Interview Assigned",
    message: `You have been invited to complete a technical assessment for "${job.title}".`,
    referenceId: interview._id,
    referenceType: "interview",
  });

  const populated = await Interview.findById(interview._id)
    .populate("jobId")
    .populate("candidateId", "name email profileImage");

  return ApiResponse.created(
    res,
    { interview: populated },
    "Interview created successfully",
  );
};

const getInterview = async (req, res) => {
  const interview = await Interview.findById(req.params.id)
    .populate({
      path: "jobId",
      populate: { path: "companyId" },
    })
    .populate("candidateId", "name email profileImage profile")
    .populate("recruiterId", "name email profileImage");

  if (!interview) {
    return ApiResponse.notFound(res, "Interview not found");
  }

  const isCandidate =
    interview.candidateId._id.toString() === req.user._id.toString();
  const isRecruiter =
    interview.recruiterId._id.toString() === req.user._id.toString();

  if (!isCandidate && !isRecruiter) {
    return ApiResponse.forbidden(res, "Unauthorized to view this interview");
  }

  return ApiResponse.success(res, { interview });
};

const getMyInterviews = async (req, res) => {
  const interviews = await Interview.find({ candidateId: req.user._id })
    .populate({
      path: "jobId",
      populate: { path: "companyId" },
    })
    .sort({ createdAt: -1 });

  return ApiResponse.success(res, { interviews });
};

const getRecruiterInterviews = async (req, res) => {
  const interviews = await Interview.find({ recruiterId: req.user._id })
    .populate("jobId", "title department requisitionCode location")
    .populate("candidateId", "name email profileImage profile")
    .sort({ createdAt: -1 });

  return ApiResponse.success(res, { interviews });
};

const submitAnswer = async (req, res) => {
  const { questionId, answer } = req.body;
  const interview = await Interview.findById(req.params.id);

  if (!interview) {
    return ApiResponse.notFound(res, "Interview not found");
  }

  if (interview.candidateId.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(
      res,
      "Only the assigned candidate can submit answers.",
    );
  }

  const question = interview.questions.find((q) => q.id === questionId);
  if (!question) {
    return ApiResponse.badRequest(res, "Question not found in this interview.");
  }

  question.answer = answer;
  if (interview.status === "created") {
    interview.status = "in_progress";
    interview.startedAt = new Date();
  }

  await interview.save();

  return ApiResponse.success(res, { interview }, "Answer saved successfully");
};

const submitInterview = async (req, res) => {
  const interview = await Interview.findById(req.params.id).populate("jobId");

  if (!interview) {
    return ApiResponse.notFound(res, "Interview not found");
  }

  if (interview.candidateId.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(res, "Unauthorized submission attempt.");
  }

  interview.status = "completed";
  interview.completedAt = new Date();

  // Trigger automated AI evaluation
  const evaluationResult = await geminiService.evaluateInterview({
    questions: interview.questions,
    jobTitle: interview.jobId?.title || "Technical Assessment",
  });

  interview.questions = evaluationResult.evaluatedQuestions;
  interview.overallEvaluation = evaluationResult.overallEvaluation;
  await interview.save();

  // Notify recruiter
  await createNotification({
    userId: interview.recruiterId,
    type: "interview_completed",
    title: "Assessment Completed",
    message: `${req.user.name} finished the technical evaluation for "${interview.jobId?.title}". Recommendation: ${evaluationResult.overallEvaluation.recommendation}.`,
    referenceId: interview._id,
    referenceType: "interview",
  });

  return ApiResponse.success(
    res,
    { interview },
    "Interview completed and evaluated successfully",
  );
};

const evaluateInterview = async (req, res) => {
  const interview = await Interview.findById(req.params.id).populate("jobId");

  if (!interview) {
    return ApiResponse.notFound(res, "Interview not found");
  }

  if (interview.recruiterId.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(
      res,
      "Unauthorized to evaluate this interview",
    );
  }

  const evaluationResult = await geminiService.evaluateInterview({
    questions: interview.questions,
    jobTitle: interview.jobId?.title || "Technical Assessment",
  });

  interview.questions = evaluationResult.evaluatedQuestions;
  interview.overallEvaluation = evaluationResult.overallEvaluation;
  await interview.save();

  return ApiResponse.success(
    res,
    {
      overallEvaluation: interview.overallEvaluation,
      questions: interview.questions,
    },
    "Interview re-evaluated successfully",
  );
};

const getReport = async (req, res) => {
  const interview = await Interview.findById(req.params.id)
    .populate({
      path: "jobId",
      populate: { path: "companyId" },
    })
    .populate("candidateId", "name email phone location profileImage profile")
    .populate("recruiterId", "name email profileImage");

  if (!interview) {
    return ApiResponse.notFound(res, "Interview report not found");
  }

  const isCandidate =
    interview.candidateId._id.toString() === req.user._id.toString();
  const isRecruiter =
    interview.recruiterId._id.toString() === req.user._id.toString();
  if (!isCandidate && !isRecruiter) {
    return ApiResponse.forbidden(
      res,
      "Unauthorized to view this interview report",
    );
  }

  // Ensure evaluation exists
  if (!interview.overallEvaluation?.summary) {
    const evaluationResult = await geminiService.evaluateInterview({
      questions: interview.questions,
      jobTitle: interview.jobId?.title || "Technical Assessment",
    });
    interview.questions = evaluationResult.evaluatedQuestions;
    interview.overallEvaluation = evaluationResult.overallEvaluation;
    await interview.save();
  }

  return ApiResponse.success(res, {
    interview,
    overallEvaluation: interview.overallEvaluation,
    questions: interview.questions,
    notes: interview.notes || [],
  });
};

const addNote = async (req, res) => {
  const { content } = req.body;
  const interview = await Interview.findById(req.params.id);

  if (!interview) {
    return ApiResponse.notFound(res, "Interview not found");
  }

  if (interview.recruiterId.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(
      res,
      "Unauthorized to add a note to this interview",
    );
  }

  const newNote = {
    authorName: req.user.name,
    role: req.user.role === "recruiter" ? "Talent Director" : "Reviewer",
    content,
    createdAt: new Date(),
  };

  interview.notes.unshift(newNote);
  await interview.save();

  return ApiResponse.created(
    res,
    { note: newNote, notes: interview.notes },
    "Hiring note posted successfully",
  );
};

module.exports = {
  createInterview,
  getInterview,
  getMyInterviews,
  getRecruiterInterviews,
  submitAnswer,
  submitInterview,
  evaluateInterview,
  getReport,
  addNote,
};
