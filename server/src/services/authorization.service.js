const Application = require("../models/Application");
const Job = require("../models/Job");

async function canRecruiterAccessResume(recruiterId, resume) {
  if (!resume) return false;
  const jobIds = await Job.find({ recruiterId }).distinct("_id");
  const candidateId = resume.candidateId?._id || resume.candidateId;
  return Boolean(
    await Application.exists({
      candidateId,
      resumeId: resume._id,
      jobId: { $in: jobIds },
    }),
  );
}

module.exports = { canRecruiterAccessResume };
