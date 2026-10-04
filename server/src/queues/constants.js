const RESUME_QUEUE_NAME = "resume-processing";
const resumeJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { age: 86400, count: 1000 },
  removeOnFail: { age: 604800 },
};

module.exports = { RESUME_QUEUE_NAME, resumeJobOptions };
