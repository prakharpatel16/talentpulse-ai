import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  FileText,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const stages = [
  "applied",
  "under_review",
  "shortlisted",
  "interview",
  "selected",
];
const stageLabel = (value = "") =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const displayDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Recently";

function Metric({ label, value, note, icon: Icon, tone = "blue" }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon tone-${tone}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className="metric-value">{value ?? 0}</div>
      <p className="metric-note">{note}</p>
    </article>
  );
}

function StatusPill({ status }) {
  return (
    <span className={`pill status-${status || "applied"}`}>
      <i className="pill-dot" />
      {stageLabel(status || "applied")}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const recruiter = user?.role === "recruiter";
  const [state, setState] = useState({
    loading: true,
    error: "",
    overview: {},
    jobs: [],
    applications: [],
    resumes: [],
    interviews: [],
  });

  useEffect(() => {
    let active = true;
    const paths = recruiter
      ? [
          api.get("/dashboard/overview"),
          api.get("/jobs/recruiter/all"),
          api.get("/applications"),
          api.get("/interviews/recruiter/all"),
        ]
      : [
          api.get("/applications/me"),
          api.get("/resumes/me"),
          api.get("/interviews/candidate/me"),
          api.get("/jobs?limit=4"),
        ];
    Promise.allSettled(paths).then((results) => {
      if (!active) return;
      const value = (index, key) =>
        results[index].status === "fulfilled"
          ? results[index].value?.[key]
          : [];
      setState({
        loading: false,
        error: results.every((result) => result.status === "rejected")
          ? "We could not load your workspace data. Check that the API server is running."
          : "",
        overview: recruiter
          ? results[0].status === "fulfilled"
            ? results[0].value
            : {}
          : {},
        jobs: recruiter ? value(1, "jobs") : value(3, "jobs"),
        applications: recruiter
          ? value(2, "applications")
          : value(0, "applications"),
        resumes: recruiter ? [] : value(1, "resumes"),
        interviews: recruiter ? value(3, "interviews") : value(2, "interviews"),
      });
    });
    return () => {
      active = false;
    };
  }, [recruiter]);

  const counts = useMemo(
    () =>
      stages.reduce(
        (result, stage) => ({
          ...result,
          [stage]: state.applications.filter(
            (application) => application.status === stage,
          ).length,
        }),
        {},
      ),
    [state.applications],
  );
  const upcomingInterviews = state.interviews.filter(
    (interview) => interview.status !== "completed",
  );
  const chartData = useMemo(() => {
    const week = new Map();
    state.applications.forEach((application) => {
      const date = new Date(application.appliedAt || application.createdAt);
      if (Number.isNaN(date.valueOf())) return;
      const key = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      week.set(key, (week.get(key) || 0) + 1);
    });
    const data = [...week].map(([date, applications]) => ({
      date,
      applications,
    }));
    return data.length
      ? data.slice(-7)
      : [{ date: "No data", applications: 0 }];
  }, [state.applications]);

  if (state.loading)
    return <div className="loading-block">Preparing your workspace…</div>;
  const title = recruiter
    ? "Recruiter dashboard"
    : "Your next move starts here";

  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">
            {recruiter ? "TALENT OPERATIONS" : "CANDIDATE HOME"}
          </p>
          <h1>{title}</h1>
          <p>
            {recruiter
              ? "A live view of open roles, applicant movement, and upcoming conversations."
              : `Welcome back, ${user?.name?.split(" ")[0] || "there"}. Keep your search moving at your own pace.`}
          </p>
        </div>
        <div className="heading-actions">
          {recruiter ? (
            <Link className="button primary" to="/jobs?new=1">
              <BriefcaseBusiness size={15} /> Create a role
            </Link>
          ) : (
            <Link className="button primary" to="/jobs">
              <SearchIcon /> Explore roles
            </Link>
          )}
        </div>
      </div>
      {state.error && (
        <div className="notice error dashboard-error">{state.error}</div>
      )}
      {recruiter ? (
        <>
          <section className="metric-grid">
            <Metric
              label="Active roles"
              value={state.overview.activeJobs}
              note="Published requisitions"
              icon={BriefcaseBusiness}
            />
            <Metric
              label="Applications"
              value={state.overview.totalApplications}
              note="Across all open roles"
              icon={Users}
              tone="slate"
            />
            <Metric
              label="In review"
              value={state.overview.underReview}
              note="Ready for a decision"
              icon={CircleUserRound}
              tone="amber"
            />
            <Metric
              label="Interviews"
              value={state.overview.interviews}
              note={`${state.overview.shortlisted ?? 0} shortlisted`}
              icon={Video}
              tone="green"
            />
          </section>
          <div className="section-grid">
            <section className="panel panel-pad chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Applicant activity</h2>
                  <p>Applications submitted over time</p>
                </div>
                <span className="chart-legend">
                  <span>
                    <i />
                    Applications
                  </span>
                </span>
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 8, right: 5, left: -22, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="activityFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#1d4ed8"
                          stopOpacity={0.18}
                        />
                        <stop
                          offset="100%"
                          stopColor="#1d4ed8"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#edf1f7" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: "#718096" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: "#718096" }}
                    />
                    <Tooltip
                      contentStyle={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 7,
                        fontSize: 10,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="applications"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      fill="url(#activityFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="panel panel-pad">
              <div className="panel-heading">
                <div>
                  <h2>Open requisitions</h2>
                  <p>Your current hiring priorities</p>
                </div>
                <Link className="text-link" to="/jobs">
                  All roles <ArrowRight size={13} />
                </Link>
              </div>
              <div className="role-list">
                {state.jobs.slice(0, 5).map((job) => (
                  <Link
                    className="role-row"
                    to={`/jobs/${job._id}`}
                    key={job._id}
                  >
                    <span className="role-icon">
                      <BriefcaseBusiness size={15} />
                    </span>
                    <span className="role-copy">
                      <strong>{job.title}</strong>
                      <small>
                        {job.department || job.location || "Open position"}
                      </small>
                    </span>
                    <span className="role-count">
                      {job.applicantCount ?? 0}
                      <small>applicants</small>
                    </span>
                  </Link>
                ))}
                {!state.jobs.length && (
                  <EmptyLine text="Your published roles will appear here." />
                )}
              </div>
            </section>
          </div>
          <section className="panel dashboard-table-panel">
            <div className="panel-heading">
              <div>
                <h2>Recent applicants</h2>
                <p>Latest candidates across your requisitions</p>
              </div>
              <Link className="text-link" to="/pipeline">
                Open pipeline <ArrowRight size={13} />
              </Link>
            </div>
            <ApplicantTable applications={state.applications.slice(0, 6)} />
            {!state.applications.length && (
              <EmptyLine text="New applications will show up here as candidates apply." />
            )}
          </section>
        </>
      ) : (
        <>
          <section className="candidate-welcome panel">
            <div className="welcome-copy">
              <span className="welcome-mark">
                <Sparkles size={17} />
              </span>
              <div>
                <span className="eyebrow">YOUR SEARCH, IN FOCUS</span>
                <h2>Every good fit begins with a first step.</h2>
                <p>
                  Keep your profile current, explore thoughtful matches, and
                  stay on top of conversations.
                </p>
              </div>
            </div>
            <Link to="/settings" className="button">
              Complete your profile <ArrowRight size={14} />
            </Link>
          </section>
          <section className="metric-grid candidate-metrics">
            <Metric
              label="Applications"
              value={state.applications.length}
              note="Opportunities in progress"
              icon={BriefcaseBusiness}
            />
            <Metric
              label="In review"
              value={counts.under_review || 0}
              note="Waiting on the hiring team"
              icon={CircleUserRound}
              tone="amber"
            />
            <Metric
              label="Interviews"
              value={state.interviews.length}
              note="Conversations ahead"
              icon={Video}
              tone="green"
            />
            <Metric
              label="Resumes"
              value={state.resumes.length}
              note={state.resumes[0]?.fileName || "Upload your latest resume"}
              icon={FileText}
              tone="slate"
            />
          </section>
          <div className="section-grid">
            <section className="panel panel-pad">
              <div className="panel-heading">
                <div>
                  <h2>Recent applications</h2>
                  <p>Know where every conversation stands</p>
                </div>
                <Link className="text-link" to="/applications">
                  View all <ArrowRight size={13} />
                </Link>
              </div>
              <ApplicationList applications={state.applications.slice(0, 5)} />
            </section>
            <section className="panel panel-pad">
              <div className="panel-heading">
                <div>
                  <h2>Upcoming interviews</h2>
                  <p>Your next conversations</p>
                </div>
                <CalendarDays size={17} color="#64748b" />
              </div>
              {upcomingInterviews.slice(0, 3).map((interview) => (
                <div className="interview-mini" key={interview._id}>
                  <span className="interview-date">
                    <strong>{displayDate(interview.createdAt)}</strong>
                    <small>
                      {interview.status === "completed"
                        ? "Completed"
                        : "AI interview"}
                    </small>
                  </span>
                  <span className="role-copy">
                    <strong>
                      {interview.jobId?.title || "Technical conversation"}
                    </strong>
                    <small>
                      {interview.jobId?.companyId?.name ||
                        "TalentPulse employer"}
                    </small>
                  </span>
                </div>
              ))}
              {!upcomingInterviews.length && (
                <EmptyLine text="Scheduled interviews will appear here." />
              )}
            </section>
          </div>
          <section className="panel panel-pad recommended-panel">
            <div className="panel-heading">
              <div>
                <h2>Roles to explore</h2>
                <p>Recently published opportunities</p>
              </div>
              <Link className="text-link" to="/jobs">
                Browse all roles <ArrowRight size={13} />
              </Link>
            </div>
            <div className="recommended-grid">
              {state.jobs.slice(0, 3).map((job) => (
                <Link
                  to={`/jobs/${job._id}`}
                  className="recommended-role"
                  key={job._id}
                >
                  <span className="company-mark">
                    {job.companyId?.name?.slice(0, 1) || "T"}
                  </span>
                  <span className="role-copy">
                    <strong>{job.title}</strong>
                    <small>
                      {job.companyId?.name || "Company"} · {job.location}
                    </small>
                  </span>
                  <ArrowRight size={14} />
                </Link>
              ))}
              {!state.jobs.length && (
                <EmptyLine text="New roles will appear here as they are published." />
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}

function SearchIcon() {
  return <BriefcaseBusiness size={15} />;
}
function EmptyLine({ text }) {
  return <p className="empty-line">{text}</p>;
}
function ApplicantTable({ applications }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Role</th>
            <th>Match</th>
            <th>Applied</th>
            <th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr key={application._id}>
              <td>
                <span className="table-person">
                  <span className="avatar avatar-blue">
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
                      {application.candidateId?.title ||
                        application.candidateId?.email}
                    </small>
                  </span>
                </span>
              </td>
              <td>{application.jobId?.title || "Open role"}</td>
              <td>
                {application.matchPercentage
                  ? `${application.matchPercentage}%`
                  : "—"}
              </td>
              <td>{displayDate(application.appliedAt)}</td>
              <td>
                <StatusPill status={application.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ApplicationList({ applications }) {
  if (!applications.length)
    return <EmptyLine text="Applications you submit will appear here." />;
  return (
    <div className="application-list">
      {applications.map((application) => (
        <div className="application-row" key={application._id}>
          <span className="company-mark">
            {application.jobId?.companyId?.name?.slice(0, 1) || "T"}
          </span>
          <span className="role-copy">
            <strong>{application.jobId?.title || "Position"}</strong>
            <small>
              {application.jobId?.companyId?.name || "Company"} · Applied{" "}
              {displayDate(application.appliedAt)}
            </small>
          </span>
          <StatusPill status={application.status} />
        </div>
      ))}
    </div>
  );
}
