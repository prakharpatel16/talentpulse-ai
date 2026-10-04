const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createCacheService } = require("../src/services/cache.service");
const cacheKeys = require("../src/utils/cacheKeys");
const {
  createResumeQueue,
  resumeJobOptions,
} = require("../src/queues/resume.queue");
const {
  getBullMQRedisClientOptions,
} = require("../src/queues/redisClient");
const { REDIS_URL } = require("../src/config/env");
const {
  createResumeProcessor,
  createResumeWorker,
} = require("../src/workers/resume.worker");
const aiController = require("../src/controllers/ai.controller");
const Resume = require("../src/models/Resume");
const AIAnalysis = require("../src/models/AIAnalysis");
const { resumeQueue } = require("../src/queues");
const Job = require("../src/models/Job");
const applicationController = require("../src/controllers/application.controller");

class FakeRedisClient {
  constructor({ ready = true, failConnect = false } = {}) {
    this.isReady = ready;
    this.failConnect = failConnect;
    this.values = new Map();
  }

  async connect() {
    if (this.failConnect) throw new Error("Redis unavailable");
    this.isReady = true;
  }

  async get(key) {
    const entry = this.values.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() >= entry.expiresAt) {
      this.values.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, options = {}) {
    this.values.set(key, {
      value,
      expiresAt: options.EX ? Date.now() + options.EX * 1000 : null,
    });
    return "OK";
  }

  async del(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    return list.reduce((count, key) => count + Number(this.values.delete(key)), 0);
  }

  async exists(key) {
    return Number((await this.get(key)) !== null);
  }

  async scan(_cursor, { MATCH: pattern }) {
    const regex = new RegExp(`^${pattern.replaceAll("*", ".*")}$`);
    return {
      cursor: 0,
      keys: [...this.values.keys()].filter((key) => regex.test(key)),
    };
  }
}

test("Redis cache serializes values and expires them using TTL", async () => {
  const redis = new FakeRedisClient();
  const cache = createCacheService({ clientProvider: () => redis });

  assert.equal(await cache.set("jobs:featured", { count: 2 }, 1), true);
  assert.deepEqual(await cache.get("jobs:featured"), { count: 2 });
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(await cache.get("jobs:featured"), null);
});

test("Redis cache invalidation removes matching dashboard keys only", async () => {
  const redis = new FakeRedisClient();
  const cache = createCacheService({ clientProvider: () => redis });
  const recruiterKey = cacheKeys.recruiterOverview("recruiter-1");
  await cache.set(recruiterKey, { activeJobs: 1 }, 120);
  await cache.set("dashboard:candidate:candidate-1", { applications: 1 }, 120);

  assert.equal(
    await cache.delPattern(cacheKeys.recruiterOverviewPattern()),
    1,
  );
  assert.equal(await cache.get(recruiterKey), null);
  assert.deepEqual(await cache.get("dashboard:candidate:candidate-1"), {
    applications: 1,
  });
});

test("cache reads fail open when Redis cannot connect", async () => {
  const cache = createCacheService({
    clientProvider: () => new FakeRedisClient({ ready: false, failConnect: true }),
  });

  assert.equal(await cache.get("dashboard:recruiter:1:overview"), null);
  assert.equal(await cache.set("dashboard:recruiter:1:overview", {}, 60), false);
});

test("resume BullMQ queue creates identifier-only jobs with retry policy", async () => {
  class FakeQueue extends EventEmitter {
    constructor(name, options) {
      super();
      this.name = name;
      this.options = options;
      this.jobs = [];
    }

    async getJob() {
      return null;
    }

    async add(name, data, options) {
      const job = { id: options.jobId, name, data, options };
      this.jobs.push(job);
      return job;
    }

    async close() {}
  }

  const configuredQueue = createResumeQueue({
    QueueClass: FakeQueue,
    connection: { host: "localhost", port: 6379 },
  });
  const job = await configuredQueue.enqueueResumeAnalysis("resume-1", "candidate-1");

  assert.equal(configuredQueue.queue.name, "resume-processing");
  assert.deepEqual(job.data, { resumeId: "resume-1", candidateId: "candidate-1" });
  assert.deepEqual(resumeJobOptions.backoff, {
    type: "exponential",
    delay: 2000,
  });
  assert.equal(resumeJobOptions.attempts, 3);
});

