const Job = require("../models/Job");
const Company = require("../models/Company");
const Application = require("../models/Application");
const ApiResponse = require("../utils/apiResponse");
const { generatePseudoEmbedding } = require("../services/embedding.service");
const { invalidateRecruiterOverview } = require("../services/cacheInvalidation.service");

const createJob = async (req, res) => {
  let company = await Company.findOne({ recruiterId: req.user._id });
  if (!company) {
    company = await Company.create({
      name: `${req.user.name}'s Tech Labs`,
      recruiterId: req.user._id,
    });
  }

  const jobCount = await Job.countDocuments();
  const requisitionCode = `REQ-${1040 + jobCount + 1}`;

  const textToEmbed = `${req.body.title} ${req.body.description} ${req.body.requiredSkills?.join(" ")}`;
  const embedding = generatePseudoEmbedding(textToEmbed);

  const job = await Job.create({
    ...req.body,
    requisitionCode,
    companyId: company._id,
    recruiterId: req.user._id,
    embedding,
  });

  const populatedJob = await Job.findById(job._id).populate("companyId");
  await invalidateRecruiterOverview(req.user._id);
  return ApiResponse.created(
    res,
    { job: populatedJob },
    "Job posted successfully",
  );
};

const getJobs = async (req, res) => {
  const {
    search,
    location,
    experience,
    employmentType,
    skills,
    status = "published",
    page = 1,
    limit = 12,
  } = req.query;

  const filter = {};
  if (status && status !== "all") {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { department: { $regex: search, $options: "i" } },
      { requiredSkills: { $in: [new RegExp(search, "i")] } },
    ];
  }

  if (location && location !== "All") {
    filter.location = { $regex: location, $options: "i" };
  }

  if (employmentType && employmentType !== "all") {
    filter.employmentType = employmentType;
  }

  if (skills) {
    const skillList = Array.isArray(skills)
      ? skills
      : skills.split(",").map((s) => s.trim());
    filter.requiredSkills = { $in: skillList };
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 12;
  const skip = (pageNum - 1) * limitNum;

  const total = await Job.countDocuments(filter);
  const jobs = await Job.find(filter)
    .populate("companyId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  return ApiResponse.success(res, {
    jobs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  });
};

const getJobById = async (req, res) => {
  const job = await Job.findById(req.params.id)
    .populate("companyId")
    .populate("recruiterId", "name email profileImage");
  if (!job) {
    return ApiResponse.notFound(res, "Job requisition not found.");
  }

  const canViewUnpublished =
    req.user?.role === "recruiter" &&
    job.recruiterId._id.toString() === req.user._id.toString();
  if (job.status !== "published" && !canViewUnpublished) {
    return ApiResponse.notFound(res, "Job requisition not found.");
  }

  let applicantCount = 0;
  if (canViewUnpublished) {
    applicantCount = await Application.countDocuments({ jobId: job._id });
  }

  return ApiResponse.success(res, {
    job,
    applicantCount,
  });
};

const getRecruiterJobs = async (req, res) => {
  const jobs = await Job.find({ recruiterId: req.user._id })
    .populate("companyId")
    .sort({ createdAt: -1 });

  // Enrich with applicant counts
  const enrichedJobs = await Promise.all(
    jobs.map(async (job) => {
      const applicants = await Application.countDocuments({ jobId: job._id });
      const jobObj = job.toObject();
      jobObj.applicantCount = applicants;
      return jobObj;
    }),
  );

  return ApiResponse.success(res, { jobs: enrichedJobs });
};

const updateJob = async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.id,
    recruiterId: req.user._id,
  });
  if (!job) {
    return ApiResponse.notFound(
      res,
      "Job requisition not found or unauthorized",
    );
  }

  Object.assign(job, req.body);
  await job.save();
  await invalidateRecruiterOverview(req.user._id);

  const populated = await Job.findById(job._id).populate("companyId");
  return ApiResponse.success(
    res,
    { job: populated },
    "Job updated successfully",
  );
};

const publishJob = async (req, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, recruiterId: req.user._id },
    { $set: { status: "published" } },
    { new: true },
  ).populate("companyId");

  if (!job) {
    return ApiResponse.notFound(
      res,
      "Job requisition not found or unauthorized",
    );
  }

  await invalidateRecruiterOverview(req.user._id);

  return ApiResponse.success(res, { job }, "Job published successfully");
};

const closeJob = async (req, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, recruiterId: req.user._id },
    { $set: { status: "closed" } },
    { new: true },
  ).populate("companyId");

  if (!job) {
    return ApiResponse.notFound(
      res,
      "Job requisition not found or unauthorized",
    );
  }

  await invalidateRecruiterOverview(req.user._id);

  return ApiResponse.success(res, { job }, "Job closed successfully");
};

const deleteJob = async (req, res) => {
  const job = await Job.findOneAndDelete({
    _id: req.params.id,
    recruiterId: req.user._id,
  });
  if (!job) {
    return ApiResponse.notFound(
      res,
      "Job requisition not found or unauthorized",
    );
  }

  await Application.deleteMany({ jobId: req.params.id });
  await invalidateRecruiterOverview(req.user._id);

  return ApiResponse.success(res, {}, "Job requisition deleted successfully");
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  getRecruiterJobs,
  updateJob,
  publishJob,
  closeJob,
  deleteJob,
};
