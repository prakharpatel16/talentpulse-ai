const path = require("node:path");
const { readFile } = require("node:fs/promises");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

const MAX_EXTRACTED_CHARACTERS = 100_000;

function normalizeText(value) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);
}

async function extractResumeText(filePath, mimeType) {
  const extension = path.extname(filePath).toLowerCase();
  let extracted;

  if (mimeType === "application/pdf" && extension === ".pdf") {
    const parser = new PDFParse({ data: await readFile(filePath) });
    try {
      const result = await parser.getText();
      extracted = result.text;
    } finally {
      await parser.destroy();
    }
  } else if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    extension === ".docx"
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    extracted = result.value;
  } else {
    throw new Error("Only valid PDF and DOCX resumes can be analyzed.");
  }

  const text = normalizeText(extracted || "");
  if (text.length < 20) {
    throw new Error(
      "No readable text was found. This resume may be scanned; OCR is not available yet.",
    );
  }
  return text;
}

function extractProfileFromResume(text, account = {}) {
  const match = (pattern) => text.match(pattern)?.[0];
  const email = match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phone = match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  const knownSkills = [
    "React",
    "Node.js",
    "TypeScript",
    "JavaScript",
    "Next.js",
    "Express",
    "MongoDB",
    "PostgreSQL",
    "Redis",
    "Docker",
    "GraphQL",
    "AWS",
    "Tailwind CSS",
    "Redux",
    "System Design",
    "CI/CD",
  ];
  const lowerText = text.toLowerCase();

  return {
    name: account.name || undefined,
    email,
    phone,
    location: account.location || undefined,
    summary: undefined,
    skills: knownSkills.filter((skill) =>
      lowerText.includes(skill.toLowerCase()),
    ),
    experience: [],
    education: [],
    projects: [],
    certifications: [],
  };
}

module.exports = { extractResumeText, extractProfileFromResume, normalizeText };
