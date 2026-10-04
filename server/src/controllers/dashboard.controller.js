const Job = require("../models/Job");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const ApiResponse = require("../utils/apiResponse");
const cacheClient = require("../services/cache.service");
const cacheKeys = require("../utils/cacheKeys");

const getOverview = async (req, res) => {
  const cacheKey = cacheKeys.recruiterOverview(req.user._id);
  const cached = await cacheClient.get(cacheKey);
  if (cached) {
    return ApiResponse.success(res, cached);
  }

  const jobs = await Job.find({ recruiterId: req.user._id });
  const jobIds = jobs.map((j) => j._id);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const applicationFilter = { jobId: { $in: jobIds } };
  const [
    totalApplications,
    underReview,
    shortlisted,
    interviews,
    selected,
    appliedThisWeek,
  ] = await Promise.all([
    Application.countDocuments(applicationFilter),
    Application.countDocuments({
      ...applicationFilter,
      status: "under_review",
    }),
    Application.countDocuments({ ...applicationFilter, status: "shortlisted" }),
    Interview.countDocuments({ recruiterId: req.user._id }),
    Application.countDocuments({ ...applicationFilter, status: "selected" }),
    Application.countDocuments({
      ...applicationFilter,
      appliedAt: { $gte: weekStart },
    }),
  ]);

  const data = {
    activeJobs: jobs.filter((j) => j.status === "published").length,
    totalApplications,
    underReview,
    shortlisted,
    interviews,
    selected,
    velocity: { appliedThisWeek },
  };

  await cacheClient.set(cacheKey, data, 120);
  return ApiResponse.success(res, data);
};

const getAnalytics = async (req, res) => {
  const { jobId, from, to } = req.query;
  const jobs = await Job.find({ recruiterId: req.user._id })
    .select("_id title requisitionCode")
    .lean();
  const ownedJobs = jobId
    ? jobs.filter((job) => job._id.toString() === jobId)
    : jobs;
  if (jobId && !ownedJobs.length) {
    return ApiResponse.notFound(res, "Job requisition not found");
  }

  const filter = { jobId: { $in: ownedJobs.map((job) => job._id) } };
  if (from || to) {
    filter.appliedAt = {};
    if (from) {
      const start = new Date(from);
      if (Number.isNaN(start.valueOf()))
        return ApiResponse.badRequest(res, "Invalid start date");
      filter.appliedAt.$gte = start;
    }
    if (to) {
      const end = new Date(to);
      if (Number.isNaN(end.valueOf()))
        return ApiResponse.badRequest(res, "Invalid end date");
      end.setHours(23, 59, 59, 999);
      filter.appliedAt.$lte = end;
    }
  }

  const [total, statusRows, activityRows, jobRows] = await Promise.all([
    Application.countDocuments(filter),
    Application.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$appliedAt" } },
          applications: { $sum: 1 },
          shortlisted: {
            $sum: { $cond: [{ $eq: ["$status", "shortlisted"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Application.aggregate([
      { $match: filter },
      { $group: { _id: "$jobId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const counts = Object.fromEntries(
    statusRows.map((row) => [row._id, row.count]),
  );
  const statusColors = {
    applied: "#64748B",
    under_review: "#D97706",
    shortlisted: "#0284C7",
    interview: "#4F46E5",
    selected: "#059669",
    rejected: "#E11D48",
  };
  const stages = [
    "applied",
    "under_review",
    "shortlisted",
    "interview",
    "selected",
  ];
  const applicationsOverTime = activityRows.map((row) => ({
    date: new Date(`${row._id}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    applications: row.applications,
    shortlisted: row.shortlisted,
  }));
  const applicationByStatus = Object.entries(statusColors).map(
    ([status, color]) => ({
      status: status
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
      count: counts[status] || 0,
      color,
    }),
  );
  const recruitmentFunnel = stages.map((stage) => ({
    stage: stage
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    value: counts[stage] || 0,
    percentage: total
      ? `${Math.round(((counts[stage] || 0) / total) * 100)}%`
      : "0%",
  }));
  const jobsById = new Map(jobs.map((job) => [job._id.toString(), job]));
  const applicationsByJob = jobRows.map((row) => {
    const job = jobsById.get(row._id.toString());
    return {
      title: `${job?.title || "Role"}${job?.requisitionCode ? ` (#${job.requisitionCode})` : ""}`,
      count: row.count,
    };
  });

  return ApiResponse.success(res, {
    applicationsOverTime,
    applicationByStatus,
    recruitmentFunnel,
    applicationsByJob,
  });
};

module.exports = {
  getOverview,
  getAnalytics,
};