test("BullMQ node-redis adapter config separates producer and worker retry behavior", () => {
  const producerOptions = getBullMQRedisClientOptions();
  const workerOptions = getBullMQRedisClientOptions({ worker: true });

  assert.equal(producerOptions.url, REDIS_URL);
  assert.equal(workerOptions.url, producerOptions.url);
  assert.equal(producerOptions.disableOfflineQueue, true);
  assert.equal(workerOptions.disableOfflineQueue, false);
  assert.equal(typeof workerOptions.socket.reconnectStrategy, "function");
});

test("resume worker processes the stored file and saves MongoDB results", async () => {
  const resume = {
    _id: "resume-1",
    candidateId: { _id: "candidate-1", name: "Candidate" },
    fileUrl: "/uploads/resume.pdf",
    fileType: "application/pdf",
    fileName: "resume.pdf",
    async save() {},
  };
  let savedAnalysis;
  let savedDocument;
  let notification;
  const processor = createResumeProcessor({
    ResumeModel: {
      findOne: () => ({ populate: async () => resume }),
    },
    AIAnalysisModel: {
      findOneAndUpdate: async (filter, update, options) => {
        savedAnalysis = { filter, update, options };
        return { _id: "analysis-1" };
      },
    },
    DocumentModel: {
      findOneAndUpdate: async (filter, update, options) => {
        savedDocument = { filter, update, options };
      },
    },
    extractText: async () => "Resume text",
    profileFromText: () => ({ skills: ["Node.js"] }),
    createEmbedding: () => [0.1, 0.2],
    analyzeResume: async () => ({ benchmarkScore: null }),
    notify: async (value) => {
      notification = value;
    },
  });

  const result = await processor({
    data: { resumeId: "resume-1", candidateId: "candidate-1" },
  });

  assert.deepEqual(result, {
    resumeId: "resume-1",
    processingStatus: "completed",
  });
  assert.equal(resume.processingStatus, "completed");
  assert.equal(savedAnalysis.filter.resumeId, "resume-1");
  assert.equal(savedDocument.filter.sourceId, "resume-1");
  assert.equal(savedDocument.update.content, "Resume text");
  assert.equal(notification.userId, "candidate-1");
});

test("worker persists failed status only after BullMQ exhausts retries", async () => {
  class FakeWorker extends EventEmitter {
    constructor(name, processor, options) {
      super();
      this.name = name;
      this.processor = processor;
      this.options = options;
    }
  }

  const updates = [];
  const notices = [];
  const worker = createResumeWorker({
    WorkerClass: FakeWorker,
    processor: async () => {},
    connection: { host: "localhost", port: 6379 },
    ResumeModel: {
      updateOne: async (...args) => updates.push(args),
    },
    notify: async (notice) => notices.push(notice),
  });
  const failedHandler = worker.listeners("failed")[0];
  const job = {
    id: "resume-analysis-resume-1",
    data: { resumeId: "resume-1", candidateId: "candidate-1" },
    opts: { attempts: 3 },
    attemptsMade: 1,
  };

  await failedHandler(job, new Error("temporary error"));
  assert.equal(updates.length, 0);
  job.attemptsMade = 3;
  await failedHandler(job, new Error("final error"));

  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0][1], {
    $set: { processingStatus: "failed" },
  });
  assert.equal(notices.length, 1);
});

