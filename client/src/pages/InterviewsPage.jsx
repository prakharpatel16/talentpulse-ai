import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  MessageSquareText,
  Plus,
  Send,
  Sparkles,
  Star,
  Video,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const label = (value = "") =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function InterviewsPage() {
  const { user } = useAuth();
  const recruiter = user?.role === "recruiter";
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      if (recruiter) {
        const [interviewResult, applicationResult, jobResult] =
          await Promise.all([
            api.get("/interviews/recruiter/all"),
            api.get("/applications"),
            api.get("/jobs/recruiter/all"),
          ]);
        setInterviews(interviewResult.interviews || []);
        setApplications(applicationResult.applications || []);
        setJobs(jobResult.jobs || []);
      } else {
        const result = await api.get("/interviews/candidate/me");
        setInterviews(result.interviews || []);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to load interviews.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [recruiter]);

  async function openInterview(interview) {
    setError("");
    try {
      const result = await api.get(`/interviews/${interview._id}`);
      setSelected(result.interview);
      setAnswers({});
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  async function submitAnswer(event, question) {
    event.preventDefault();
    const answer = answers[question.id] || question.answer || "";
    if (!answer.trim()) return;
    setPending(true);
    setError("");
    try {
      const result = await api.post(`/interviews/${selected._id}/answer`, {
        questionId: question.id,
        answer,
      });
      setSelected(result.interview);
      setAnswers((current) => ({ ...current, [question.id]: "" }));
      setToast("Answer saved.");
      window.setTimeout(() => setToast(""), 2500);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }
  async function finishInterview() {
    if (
      !window.confirm(
        "Submit your completed answers for review? You will not be able to edit them afterward.",
      )
    )
      return;
    setPending(true);
    setError("");
    try {
      const result = await api.post(`/interviews/${selected._id}/submit`, {});
      setSelected(result.interview);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }
  async function createInterview(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api.post("/interviews", {
        jobId: values.jobId,
        candidateId: values.candidateId,
        experienceLevel: values.experienceLevel,
        interviewType: values.interviewType,
        numberOfQuestions: Number(values.numberOfQuestions),
        requiredSkills: values.requiredSkills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
      });
      setInterviews((current) => [result.interview, ...current]);
      setCreateOpen(false);
      setToast("Interview created and candidate notified.");
      window.setTimeout(() => setToast(""), 2800);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }
  async function addNote(event) {
    event.preventDefault();
    if (!note.trim()) return;
    setPending(true);
    try {
      const result = await api.post(`/interviews/${selected._id}/notes`, {
        content: note,
      });
      setSelected((current) => ({
        ...current,
        notes: result.notes || [result.note, ...(current.notes || [])],
      }));
      setNote("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }
  async function getReport(interview) {
    setPending(true);
    setError("");
    try {
      const result = await api.get(`/interviews/${interview._id}/report`);
      setSelected(result.interview);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }

  const appliedPeople = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.candidateId?._id && application.status !== "rejected",
      ),
    [applications],
  );
  if (selected)
    return (
      <InterviewDetail
        interview={selected}
        recruiter={recruiter}
        answers={answers}
        setAnswers={setAnswers}
        pending={pending}
        error={error}
        note={note}
        setNote={setNote}
        onBack={() => setSelected(null)}
        onAnswer={submitAnswer}
        onFinish={finishInterview}
        onNote={addNote}
      />
    );

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {recruiter ? "ASSESSMENT WORKSPACE" : "YOUR CONVERSATIONS"}
          </p>
          <h1>{recruiter ? "Interview management" : "Interview practice"}</h1>
          <p>
            {recruiter
              ? "Create focused, structured interviews and review candidate responses."
              : "Prepare for what is next with thoughtful, role-relevant practice."}
          </p>
        </div>
        {recruiter && (
          <button
            className="button primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={15} /> Create interview
          </button>
        )}
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
      <section className="interview-summary-grid">
        <article className="metric-card">
          <div className="metric-top">
            <span>{recruiter ? "Scheduled" : "Available"}</span>
            <span className="metric-icon">
              <CalendarClock size={16} />
            </span>
          </div>
          <div className="metric-value">
            {interviews.filter((item) => item.status !== "completed").length}
          </div>
          <p className="metric-note">
            {recruiter ? "Awaiting candidate completion" : "Ready when you are"}
          </p>
        </article>
        <article className="metric-card">
          <div className="metric-top">
            <span>Completed</span>
            <span className="metric-icon tone-green">
              <BadgeCheck size={16} />
            </span>
          </div>
          <div className="metric-value">
            {interviews.filter((item) => item.status === "completed").length}
          </div>
          <p className="metric-note">Reviewed conversations</p>
        </article>
        <article className="metric-card">
          <div className="metric-top">
            <span>Format</span>
            <span className="metric-icon tone-slate">
              <Video size={16} />
            </span>
          </div>
          <div className="interview-metric-label">Text-based</div>
          <p className="metric-note">Structured, asynchronous sessions</p>
        </article>
      </section>
      {loading ? (
        <div className="loading-block">Loading interviews…</div>
      ) : interviews.length ? (
        <section className="interview-grid">
          {interviews.map((interview) => {
            const person = recruiter ? interview.candidateId : null;
            const title = interview.jobId?.title || "Technical assessment";
            return (
              <article className="panel interview-card" key={interview._id}>
                <div className="interview-card-top">
                  <span className="interview-card-icon">
                    <Video size={17} />
                  </span>
                  <span
                    className={`pill ${interview.status === "completed" ? "status-selected" : interview.status === "in_progress" ? "status-shortlisted" : "status-applied"}`}
                  >
                    <i className="pill-dot" />
                    {label(interview.status)}
                  </span>
                </div>
                <h2>{title}</h2>
                <p className="interview-card-sub">
                  {recruiter
                    ? person?.name || person?.email || "Candidate"
                    : interview.jobId?.companyId?.name || "Your hiring team"}
                </p>
                <div className="interview-card-meta">
                  <span>
                    <CircleHelp size={13} />
                    {interview.questions?.length ||
                      interview.numberOfQuestions ||
                      0}{" "}
                    questions
                  </span>
                  <span>
                    <Clock3 size={13} />
                    {label(interview.interviewType || "technical")}
                  </span>
                </div>
                <div className="interview-card-foot">
                  <span>
                    {interview.createdAt
                      ? new Date(interview.createdAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )
                      : "Recently assigned"}
                  </span>
                  <button
                    className="button interview-open"
                    onClick={() =>
                      recruiter && interview.status === "completed"
                        ? getReport(interview)
                        : openInterview(interview)
                    }
                  >
                    {recruiter
                      ? interview.status === "completed"
                        ? "Review report"
                        : "View session"
                      : interview.status === "completed"
                        ? "View feedback"
                        : interview.status === "in_progress"
                          ? "Continue"
                          : "Begin interview"}{" "}
                    <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="panel empty-state">
          <div className="empty-state-icon">
            <Video size={18} />
          </div>
          <h3>
            {recruiter
              ? "No interview sessions yet"
              : "No interviews assigned yet"}
          </h3>
          <p>
            {recruiter
              ? "Create a focused assessment for a candidate in your pipeline."
              : "When a hiring team invites you, your interview will appear here."}
          </p>
          {recruiter && (
            <button
              className="button primary resume-cta"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} /> Create interview
            </button>
          )}
        </div>
      )}
      {createOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setCreateOpen(false)
          }
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-interview-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">STRUCTURED ASSESSMENT</p>
                <h2 id="create-interview-title">Create an interview</h2>
                <p>
                  Questions are generated for the role and experience level.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setCreateOpen(false)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
            <form onSubmit={createInterview}>
              <div className="form-grid">
                <div className="field span-2">
                  <label htmlFor="interview-job">Role</label>
                  <select
                    className="select"
                    name="jobId"
                    id="interview-job"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a requisition
                    </option>
                    {jobs.map((job) => (
                      <option key={job._id} value={job._id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field span-2">
                  <label htmlFor="interview-candidate">Candidate</label>
                  <select
                    className="select"
                    name="candidateId"
                    id="interview-candidate"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select an applicant
                    </option>
                    {appliedPeople.map((application) => (
                      <option
                        key={application._id}
                        value={application.candidateId._id}
                      >
                        {application.candidateId.name} ·{" "}
                        {application.jobId?.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="interview-type">Interview format</label>
                  <select
                    className="select"
                    name="interviewType"
                    id="interview-type"
                  >
                    <option value="technical">Technical</option>
                    <option value="system_design">System design</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="interview-level">Experience level</label>
                  <select
                    className="select"
                    name="experienceLevel"
                    id="interview-level"
                  >
                    <option value="entry">Entry</option>
                    <option value="mid">Mid-level</option>
                    <option value="senior" selected>
                      Senior
                    </option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="interview-count">Question count</label>
                  <select
                    className="select"
                    name="numberOfQuestions"
                    id="interview-count"
                  >
                    <option>3</option>
                    <option selected>5</option>
                    <option>8</option>
                    <option>10</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="interview-skills">Focus skills</label>
                  <input
                    className="input"
                    id="interview-skills"
                    name="requiredSkills"
                    placeholder="React, APIs"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </button>
                <button className="button primary" disabled={pending}>
                  {pending ? "Creating…" : "Generate & assign"}{" "}
                  <Sparkles size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
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

function InterviewDetail({
  interview,
  recruiter,
  answers,
  setAnswers,
  pending,
  error,
  note,
  setNote,
  onBack,
  onAnswer,
  onFinish,
  onNote,
}) {
  const questions = interview.questions || [];
  const answered = questions.filter((question) =>
    (answers[question.id] || question.answer || "").trim(),
  ).length;
  const completed = interview.status === "completed";
  return (
    <div className="interview-detail-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={14} /> All interviews
      </button>
      {error && <div className="notice error page-notice">{error}</div>}
      <div className="page-heading interview-detail-heading">
        <div>
          <p className="eyebrow">
            {recruiter ? "CANDIDATE SESSION" : "YOUR ASSESSMENT"}
          </p>
          <h1>{interview.jobId?.title || "Technical interview"}</h1>
          <p>
            {recruiter
              ? `Candidate: ${interview.candidateId?.name || "Candidate"} · `
              : ""}
            {label(interview.interviewType || "technical")} · {questions.length}{" "}
            questions
          </p>
        </div>
        <span
          className={`pill ${completed ? "status-selected" : "status-shortlisted"}`}
        >
          <i className="pill-dot" />
          {label(interview.status)}
        </span>
      </div>
      <div className="interview-detail-layout">
        <section className="interview-question-list">
          {questions.map((question, index) => (
            <article className="panel question-card" key={question.id}>
              <div className="question-heading">
                <span className="question-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="question-kind">
                  {label(interview.interviewType || "technical")} prompt
                </span>
                {question.answer && (
                  <span className="answer-saved">
                    <Check size={12} /> Saved
                  </span>
                )}
              </div>
              <h2>{question.question}</h2>
              {recruiter || completed ? (
                <>
                  <div className="answer-block">
                    <span className="answer-label">CANDIDATE RESPONSE</span>
                    <p>{question.answer || "No response submitted."}</p>
                  </div>
                  {question.evaluation?.feedback && (
                    <div className="feedback-block">
                      <span className="answer-label">AI FEEDBACK</span>
                      <p>{question.evaluation.feedback}</p>
                      <div className="score-pills">
                        {[
                          "relevance",
                          "technicalUnderstanding",
                          "completeness",
                          "clarity",
                        ].map((score) => (
                          <span key={score}>
                            {label(score)}{" "}
                            <strong>{question.evaluation[score] || 0}/5</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={(event) => onAnswer(event, question)}>
                  <textarea
                    className="textarea interview-answer"
                    placeholder="Write your response…"
                    value={answers[question.id] ?? question.answer ?? ""}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }
                    minLength={1}
                    maxLength={5000}
                    required
                    disabled={completed}
                  />
                  <div className="answer-actions">
                    <span>
                      {(answers[question.id] || question.answer || "").length}
                      /5000
                    </span>
                    <button
                      className="button"
                      disabled={
                        pending ||
                        !(answers[question.id] || question.answer || "").trim()
                      }
                    >
                      <Check size={13} /> Save response
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
          {!recruiter && !completed && (
            <div className="submit-interview panel">
              <div>
                <strong>
                  {answered} of {questions.length} answers ready
                </strong>
                <p>
                  You can save each answer as you go. Submitting finishes the
                  session.
                </p>
              </div>
              <button
                className="button primary"
                disabled={pending || answered < questions.length}
                onClick={onFinish}
              >
                Submit interview <Send size={14} />
              </button>
            </div>
          )}
        </section>
        <aside className="interview-side">
          <section className="panel panel-pad">
            <div className="panel-heading">
              <div>
                <h2>Session overview</h2>
                <p>Role-specific text assessment</p>
              </div>
              <FileText size={16} color="#64748b" />
            </div>
            <div className="session-stat">
              <span>Questions</span>
              <strong>{questions.length}</strong>
            </div>
            <div className="session-stat">
              <span>Responses</span>
              <strong>
                {questions.filter((question) => question.answer).length}/
                {questions.length}
              </strong>
            </div>
            <div className="session-stat">
              <span>Experience level</span>
              <strong>{label(interview.experienceLevel || "senior")}</strong>
            </div>
            {interview.overallEvaluation?.summary && (
              <div className="overall-feedback">
                <span className="answer-label">OVERALL SUMMARY</span>
                <p>{interview.overallEvaluation.summary}</p>
                {interview.overallEvaluation.strengths?.length > 0 && (
                  <>
                    <h3>Strengths</h3>
                    <ul>
                      {interview.overallEvaluation.strengths.map((item) => (
                        <li key={item}>
                          <Star size={12} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {interview.overallEvaluation.weakAreas?.length > 0 && (
                  <>
                    <h3>Areas to explore</h3>
                    <ul>
                      {interview.overallEvaluation.weakAreas.map((item) => (
                        <li key={item}>
                          <CircleHelp size={12} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>
          {recruiter && (
            <section className="panel panel-pad interviewer-notes">
              <div className="panel-heading">
                <div>
                  <h2>Hiring notes</h2>
                  <p>Internal notes for your team</p>
                </div>
                <MessageSquareText size={16} color="#64748b" />
              </div>
              <form onSubmit={onNote}>
                <textarea
                  className="textarea"
                  placeholder="Add context for your hiring team…"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={2000}
                  required
                />
                <button className="button" disabled={pending || !note.trim()}>
                  <Plus size={13} /> Add note
                </button>
              </form>
              {(interview.notes || []).map((item, index) => (
                <div className="hiring-note" key={`${item.createdAt}-${index}`}>
                  <strong>
                    {item.authorName || "Team member"}{" "}
                    <small>{label(item.role || "recruiter")}</small>
                  </strong>
                  <p>{item.content}</p>
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
