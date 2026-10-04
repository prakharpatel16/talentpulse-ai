import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  Clock3,
  FileText,
  LoaderCircle,
  MoreHorizontal,
  RotateCw,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { api, getApiUrl } from "../lib/api";

const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Just now";

export default function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const fileInput = useRef(null);

  async function loadResumes() {
    try {
      const result = await api.get("/resumes/me");
      setResumes(result.resumes || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load your resumes.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadResumes();
  }, []);
  useEffect(() => {
    if (
      !resumes.some((resume) =>
        ["queued", "processing"].includes(resume.processingStatus),
      )
    ) {
      return undefined;
    }
    const timer = window.setInterval(() => loadResumes(), 3000);
    return () => window.clearInterval(timer);
  }, [resumes]);
  useEffect(() => {
    if (!analysis) return;
    const latest = resumes.find((resume) => resume._id === analysis._id);
    if (latest && latest !== analysis) setAnalysis(latest);
  }, [resumes, analysis]);
  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      ![
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(file.type)
    ) {
      setError("Upload a PDF or DOCX file.");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Resume files must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("resume", file);
    try {
      await api.post("/resumes", formData);
      await loadResumes();
      notify("Resume uploaded. Analysis is starting in the background.");
    } catch (requestError) {
      setError(requestError.message || "Resume upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function makePrimary(resume) {
    try {
      await api.patch(`/resumes/${resume._id}/primary`, {});
      await loadResumes();
      notify("Primary resume updated.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  async function removeResume(resume) {
    if (
      !window.confirm(
        `Delete ${resume.fileName}? This also removes its analysis.`,
      )
    )
      return;
    try {
      await api.delete(`/resumes/${resume._id}`);
      setResumes((current) =>
        current.filter((item) => item._id !== resume._id),
      );
      setAnalysis(null);
      notify("Resume deleted.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  async function rerunAnalysis(resume) {
    setError("");
    try {
      const result = await api.post(`/ai/resume-analysis/${resume._id}`, {});
      setResumes((current) =>
        current.map((item) =>
          item._id === resume._id
            ? { ...item, processingStatus: result.processingStatus }
            : item,
        ),
      );
      setAnalysis((current) =>
        current?._id === resume._id
          ? { ...current, processingStatus: result.processingStatus }
          : current,
      );
      notify("Resume analysis queued. Results will update when processing completes.");
    } catch (requestError) {
      setError(requestError.message || "Could not start analysis.");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PROFILE MATERIALS</p>
          <h1>Resume library</h1>
          <p>
            Keep the story you share with hiring teams current and tailored.
          </p>
        </div>
        <div className="heading-actions">
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={upload}
          />
          <button
            className="button primary"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <ArrowUpFromLine size={15} />
            )}
            {uploading ? "Uploading…" : "Upload resume"}
          </button>
        </div>
      </div>
      {error && (
        <div className="notice error page-notice">
          {error}
          <button
            className="notice-close"
            onClick={() => setError("")}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="resume-layout">
        <section className="resume-main">
          <div className="panel resume-tip">
            <span className="resume-tip-icon">
              <ShieldCheck size={18} />
            </span>
            <div>
              <strong>Your information stays yours</strong>
              <p>
                Resumes are private to your account and only shared with a
                hiring team when you apply.
              </p>
            </div>
          </div>
          <div className="resume-section-heading">
            <div>
              <h2>
                Your documents <span>{resumes.length}</span>
              </h2>
              <p>PDF and DOCX files, up to 10 MB each</p>
            </div>
          </div>
          {loading ? (
            <div className="loading-block">Loading your resumes…</div>
          ) : (
            resumes.map((resume) => (
              <article
                className={`panel resume-card ${analysis?._id === resume._id ? "resume-card-active" : ""}`}
                key={resume._id}
              >
                <div className="resume-file-icon">
                  <FileText size={20} />
                </div>
                <div className="resume-card-main">
                  <div className="resume-title-row">
                    <h3>{resume.fileName}</h3>
                    {resume.isPrimary && (
                      <span className="primary-resume-badge">
                        <Star size={11} fill="currentColor" /> Primary
                      </span>
                    )}
                  </div>
                  <div className="resume-metadata">
                    <span>
                      {resume.fileType?.includes("pdf")
                        ? "PDF document"
                        : "DOCX document"}
                    </span>
                    <span>
                      {resume.fileSize
                        ? `${(resume.fileSize / 1024 / 1024).toFixed(1)} MB`
                        : ""}
                    </span>
                    <span>Added {dateLabel(resume.createdAt)}</span>
                  </div>
                  <div className="resume-status-row">
                    <span
                      className={`processing-status processing-${resume.processingStatus || "uploaded"}`}
                    >
                      {resume.processingStatus === "completed" ? (
                        <BadgeCheck size={13} />
                      ) : resume.processingStatus === "queued" ? (
                        <Clock3 size={13} />
                      ) : (
                        <LoaderCircle
                          className={
                            resume.processingStatus === "processing"
                              ? "spin"
                              : ""
                          }
                          size={13}
                        />
                      )}
                      {resume.processingStatus === "completed"
                        ? "Analysis ready"
                        : resume.processingStatus === "failed"
                          ? "Analysis needs attention"
                          : resume.processingStatus === "queued"
                            ? "Queued for analysis"
                            : "Analysis processing"}
                    </span>
                    {resume.analysis?.benchmarkScore != null && (
                      <span className="resume-score">
                        ATS benchmark{" "}
                        <strong>{resume.analysis.benchmarkScore}/100</strong>
                      </span>
                    )}
                  </div>
                </div>
                <div className="resume-actions">
                  <button
                    className="icon-button"
                    title="View analysis"
                    aria-label="View analysis"
                    onClick={() =>
                      setAnalysis(analysis?._id === resume._id ? null : resume)
                    }
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  <a
                    className="icon-button"
                    title="Download resume"
                    aria-label="Download resume"
                    href={getApiUrl(`/resumes/${resume._id}/file`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ArrowDownToLine size={16} />
                  </a>
                </div>
                <div className="resume-card-footer">
                  <button
                    className="text-button"
                    onClick={() =>
                      setAnalysis(analysis?._id === resume._id ? null : resume)
                    }
                  >
                    View AI analysis
                  </button>
                  <span className="footer-spacer" />
                  {!resume.isPrimary && (
                    <button
                      className="text-button"
                      onClick={() => makePrimary(resume)}
                    >
                      Set as primary
                    </button>
                  )}
                  <button
                    className="text-button danger-text"
                    onClick={() => removeResume(resume)}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                  <button
                    className="text-button"
                    onClick={() => rerunAnalysis(resume)}
                  >
                    <RotateCw size={13} /> Re-run analysis
                  </button>
                </div>
              </article>
            ))
          )}
          {!loading && !resumes.length && (
            <div className="panel empty-state resume-empty">
              <div className="empty-state-icon">
                <FileText size={18} />
              </div>
              <h3>Your next application starts here</h3>
              <p>
                Add a current resume to apply for roles and receive a structured
                skills review.
              </p>
              <button
                className="button primary resume-cta"
                onClick={() => fileInput.current?.click()}
              >
                <ArrowUpFromLine size={14} /> Upload resume
              </button>
            </div>
          )}
        </section>
        <aside className="resume-aside">
          <section className="panel panel-pad resume-insight">
            <div className="panel-heading">
              <div>
                <h2>Resume insights</h2>
                <p>Structured feedback, not a hiring decision</p>
              </div>
              <span className="insight-spark">
                <BadgeCheck size={15} />
              </span>
            </div>
            {analysis ? (
              <AnalysisDetails resume={analysis} />
            ) : (
              <div className="analysis-prompt">
                <span className="analysis-prompt-icon">
                  <FileText size={20} />
                </span>
                <h3>Choose a resume to review</h3>
                <p>
                  Your AI analysis includes a summary, skill signals, strengths,
                  and improvement suggestions.
                </p>
                {resumes.length > 0 && (
                  <button
                    className="button"
                    onClick={() => setAnalysis(resumes[0])}
                  >
                    Review latest analysis
                  </button>
                )}
              </div>
            )}
          </section>
          <section className="panel panel-pad resume-guidance">
            <span className="eyebrow">A STRONGER STORY</span>
            <h2>Small details make a difference.</h2>
            <ul>
              <li>
                <BadgeCheck size={14} /> Lead with outcomes and measurable
                impact
              </li>
              <li>
                <BadgeCheck size={14} /> Align skills to the role you want
              </li>
              <li>
                <BadgeCheck size={14} /> Keep dates and contact details current
              </li>
            </ul>
            <p>
              AI suggestions are optional. You decide what belongs in your
              story.
            </p>
          </section>
        </aside>
      </div>
      {toast && (
        <div className="toast-region">
          <div className="toast" role="status">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}

function AnalysisDetails({ resume }) {
  const analysis = resume.analysis || {};
  const isSourceVerified =
    analysis.model === "gemini-3.5-flash-lite" &&
    typeof analysis.summaryEvidence === "string" &&
    analysis.summaryEvidence.length > 0;
  const skills = isSourceVerified ? resume.structuredData?.skills || [] : [];
  const strengths = isSourceVerified ? analysis.strengths || [] : [];
  const suggestions = isSourceVerified ? analysis.suggestions || [] : [];
  return (
    <div className="analysis-details">
      <div className="analysis-score">
        <span className="score-ring">
          <strong>
            {isSourceVerified ? (analysis.benchmarkScore ?? "—") : "—"}
          </strong>
          <small>/100</small>
        </span>
        <span>
          <strong>
            {isSourceVerified
              ? analysis.domain || "Resume profile"
              : "Needs verified analysis"}
          </strong>
          <small>
            {isSourceVerified && analysis.yearsOfExperience
              ? `${analysis.yearsOfExperience} years of experience`
              : "Re-run analysis from the source file"}
          </small>
        </span>
      </div>
      {isSourceVerified ? (
        <div className="verified-resume-excerpt">
          <span className="answer-label">VERBATIM RESUME EVIDENCE</span>
          <p className="analysis-summary">{analysis.summaryEvidence}</p>
        </div>
      ) : (
        <p className="analysis-summary">
          {analysis.model === "unavailable"
            ? analysis.summary
            : "This saved analysis predates source verification. Re-run analysis to replace it with evidence from the uploaded file."}
        </p>
      )}
      {skills.length > 0 && (
        <div className="analysis-part">
          <h3>Skills identified</h3>
          <div className="skill-tags">
            {skills.slice(0, 8).map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </div>
      )}
      {strengths.length > 0 && (
        <div className="analysis-part">
          <h3>Strengths</h3>
          <ul>
            {strengths.slice(0, 4).map((item) => (
              <li key={item}>
                <BadgeCheck size={13} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {isSourceVerified && (analysis.weakAreas || suggestions).length > 0 && (
        <div className="analysis-part">
          <h3>Consider refining</h3>
          <ul>
            {(analysis.weakAreas || suggestions).slice(0, 4).map((item) => (
              <li key={item}>
                <span className="insight-bullet" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