test("resume analysis API responds 202 after a job is queued", async () => {
  const originalFindById = Resume.findById;
  const originalEnqueue = resumeQueue.enqueueResumeAnalysis;
  const resume = {
    _id: "resume-1",
    candidateId: { _id: "candidate-1" },
    async save() {},
  };
  let queueArgs;
  let response;
  const res = {
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      response = body;
      return this;
    },
  };

  Resume.findById = () => ({ populate: async () => resume });
  resumeQueue.enqueueResumeAnalysis = async (...args) => {
    queueArgs = args;
    return { id: "resume-analysis-resume-1" };
  };

  try {
    await aiController.startResumeAnalysis(
      {
        params: { resumeId: "resume-1" },
        user: { _id: "candidate-1", role: "candidate" },
      },
      res,
    );
    assert.equal(res.statusCode, 202);
    assert.deepEqual(queueArgs, ["resume-1", "candidate-1"]);
    assert.deepEqual(response.data, {
      resumeId: "resume-1",
      jobId: "resume-analysis-resume-1",
      processingStatus: "queued",
    });
  } finally {
    Resume.findById = originalFindById;
    resumeQueue.enqueueResumeAnalysis = originalEnqueue;
  }
});

test("resume analysis API reports queue outages without exposing Redis errors", async () => {
  const originalFindById = Resume.findById;
  const originalEnqueue = resumeQueue.enqueueResumeAnalysis;
  const resume = {
    _id: "resume-1",
    candidateId: { _id: "candidate-1" },
    async save() {},
  };
  let response;
  const res = {
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      response = body;
      return this;
    },
  };
  Resume.findById = () => ({ populate: async () => resume });
  resumeQueue.enqueueResumeAnalysis = async () => {
    throw new Error("Redis password must not appear in the response");
  };

  try {
    await aiController.startResumeAnalysis(
      {
        params: { resumeId: "resume-1" },
        user: { _id: "candidate-1", role: "candidate" },
      },
      res,
    );
    assert.equal(res.statusCode, 503);
    assert.equal(resume.processingStatus, "failed");
    assert.doesNotMatch(JSON.stringify(response), /Redis password/);
  } finally {
    Resume.findById = originalFindById;
    resumeQueue.enqueueResumeAnalysis = originalEnqueue;
  }
});

test("resume analysis status API returns pending status without synchronous AI", async () => {
  const originalFindById = Resume.findById;
  const originalFindAnalysis = AIAnalysis.findOne;
  let response;
  const resume = {
    _id: "resume-1",
    candidateId: { _id: "candidate-1" },
    processingStatus: "processing",
    fileName: "resume.pdf",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  const res = {
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      response = body;
      return this;
    },
  };
  Resume.findById = () => ({ populate: async () => resume });
  AIAnalysis.findOne = async () => null;

  try {
    await aiController.getResumeAnalysis(
      {
        params: { resumeId: "resume-1" },
        user: { _id: "candidate-1", role: "candidate" },
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(response.data.analysis, null);
    assert.equal(response.data.processingStatus, "processing");
  } finally {
    Resume.findById = originalFindById;
    AIAnalysis.findOne = originalFindAnalysis;
  }
});

test("applications wait until background resume extraction has saved text", async () => {
  const originalFindJob = Job.findById;
  const originalFindResume = Resume.findOne;
  const job = {
    _id: "job-1",
    status: "published",
    recruiterId: "recruiter-1",
  };
  const resume = { parsedText: "", processingStatus: "processing" };
  let response;
  const res = {
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      response = body;
      return this;
    },
  };
  Job.findById = () => ({ populate: async () => job });
  Resume.findOne = async () => resume;

  try {
    await applicationController.applyJob(
      {
        body: { jobId: "job-1", resumeId: "resume-1" },
        user: { _id: "candidate-1", name: "Candidate", profile: {} },
      },
      res,
    );
    assert.equal(res.statusCode, 409);
    assert.match(response.message, /still being processed/);
  } finally {
    Job.findById = originalFindJob;
    Resume.findOne = originalFindResume;
  }
});
