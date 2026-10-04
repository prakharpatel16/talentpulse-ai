import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Clock3,
  Filter,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const currency = (range) =>
  range?.min
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: range.currency || "USD",
        maximumFractionDigits: 0,
      }).format(range.min)
    : "";
const companyName = (job) => job.companyId?.name || "TalentPulse company";

export default function JobsPage() {
  const { user } = useAuth();
  const { jobId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const recruiter = user?.role === "recruiter";
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [createOpen, setCreateOpen] = useState(searchParams.get("new") === "1");
  const [applyOpen, setApplyOpen] = useState(false);

  async function loadJobs() {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ search, location, limit: "30" });
      const result = recruiter
        ? await api.get("/jobs/recruiter/all")
        : await api.get(`/jobs?${query}`);
      setJobs(result.jobs || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load roles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, [recruiter]);
  useEffect(() => {
    if (!jobId) {
      setSelected(null);
      return;
    }
    let active = true;
    api
      .get(`/jobs/${jobId}`)
      .then((result) => {
        if (active) setSelected(result.job);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [jobId]);

  useEffect(() => {
    if (applyOpen)
      api
        .get("/resumes/me")
        .then((result) => setResumes(result.resumes || []))
        .catch((requestError) => setError(requestError.message));
  }, [applyOpen]);
  useEffect(() => {
    const waitingForResumeText = resumes.some(
      (resume) =>
        !resume.parsedText?.trim() &&
        resume.processingStatus !== "failed" &&
        resume.processingStatus !== "completed",
    );
    if (!applyOpen || !waitingForResumeText) return undefined;
    const timer = window.setInterval(() => {
      api
        .get("/resumes/me")
        .then((result) => setResumes(result.resumes || []))
        .catch((requestError) => setError(requestError.message));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [applyOpen, resumes]);

  const visibleJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          !location ||
          (job.location || "").toLowerCase().includes(location.toLowerCase()),
      ),
    [jobs, location],
  );
  const readyResumes = resumes.filter((resume) => resume.parsedText?.trim());
  const resumeProcessingFailed = resumes.some(
    (resume) => resume.processingStatus === "failed",
  );
  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  async function createJob(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api.post("/jobs", {
        ...values,
        requiredSkills: values.requiredSkills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        preferredSkills: values.preferredSkills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        experience: {
          min: Number(values.experienceMin || 0),
          max: Number(values.experienceMax || 10),
        },
        salaryRange: {
          min: Number(values.salaryMin || 0),
          max: Number(values.salaryMax || 0),
          currency: values.currency || "USD",
        },
        status: "published",
      });
      setCreateOpen(false);
      await loadJobs();
      showToast("Role published successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }

  async function apply(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api.post("/applications", {
        jobId: selected._id,
        resumeId: values.resumeId,
        coverLetter: values.coverLetter,
      });
      setApplyOpen(false);
      showToast("Your application has been submitted.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }

  async function updateJob(job, action) {
    try {
      if (
        action === "delete" &&
        !window.confirm(
          `Delete ${job.title}? Existing applications will also be removed.`,
        )
      )
        return;
      if (action === "delete") await api.delete(`/jobs/${job._id}`);
      else await api.patch(`/jobs/${job._id}/${action}`, {});
      await loadJobs();
      if (selected?._id === job._id)
        setSelected({
          ...selected,
          status: action === "close" ? "closed" : "published",
        });
      showToast(
        action === "delete"
          ? "Role deleted."
          : `Role ${action === "close" ? "closed" : "published"}.`,
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {recruiter ? "HIRING WORKSPACE" : "OPPORTUNITY BOARD"}
          </p>
          <h1>{recruiter ? "Job management" : "Find your next role"}</h1>
          <p>
            {recruiter
              ? "Keep your open positions clear, current, and moving."
              : "Explore roles from teams looking for people like you."}
          </p>
        </div>
        <div className="heading-actions">
          {recruiter && (
            <button
              className="button primary"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={15} /> Create a role
            </button>
          )}
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
      <div className="job-toolbar">
        <div className="filter-search">
          <Search size={15} />
          <input
            aria-label="Search roles"
            placeholder="Search by title, skills, or team"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && loadJobs()}
          />
          <button
            className="icon-button filter-submit"
            onClick={loadJobs}
            aria-label="Search"
          >
            <ArrowRight size={15} />
          </button>
        </div>
        <label className="filter-search location-filter">
          <MapPin size={15} />
          <input
            aria-label="Filter by location"
            placeholder="Location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && loadJobs()}
          />
        </label>
        <button className="button filter-button" onClick={loadJobs}>
          <SlidersHorizontal size={14} /> Filters
        </button>
        <button
          className="icon-button sort-button"
          aria-label="Sort by newest"
          title="Sort by newest"
        >
          <ArrowDownUp size={15} />
        </button>
      </div>
      <div className="jobs-layout">
        <section className="job-results">
          <div className="results-summary">
            <span>
              <strong>{visibleJobs.length}</strong>{" "}
              {recruiter ? "roles" : "open roles"}
            </span>
            <span className="sort-label">
              Sorted by newest <ChevronDownIcon />
            </span>
          </div>
          {loading ? (
            <div className="loading-block">Loading roles…</div>
          ) : (
            visibleJobs.map((job) => (
              <article
                className={`job-card panel ${selected?._id === job._id ? "job-selected" : ""}`}
                key={job._id}
                onClick={() => navigate(`/jobs/${job._id}`)}
              >
                <div className="job-company-mark">
                  {companyName(job).slice(0, 1)}
                </div>
                <div className="job-card-content">
                  <div className="job-title-row">
                    <h2>{job.title}</h2>
                    {job.status && (
                      <span className={`pill status-${job.status}`}>
                        {job.status}
                      </span>
                    )}
                  </div>
                  <p className="job-company">
                    {companyName(job)} <span>·</span>{" "}
                    {job.department || job.employmentType || "Full-time"}
                  </p>
                  <div className="job-facts">
                    <span>
                      <MapPin size={13} />
                      {job.location || "Location flexible"}
                    </span>
                    <span>
                      <Clock3 size={13} />
                      {job.experience?.min ?? 0}–{job.experience?.max ?? 10}{" "}
                      years
                    </span>
                    {job.salaryRange?.min > 0 && (
                      <span>
                        <BriefcaseBusiness size={13} />
                        {currency(job.salaryRange)}+
                      </span>
                    )}
                  </div>
                  <div className="skill-tags">
                    {(job.requiredSkills || []).slice(0, 5).map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                  <div className="job-card-footer">
                    <span>
                      Posted{" "}
                      {new Date(job.createdAt || Date.now()).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                    </span>
                    {recruiter ? (
                      <span>
                        <Users size={13} /> {job.applicantCount ?? 0} applicants
                      </span>
                    ) : (
                      <span className="job-view-link">
                        View role <ArrowRight size={13} />
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
          {!loading && !visibleJobs.length && (
            <div className="panel empty-state">
              <div className="empty-state-icon">
                <Filter size={18} />
              </div>
              <h3>No roles match those filters</h3>
              <p>Try broadening your search or clearing the location.</p>
              <button
                className="button clear-filters"
                onClick={() => {
                  setSearch("");
                  setLocation("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
        <aside className="job-detail-column">
          {selected ? (
            <section className="panel job-detail">
              <div className="detail-topline">
                <span className="eyebrow">ROLE DETAILS</span>
                <button
                  className="icon-button"
                  onClick={() => navigate("/jobs")}
                  aria-label="Close details"
                >
                  <X size={16} />
                </button>
              </div>
              <span className="job-company-mark detail-company-mark">
                {companyName(selected).slice(0, 1)}
              </span>
              <h2>{selected.title}</h2>
              <p className="job-company">
                {companyName(selected)} <span>·</span> {selected.location}
              </p>
              <div className="detail-facts">
                <span>
                  <BriefcaseBusiness size={14} />
                  {selected.employmentType || "Full-time"}
                </span>
                <span>
                  <Clock3 size={14} />
                  {selected.experience?.min ?? 0}–
                  {selected.experience?.max ?? 10} years experience
                </span>
              </div>
              <div className="detail-section">
                <h3>About the role</h3>
                <p>
                  {selected.description ||
                    "The hiring team has not added a role description yet."}
                </p>
              </div>
              {selected.responsibilities?.length > 0 && (
                <div className="detail-section">
                  <h3>What you will do</h3>
                  <ul>
                    {selected.responsibilities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="detail-section">
                <h3>Skills and experience</h3>
                <div className="skill-tags">
                  {(selected.requiredSkills || []).map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </div>
              {selected.preferredSkills?.length > 0 && (
                <div className="detail-section">
                  <h3>Nice to have</h3>
                  <div className="skill-tags">
                    {selected.preferredSkills.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              {recruiter ? (
                <div className="detail-actions">
                  <button
                    className="button primary"
                    onClick={() => navigate("/pipeline")}
                  >
                    View applicants <ArrowRight size={14} />
                  </button>
                  {selected.status === "published" ? (
                    <button
                      className="button"
                      onClick={() => updateJob(selected, "close")}
                    >
                      Close role
                    </button>
                  ) : (
                    <button
                      className="button"
                      onClick={() => updateJob(selected, "publish")}
                    >
                      Reopen role
                    </button>
                  )}
                  <button
                    className="button danger"
                    onClick={() => updateJob(selected, "delete")}
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <button
                  className="button primary apply-button"
                  onClick={() =>
                    user
                      ? setApplyOpen(true)
                      : navigate("/login", {
                          state: { from: `/jobs/${selected._id}` },
                        })
                  }
                >
                  {user ? "Apply for this role" : "Sign in to apply"}{" "}
                  <ArrowRight size={14} />
                </button>
              )}
            </section>
          ) : (
            <section className="panel job-aside-note">
              <div className="aside-note-icon">
                <Building2 size={19} />
              </div>
              <h2>
                {recruiter
                  ? "Make space for great work"
                  : "A role should fit the whole person"}
              </h2>
              <p>
                {recruiter
                  ? "Keep each requisition focused with clear expectations, useful skills, and a hiring team that can move quickly."
                  : "Browse with intention. Compare role expectations, team context, and the skills you want to grow."}
              </p>
              {!recruiter && (
                <div className="aside-note-points">
                  <span>
                    <Check size={13} /> Search by skills and place
                  </span>
                  <span>
                    <Check size={13} /> Track every application
                  </span>
                  <span>
                    <Check size={13} /> Prepare for interviews
                  </span>
                </div>
              )}
            </section>
          )}
        </aside>
      </div>
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
            aria-labelledby="create-job-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">NEW REQUISITION</p>
                <h2 id="create-job-title">Create a job</h2>
                <p>
                  Set the role details candidates need to make a considered
                  choice.
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
            <form onSubmit={createJob}>
              <div className="form-grid">
                <div className="field span-2">
                  <label htmlFor="job-title">Job title</label>
                  <input
                    className="input"
                    id="job-title"
                    name="title"
                    placeholder="Senior product designer"
                    minLength={3}
                    maxLength={120}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="job-location">Location</label>
                  <input
                    className="input"
                    id="job-location"
                    name="location"
                    placeholder="Remote / San Francisco"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="job-type">Employment type</label>
                  <select
                    className="select"
                    id="job-type"
                    name="employmentType"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="job-min-years">Experience, min</label>
                  <input
                    className="input"
                    id="job-min-years"
                    name="experienceMin"
                    type="number"
                    min="0"
                    max="50"
                    defaultValue="2"
                  />
                </div>
                <div className="field">
                  <label htmlFor="job-max-years">Experience, max</label>
                  <input
                    className="input"
                    id="job-max-years"
                    name="experienceMax"
                    type="number"
                    min="0"
                    max="50"
                    defaultValue="6"
                  />
                </div>
                <div className="field span-2">
                  <label htmlFor="job-skills">Required skills</label>
                  <input
                    className="input"
                    id="job-skills"
                    name="requiredSkills"
                    placeholder="React, TypeScript, Figma"
                    required
                  />
                </div>
                <div className="field span-2">
                  <label htmlFor="job-preferred">Preferred skills</label>
                  <input
                    className="input"
                    id="job-preferred"
                    name="preferredSkills"
                    placeholder="Accessibility, design systems"
                  />
                </div>
                <div className="field span-2">
                  <label htmlFor="job-description">Role description</label>
                  <textarea
                    className="textarea"
                    id="job-description"
                    name="description"
                    placeholder="Describe the work, outcomes, and team context…"
                    minLength={10}
                    maxLength={5000}
                    required
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
                  {pending ? "Publishing…" : "Publish role"}{" "}
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {applyOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setApplyOpen(false)
          }
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">APPLICATION</p>
                <h2 id="apply-title">Apply to {selected?.title}</h2>
                <p>Choose the resume you want the hiring team to review.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setApplyOpen(false)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
            {readyResumes.length ? (
              <form onSubmit={apply}>
                <div className="field">
                  <label htmlFor="resume-select">Resume</label>
                  <select
                    className="select"
                    id="resume-select"
                    name="resumeId"
                    required
                    defaultValue={
                      readyResumes.find((resume) => resume.isPrimary)?._id ||
                      readyResumes[0]._id
                    }
                  >
                    {readyResumes.map((resume) => (
                      <option key={resume._id} value={resume._id}>
                        {resume.fileName}
                        {resume.isPrimary ? " · Primary" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field apply-cover">
                  <label htmlFor="cover-letter">
                    Short note <span>(optional)</span>
                  </label>
                  <textarea
                    className="textarea"
                    id="cover-letter"
                    name="coverLetter"
                    maxLength={2000}
                    placeholder="Share what drew you to this role…"
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => setApplyOpen(false)}
                  >
                    Cancel
                  </button>
                  <button className="button primary" disabled={pending}>
                    {pending ? "Submitting…" : "Submit application"}{" "}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            ) : resumes.length ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Clock3 size={18} />
                </div>
                <h3>
                  {resumeProcessingFailed
                    ? "Resume couldn't be processed"
                    : "Resume processing"}
                </h3>
                <p>
                  {resumeProcessingFailed
                    ? "Review the resume status and retry processing before applying."
                    : "You can submit as soon as the resume text is ready. This window will update automatically."}
                </p>
                {resumeProcessingFailed && (
                  <Link
                    className="button resume-cta"
                    to="/resumes"
                    onClick={() => setApplyOpen(false)}
                  >
                    Review resume status
                  </Link>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <BriefcaseBusiness size={18} />
                </div>
                <h3>Add a resume to apply</h3>
                <p>
                  Your resume is shared with this hiring team when you submit.
                </p>
                <Link
                  className="button primary resume-cta"
                  to="/resumes"
                  onClick={() => setApplyOpen(false)}
                >
                  Go to resume library
                </Link>
              </div>
            )}
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
function ChevronDownIcon() {
  return <span aria-hidden="true">⌄</span>;
}
