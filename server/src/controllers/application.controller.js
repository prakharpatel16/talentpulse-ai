const Application = require('../models/Application');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const ApiResponse = require('../utils/apiResponse');
const geminiService = require('../services/gemini.service');
const { createNotification } = require('../services/notification.service');
const { invalidateRecruiterOverview } = require('../services/cacheInvalidation.service');

const applyJob = async (req, res) => {
  const { jobId, resumeId, coverLetter } = req.body;

  const job = await Job.findById(jobId).populate('companyId');
  if (!job) {
    return ApiResponse.notFound(res, 'Job not found.');
  }

  if (job.status !== 'published') {
    return ApiResponse.badRequest(res, 'This job requisition is no longer accepting applications.');
  }

  const resume = await Resume.findOne({ _id: resumeId, candidateId: req.user._id });
  if (!resume) {
    return ApiResponse.badRequest(res, 'Selected resume not found or does not belong to candidate.');
  }
  if (!resume.parsedText?.trim()) {
    return ApiResponse.conflict(
      res,
      resume.processingStatus === 'failed'
        ? 'Resume processing failed. Re-run analysis before applying with this resume.'
        : 'Resume is still being processed. Please wait before submitting your application.',
    );
  }

  const existingApp = await Application.findOne({ candidateId: req.user._id, jobId });
  if (existingApp) {
    return ApiResponse.conflict(res, 'You have already submitted an application for this position.');
  }

  // Calculate algorithmic & semantic match score
  const matchResult = await geminiService.calculateMatch(
    job,
    resume.parsedText || resume.structuredData?.summary || '',
    req.user.profile?.skills || []
  );

  const application = await Application.create({
    candidateId: req.user._id,
    jobId,
    resumeId,
    coverLetter,
    status: 'applied',
    matchPercentage: matchResult.matchPercentage,
    matchData: matchResult,
    appliedAt: new Date()
  });
  await invalidateRecruiterOverview(job.recruiterId);

  // Notify recruiter
  await createNotification({
    userId: job.recruiterId,
    type: 'application_status',
    title: 'New Applicant Received',
    message: `${req.user.name} applied for "${job.title}" with a ${matchResult.matchPercentage}% algorithmic fit.`,
    referenceId: application._id,
    referenceType: 'application'
  });

  const populatedApp = await Application.findById(application._id)
    .populate('jobId')
    .populate('resumeId');

  return ApiResponse.created(res, { application: populatedApp }, 'Application submitted successfully');
};

const getMyApplications = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = { candidateId: req.user._id };
  if (status && status !== 'all') {
    filter.status = status;
  }

  const applications = await Application.find(filter)
    .populate({
      path: 'jobId',
      populate: { path: 'companyId' }
    })
    .populate('resumeId')
    .sort({ appliedAt: -1 });

  return ApiResponse.success(res, { applications });
};

const getRecruiterApplications = async (req, res) => {
  const { jobId, status, search, page = 1, limit = 50 } = req.query;

  // Find all jobs owned by this recruiter
  const recruiterJobs = await Job.find({ recruiterId: req.user._id }).select('_id');
  const jobIds = recruiterJobs.map(j => j._id);

  const filter = { jobId: { $in: jobIds } };
  if (jobId && jobId !== 'all') {
    filter.jobId = jobId;
  }
  if (status && status !== 'all') {
    filter.status = status;
  }

  const applications = await Application.find(filter)
    .populate('candidateId', 'name email phone location profileImage profile')
    .populate('jobId', 'title department requisitionCode location employmentType')
    .populate('resumeId')
    .sort({ appliedAt: -1 });

  let results = applications;
  if (search) {
    const s = search.toLowerCase();
    results = applications.filter(app => {
      const candidateName = app.candidateId?.name?.toLowerCase() || '';
      const jobTitle = app.jobId?.title?.toLowerCase() || '';
      const candidateSkills = (app.candidateId?.profile?.skills || []).map(sk => sk.toLowerCase());
      return candidateName.includes(s) || jobTitle.includes(s) || candidateSkills.some(sk => sk.includes(s));
    });
  }

  return ApiResponse.success(res, { applications: results });
};

const getApplicationById = async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate('candidateId', 'name email phone location profileImage profile')
    .populate({
      path: 'jobId',
      populate: { path: 'companyId' }
    })
    .populate('resumeId');

  if (!application) {
    return ApiResponse.notFound(res, 'Application not found');
  }

  // Authorization check: Must be the candidate OR the job's recruiter
  const isCandidate = application.candidateId._id.toString() === req.user._id.toString();
  const isRecruiter = application.jobId.recruiterId.toString() === req.user._id.toString();

  if (!isCandidate && !isRecruiter) {
    return ApiResponse.forbidden(res, 'Unauthorized to view this application.');
  }

  return ApiResponse.success(res, { application });
};

const updateStatus = async (req, res) => {
  const { status } = req.body;
  const application = await Application.findById(req.params.id)
    .populate('jobId')
    .populate('candidateId');

  if (!application) {
    return ApiResponse.notFound(res, 'Application not found');
  }

  // Verify recruiter ownership of this job
  if (application.jobId.recruiterId.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(res, 'Unauthorized: You can only update applications for your own jobs.');
  }

  application.status = status;
  await application.save();
  await invalidateRecruiterOverview(application.jobId.recruiterId);

  // Notify candidate of status change
  const statusLabels = {
    under_review: 'Under Review',
    shortlisted: 'Shortlisted',
    interview: 'Invited to Interview',
    selected: 'Selected / Offer Extended',
    rejected: 'Archived'
  };

  await createNotification({
    userId: application.candidateId._id,
    type: status === 'interview' ? 'interview_assigned' : 'application_status',
    title: `Application ${statusLabels[status] || status}`,
    message: `Your application for "${application.jobId.title}" is now ${statusLabels[status] || status}.`,
    referenceId: application._id,
    referenceType: 'application'
  });

  return ApiResponse.success(res, { application }, 'Application status updated successfully');
};

module.exports = {
  applyJob,
  getMyApplications,
  getRecruiterApplications,
  getApplicationById,
  updateStatus
};
