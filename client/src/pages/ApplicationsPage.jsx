import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDot,
  Filter,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const stages = [
  "applied",
  "under_review",
  "shortlisted",
  "interview",
  "selected",
  "rejected",
];
const activeStages = stages;
const label = (value = "") =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const avatarColor = [
  "avatar-blue",
  "avatar-green",
  "avatar-amber",
  "avatar-pink",
];

function Status({ value }) {
  return (
    <span className={`pill status-${value || "applied"}`}>
      <i className="pill-dot" />
      {label(value || "applied")}
    </span>
  );
}

export default function ApplicationsPage({ pipeline = false }) {
  const { user } = useAuth();
  const recruiter = user?.role === "recruiter";
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [drawer, setDrawer] = useState(null);

  async function loadApplications() {
    setLoading(true);
    setError("");
    try {
      if (recruiter) {
        const query = new URLSearchParams({
          jobId: jobFilter,
          status: statusFilter,
          search,
        });
        const [result, jobResult] = await Promise.all([
          api.get(`/applications?${query}`),
          api.get("/jobs/recruiter/all"),
        ]);
        setApplications(result.applications || []);
        setJobs(jobResult.jobs || []);
      } else {
        const query =
          statusFilter === "all"
            ? ""
            : `?status=${encodeURIComponent(statusFilter)}`;
        const result = await api.get(`/applications/me${query}`);
        setApplications(result.applications || []);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, [recruiter]);
  useEffect(() => {
    if (recruiter) loadApplications();
  }, [jobFilter, statusFilter]);

  const filtered = useMemo(
    () =>
      applications.filter((application) => {
        const name =
          application.candidateId?.name || application.jobId?.title || "";
        const role = application.jobId?.title || "";
        return `${name} ${role} ${(application.candidateId?.profile?.skills || []).join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase());
      }),
    [applications, search],
  );

  async function updateStatus(application, status) {
    setPendingId(application._id);
    setError("");
    try {
      await api.patch(`/applications/${application._id}/status`, { status });
      setApplications((current) =>
        current.map((item) =>
          item._id === application._id ? { ...item, status } : item,
        ),
      );
      setToast(`Moved to ${label(status)}.`);
      window.setTimeout(() => setToast(""), 2600);
      setDrawer((current) =>
        current?._id === application._id ? { ...current, status } : current,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingId("");
    }
  }

  const countFor = (status) =>
    filtered.filter((application) => application.status === status).length;
  const title = pipeline
    ? "Talent pipeline"
    : recruiter
      ? "Applicants"
      : "My applications";

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {recruiter ? "CANDIDATE TRACKING" : "YOUR JOB SEARCH"}
          </p>
          <h1>{title}</h1>
          <p>
            {recruiter
              ? "Review candidate context and move each application with care."
              : "A clear view of where each opportunity stands."}
          </p>
        </div>
        {recruiter && (
          <Link className="button" to="/jobs">
            <SlidersHorizontal size={14} /> Manage roles
          </Link>
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
      <section className="application-toolbar panel">
        <div className="filter-search application-search">
          <Search size={15} />
          <input
            aria-label="Search applications"
            placeholder={
              recruiter
                ? "Search candidates, skills, roles"
                : "Search roles and companies"
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="application-filters">
          {recruiter && (
            <label className="select-wrap">
              <span className="sr-only">Filter by job</span>
              <select
                className="select"
                value={jobFilter}
                onChange={(event) => setJobFilter(event.target.value)}
              >
                <option value="all">All roles</option>
                {jobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
          )}
          <label className="select-wrap">
            <span className="sr-only">Filter by status</span>
            <select
              className="select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All stages</option>
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {label(stage)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <button
            className="icon-button refresh-apps"
            aria-label="Refresh applications"
            title="Refresh"
            onClick={loadApplications}
          >
            <Filter size={15} />
          </button>
        </div>
      </section>
      {loading ? (
        <div className="loading-block">Loading applications…</div>
      ) : recruiter && pipeline ? (
        <section className="pipeline-board">
          {activeStages.map((stage) => (
            <div className="pipeline-column" key={stage}>
              <div className={`pipeline-column-head stage-head-${stage}`}>
                <div>
                  <span className="pipeline-stage-dot" />
                  <h2>{label(stage)}</h2>
                </div>
                <span className="pipeline-count">{countFor(stage)}</span>
                <button
                  className="icon-button pipeline-menu"
                  aria-label={`${label(stage)} options`}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
              <div className="pipeline-cards">
                {filtered
                  .filter((application) => application.status === stage)
                  .map((application, index) => (
                    <article
                      className="pipeline-card panel"
                      key={application._id}
                      onClick={() => setDrawer(application)}
                    >
                      <div className="pipeline-person">
                        <span
                          className={`avatar ${avatarColor[index % avatarColor.length]}`}
                        >
                          {application.candidateId?.name
                            ?.split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("") || "TP"}
                        </span>
                        <div>
                          <strong>
                            {application.candidateId?.name || "Candidate"}
                          </strong>
                          <small>
                            {application.candidateId?.title ||
                              application.jobId?.title}
                          </small>
                        </div>
                        <button
                          className="icon-button card-menu"
                          aria-label="Candidate details"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDrawer(application);
                          }}
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      </div>
                      <div className="pipeline-card-meta">
                        <span>
                          {application.candidateId?.location ||
                            "Location not provided"}
                        </span>
                        <span>
                          {application.matchPercentage
                            ? `${application.matchPercentage}% match`
                            : "New applicant"}
                        </span>
                      </div>
                      <div className="skill-tags compact-tags">
                        {(application.candidateId?.profile?.skills || [])
                          .slice(0, 3)
                          .map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                      </div>
                      <div className="pipeline-card-foot">
                        <span>
                          Applied{" "}
                          {application.appliedAt
                            ? new Date(
                                application.appliedAt,
                              ).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                            : "recently"}
                        </span>
                        {["applied", "under_review", "shortlisted"].includes(
                          stage,
                        ) && (
                          <button
                            className="advance-button"
                            disabled={pendingId === application._id}
                            onClick={(event) => {
                              event.stopPropagation();
                              updateStatus(
                                application,
                                stages[stages.indexOf(stage) + 1],
                              );
                            }}
                            aria-label={`Advance ${application.candidateId?.name || "candidate"}`}
                          >
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                {!countFor(stage) && (
                  <p className="column-empty">No candidates at this stage</p>
                )}
              </div>
            </div>
          ))}
        </section>
      ) : recruiter ? (
        <section className="panel applicant-table">
          <div className="panel-heading">
            <div>
              <h2>
                Applicants{" "}
                <span className="table-total">{filtered.length}</span>
              </h2>
              <p>Candidate submissions for your roles</p>
            </div>
            <button className="button" onClick={loadApplications}>
              <Filter size={14} /> Refresh
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Skills</th>
                  <th>Match</th>
                  <th>Applied</th>
                  <th>Stage</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((application, index) => (
                  <tr
                    key={application._id}
                    onClick={() => setDrawer(application)}
                    className="clickable-row"
                  >
                    <td>
                      <span className="table-person">
                        <span
                          className={`avatar ${avatarColor[index % avatarColor.length]}`}
                        >
                          {application.candidateId?.name
                            ?.split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("") || "TP"}
                        </span>
                        <span>
                          <strong className="cell-main">
                            {application.candidateId?.name || "Candidate"}
                          </strong>
                          <small className="cell-sub">
                            {application.candidateId?.email}
                          </small>
                        </span>
                      </span>
                    </td>
                    <td>{application.jobId?.title || "Role"}</td>
                    <td>
                      {(application.candidateId?.profile?.skills || [])
                        .slice(0, 2)
                        .join(", ") || "—"}
                    </td>
                    <td>
                      {application.matchPercentage
                        ? `${application.matchPercentage}%`
                        : "—"}
                    </td>
                    <td>
                      {application.appliedAt
                        ? new Date(application.appliedAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )
                        : "—"}
                    </td>
                    <td>
                      <Status value={application.status} />
                    </td>
                    <td>
                      <button
                        className="icon-button row-action"
                        aria-label="Open candidate"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDrawer(application);
                        }}
                      >
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <EmptyApplications recruiter />}
          </div>
        </section>
      ) : (
        <section className="candidate-applications">
          {filtered.map((application) => (
            <article
              className="candidate-application panel"
              key={application._id}
            >
              <div className="application-company">
                <span className="company-mark">
                  {application.jobId?.companyId?.name?.slice(0, 1) || "T"}
                </span>
                <div>
                  <h2>{application.jobId?.title || "Position"}</h2>
                  <p>
                    {application.jobId?.companyId?.name || "Company"} ·{" "}
                    {application.jobId?.location ||
                      application.jobId?.employmentType}
                  </p>
                </div>
                <Status value={application.status} />
              </div>
              <div className="application-progress">
                {stages.slice(0, 5).map((stage, index) => {
                  const currentIndex = stages.indexOf(application.status);
                  const done =
                    index < currentIndex && application.status !== "rejected";
                  const current = index === currentIndex;
                  return (
                    <div
                      className={`progress-step ${done ? "done" : ""} ${current ? "current" : ""}`}
                      key={stage}
                    >
                      <span>
                        {done ? <Check size={12} /> : <CircleDot size={11} />}
                      </span>
                      <small>{label(stage)}</small>
                    </div>
                  );
                })}
              </div>
              <div className="candidate-app-foot">
                <span>
                  Applied{" "}
                  {application.appliedAt
                    ? new Date(application.appliedAt).toLocaleDateString(
                        undefined,
                        { month: "long", day: "numeric", year: "numeric" },
                      )
                    : "recently"}
                </span>
                <span>
                  {application.matchPercentage
                    ? `${application.matchPercentage}% skills alignment`
                    : ""}
                </span>
                <Link
                  to={
                    application.jobId?._id
                      ? `/jobs/${application.jobId._id}`
                      : "/jobs"
                  }
                  className="text-link"
                >
                  View role <ArrowRight size={13} />
                </Link>
              </div>
            </article>
          ))}
          {!filtered.length && (
            <div className="panel">
              <EmptyApplications />
            </div>
          )}
        </section>
      )}
      {drawer && recruiter && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDrawer(null)
          }
        >
          <aside
            className="candidate-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Candidate details"
          >
            <div className="drawer-top">
              <span className="eyebrow">APPLICATION PROFILE</span>
              <button
                className="icon-button"
                onClick={() => setDrawer(null)}
                aria-label="Close candidate details"
              >
                <X size={17} />
              </button>
            </div>
            <div className="drawer-person">
              <span className="avatar avatar-blue drawer-avatar">
                {drawer.candidateId?.name
                  ?.split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("") || "TP"}
              </span>
              <div>
                <h2>{drawer.candidateId?.name || "Candidate"}</h2>
                <p>
                  {drawer.candidateId?.title || "Applicant"} ·{" "}
                  {drawer.candidateId?.location || "Location not provided"}
                </p>
              </div>
            </div>
            <Status value={drawer.status} />
            <div className="drawer-section">
              <h3>Applied for</h3>
              <p>
                {drawer.jobId?.title || "Open role"}
                <small>
                  {drawer.jobId?.department || drawer.jobId?.location}
                </small>
              </p>
            </div>
            <div className="drawer-section">
              <h3>Skills</h3>
              <div className="skill-tags">
                {(drawer.candidateId?.profile?.skills || []).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </div>
            <div className="drawer-section">
              <h3>Candidate summary</h3>
              <p>
                {drawer.candidateId?.profile?.bio ||
                  "No profile summary provided yet."}
              </p>
            </div>
            <div className="drawer-section">
              <h3>Match overview</h3>
              <p>
                {drawer.matchData?.explanation ||
                  "A fit score is an assistive signal. Review the candidate’s experience and resume before making a decision."}
              </p>
              <strong className="drawer-score">
                {drawer.matchPercentage || 0}% <small>skills alignment</small>
              </strong>
            </div>
            <div className="drawer-actions">
              <label className="field">
                <span>Move application</span>
                <select
                  className="select"
                  value={drawer.status}
                  onChange={(event) => updateStatus(drawer, event.target.value)}
                  disabled={pendingId === drawer._id}
                >
                  {stages.map((stage) => (
                    <option key={stage} value={stage}>
                      {label(stage)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button primary"
                onClick={() => setDrawer(null)}
              >
                Done
              </button>
            </div>
          </aside>
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

function EmptyApplications({ recruiter = false }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <UserRound size={18} />
      </div>
      <h3>{recruiter ? "No applicants found" : "No applications yet"}</h3>
      <p>
        {recruiter
          ? "Try another search or publish a role to start a conversation."
          : "When you apply to a role, you can follow its progress here."}
      </p>
      {!recruiter && (
        <Link className="button primary resume-cta" to="/jobs">
          Explore roles <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
