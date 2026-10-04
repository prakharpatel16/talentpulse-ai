const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const request = require("supertest");

process.env.UPLOAD_DIR = path.join(os.tmpdir(), `talentpulse-upload-${process.pid}`);
const upload = require("../src/middleware/upload.middleware");

test("resume upload middleware accepts PDF files and writes them to UPLOAD_DIR", async () => {
  const app = express();
  app.post("/upload", upload.single("resume"), (req, res) => {
    res.status(201).json({ fileName: req.file.filename });
  });

  try {
    const response = await request(app)
      .post("/upload")
      .attach("resume", Buffer.from("%PDF-1.7 test"), {
        filename: "candidate.pdf",
        contentType: "application/pdf",
      });

    assert.equal(response.status, 201);
    assert.ok(
      fs.existsSync(path.join(process.env.UPLOAD_DIR, response.body.fileName)),
    );
  } finally {
    fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  }
});
