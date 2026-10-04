const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const request = require("supertest");
const app = require("../src/app");
const Job = require("../src/models/Job");
const Application = require("../src/models/Application");
const {
  canRecruiterAccessResume,
} = require("../src/services/authorization.service");
const geminiService = require("../src/services/gemini.service");
const {
  extractProfileFromResume,
} = require("../src/services/resume-parser.service");

test("recruiter resume access is scoped to the submitted resume on an owned job", async () => {
  const originalFind = Job.find;
  const originalExists = Application.exists;
  const jobId = "owned-job";
  const recruiterId = "recruiter-id";
  const resume = {
    _id: "submitted-resume",
    candidateId: { _id: "candidate-id" },
  };
  let query;

  Job.find = (filter) => {
    assert.equal(filter.recruiterId, recruiterId);
    return {
      distinct: async (field) => {
        assert.equal(field, "_id");
        return [jobId];
      },
    };
  };
  Application.exists = async (filter) => {
    query = filter;
    return { _id: "application-id" };
  };

  try {
    assert.equal(await canRecruiterAccessResume(recruiterId, resume), true);
    assert.equal(query.candidateId, "candidate-id");
    assert.equal(query.resumeId, "submitted-resume");
    assert.deepEqual(query.jobId.$in, [jobId]);
  } finally {
    Job.find = originalFind;
    Application.exists = originalExists;
  }
});

test("CORS allows the configured client and denies an unrelated origin", async () => {
  const allowed = await request(app)
    .options("/api/health")
    .set("Origin", "http://localhost:5173")
    .set("Access-Control-Request-Method", "GET");
  const denied = await request(app)
    .options("/api/health")
    .set("Origin", "https://attacker.example")
    .set("Access-Control-Request-Method", "GET");

  assert.equal(
    allowed.headers["access-control-allow-origin"],
    "http://localhost:5173",
  );
  assert.equal(denied.headers["access-control-allow-origin"], undefined);
});

test("production configuration rejects placeholder secrets and local database defaults", () => {
  const env = {
    ...process.env,
    NODE_ENV: "production",
    JWT_SECRET: "",
    COOKIE_SECRET: "",
    MONGODB_URI: "",
    CLIENT_URL: "",
  };
  assert.throws(
    () =>
      execFileSync(process.execPath, ["-e", "require('./src/config/env')"], {
        cwd: path.resolve(__dirname, ".."),
        env,
        stdio: "pipe",
      }),
    (error) => String(error.stderr).includes("Production requires"),
  );
});

test("AI fallback leaves interview outcomes pending for human review", async () => {
  const apiKey = geminiService.apiKey;
  geminiService.apiKey = "";
  try {
    const result = await geminiService.evaluateInterview({
      questions: [
        {
          id: "Q1",
          question: "Explain the design.",
          answer: "A lengthy response without verified assessment.",
        },
      ],
      jobTitle: "Engineer",
    });

    assert.equal(result.overallEvaluation.recommendation, "Pending");
    assert.equal(result.overallEvaluation.score, 0);
    assert.match(
      result.evaluatedQuestions[0].evaluation.feedback,
      /human reviewer/,
    );
  } finally {
    geminiService.apiKey = apiKey;
  }
});

test("Gemini transient failures retry once", async () => {
  const apiKey = geminiService.apiKey;
  const originalFetch = global.fetch;
  let calls = 0;
  geminiService.apiKey = "test-key";
  global.fetch = async () => {
    calls += 1;
    if (calls === 1) return { ok: false, status: 503 };
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "OK" }] } }],
      }),
    };
  };

  try {
    assert.equal(await geminiService._callGemini("test prompt"), "OK");
    assert.equal(calls, 2);
  } finally {
    geminiService.apiKey = apiKey;
    global.fetch = originalFetch;
  }
});

test("resume AI output drops claims without verbatim resume evidence", async () => {
  const originalApiKey = geminiService.apiKey;
  const originalFetch = global.fetch;
  const modelResult = {
    summary:
      "The resume documents React experience and an unsupported university.",
    summaryEvidence: "React and Node.js experience",
    benchmarkScore: 91,
    benchmarkScoreEvidence: "UC Berkeley degree",
    yearsOfExperience: 7,
    yearsOfExperienceEvidence: "seven years of experience",
    domain: "Full-stack software engineering",
    domainEvidence: "React and Node.js experience",
    strengths: [
      {
        claim: "React experience is listed.",
        evidence: "React and Node.js experience",
      },
      { claim: "Graduated from UC Berkeley.", evidence: "UC Berkeley degree" },
    ],
    weakAreas: [],
    suggestions: [],
    skills: {
      technical: [
        { name: "React", evidence: "React and Node.js experience" },
        { name: "Go", evidence: "Go experience" },
      ],
      tools: [],
      soft: [],
    },
  };
  geminiService.apiKey = "test-key";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(modelResult) }] } },
      ],
    }),
  });

  try {
    const result = await geminiService.analyzeResume(
      "React and Node.js experience",
    );
    assert.equal(result.benchmarkScore, null);
    assert.equal(result.yearsOfExperience, null);
    assert.deepEqual(result.strengths, ["React experience is listed."]);
    assert.deepEqual(result.skills.technical, ["React"]);
    assert.equal(result.domain, "Full-stack software engineering");
    assert.equal(result.model, "gemini-3.5-flash-lite");

    const profile = extractProfileFromResume("React and Node.js experience", {
      name: "Candidate",
    });
    assert.deepEqual(profile.education, []);
    assert.equal(profile.summary, undefined);
  } finally {
    geminiService.apiKey = originalApiKey;
    global.fetch = originalFetch;
  }
});
