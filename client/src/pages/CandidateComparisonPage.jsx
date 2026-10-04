import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Columns3,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "../lib/api";

const candidateName = (application) =>
  application.candidateId?.name || "Candidate";
const skillsFor = (application) =>
  application.candidateId?.profile?.skills || [];

export default function CandidateComparisonPage() {
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState("");
  const [applications, setApplications] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get("/jobs/recruiter/all")
      .then((result) => {
        if (!active) return;
        const available = result.jobs || [];
        setJobs(available);
        const bestComparisonJob = [...available].sort(
          (left, right) =>
            (right.applicantCount || 0) - (left.applicantCount || 0),
        )[0];
        setJobId(bestComparisonJob?._id || "");
      })
      .catch((requestError) =>
        setError(requestError.message || "Unable to load requisitions."),
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!jobId) {
      setApplications([]);
      return;
    }
    let active = true;
    setLoading(true);
    setSelectedIds([]);
    api
      .get(`/applications?jobId=${encodeURIComponent(jobId)}`)
      .then((result) => {
        if (active) setApplications(result.applications || []);
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.message || "Unable to load candidate evidence.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [jobId]);

  const filtered = useMemo(
    () =>
      applications.filter((application) =>
        `${candidateName(application)} ${application.candidateId?.title || ""} ${skillsFor(application).join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [applications, search],
  );
  const selected = applications.filter((application) =>
    selectedIds.includes(application._id),
  );
  const commonSkills = [...new Set(selected.flatMap(skillsFor))].filter(
    (skill) =>
      selected.every((application) =>
        skillsFor(application).some(
          (candidateSkill) =>
            candidateSkill.toLowerCase() === skill.toLowerCase(),
        ),
      ),
  );

  function toggle(applicationId) {
    setSelectedIds((current) =>
      current.includes(applicationId)
        ? current.filter((id) => id !== applicationId)
        : current.length < 3
          ? [...current, applicationId]
          : current,
    );
  }

  const selectedJob = jobs.find((job) => job._id === jobId);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EVIDENCE REVIEW</p>
          <h1>Candidate comparison</h1>
          <p>
            Compare applicants side by side using the information they shared
            for one role.
          </p>
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
      <section className="panel comparison-toolbar">
        <div className="comparison-role">
          <span className="comparison-role-icon">
            <BriefcaseBusiness size={16} />
          </span>
          <label className="field">
            <span>Requisition</span>
            <select
              className="select"
              aria-label="Select requisition"
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
            >
              {jobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="filter-search comparison-search">
          <Search size={15} />
          <input
            aria-label="Search candidates"
            placeholder="Search name, title, or skills"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </section>
      <div className="comparison-layout">
        <section className="panel comparison-picker">
          <div className="panel-heading">
            <div>
              <h2>Applicants</h2>
              <p>Select up to three to compare</p>
            </div>
            <span className="table-total">{selectedIds.length}/3</span>
          </div>
          {loading ? (
            <div className="loading-block">Loading applicant evidence…</div>
          ) : (
            filtered.map((application, index) => {
              const candidate = application.candidateId || {};
              const checked = selectedIds.includes(application._id);
              return (
                <label
                  className={`comparison-candidate ${checked ? "checked" : ""}`}
                  key={application._id}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && selectedIds.length >= 3}
                    onChange={() => toggle(application._id)}
                  />
                  <span
                    className={`avatar ${["avatar-blue", "avatar-green", "avatar-amber"][index % 3]}`}
                  >
                    {candidateName(application)
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span className="comparison-candidate-copy">
                    <strong>{candidateName(application)}</strong>
                    <small>
                      {candidate.title || candidate.location || "Applicant"}
                    </small>
                  </span>
                  <span className="comparison-candidate-score">
                    {application.matchPercentage ?? 0}%
                  </span>
                </label>
              );
            })
          )}
          {!loading && !filtered.length && (
            <p className="empty-line">No applicants found for this role.</p>
          )}
        </section>
        <section className="comparison-results">
          {selected.length < 2 ? (
            <div className="panel empty-state comparison-empty">
              <span className="empty-state-icon">
                <Columns3 size={18} />
              </span>
              <h3>Choose two or three applicants</h3>
              <p>
                Side-by-side evidence appears here. Match percentages and AI
                feedback are decision-support signals, not hiring decisions.
              </p>
            </div>
          ) : (
            <>
              <div className="comparison-notice">
                <ShieldCheck size={15} />
                <span>
                  Evidence only. Review applications and resumes directly before
                  making a decision.
                </span>
              </div>
              <section className="panel comparison-table-panel">
                <div className="comparison-table-heading">
                  <div>
                    <p className="eyebrow">
                      {selectedJob?.requisitionCode || "SELECTED ROLE"}
                    </p>
                    <h2>{selectedJob?.title || "Applicant evidence"}</h2>
                  </div>
                  <span>{selected.length} applicants</span>
                </div>
                <div className="comparison-table-scroll">
                  <table className="data-table comparison-table">
                    <thead>
                      <tr>
                        <th>Evidence</th>
                        {selected.map((application) => (
                          <th key={application._id}>
                            <span className="compare-name">
                              {candidateName(application)}
                            </span>
                            <small>
                              {application.candidateId?.title || "Applicant"}
                            </small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th>Application status</th>
                        {selected.map((application) => (
                          <td key={application._id}>
                            <span
                              className={`pill status-${application.status}`}
                            >
                              {application.status?.replaceAll("_", " ")}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th>Recorded skills match</th>
                        {selected.map((application) => (
                          <td key={application._id}>
                            <strong className="comparison-score">
                              {application.matchPercentage ?? 0}%
                            </strong>
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${Math.max(0, Math.min(100, application.matchPercentage || 0))}%`,
                                }}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th>Shared skills</th>
                        {selected.map((application) => (
                          <td key={application._id}>
                            {commonSkills.length
                              ? commonSkills.join(", ")
                              : "No shared skills in current profile data"}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th>Skills listed</th>
                        {selected.map((application) => (
                          <td key={application._id}>
                            <div className="skill-tags comparison-skills">
                              {skillsFor(application)
                                .slice(0, 8)
                                .map((skill) => (
                                  <span key={skill}>{skill}</span>
                                ))}
                            </div>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th>Experience</th>
                        {selected.map((application) => (
                          <td key={application._id}>
                            {application.candidateId?.profile?.experience
                              ?.slice(0, 2)
                              .map((item) => (
                                <div
                                  className="experience-evidence"
                                  key={`${item.company}-${item.position}`}
                                >
                                  <strong>{item.position}</strong>
                                  <small>
                                    {item.company} ·{" "}
                                    {item.duration || "Dates not provided"}
                                  </small>
                                </div>
                              )) || "Not provided"}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th>Application note</th>
                        {selected.map((application) => (
                          <td key={application._id}>
                            {application.coverLetter || "No note submitted"}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="comparison-footer">
                  <span>
                    <Check size={13} /> Match data is supplied with each
                    application
                  </span>
                  <span>
                    {selected.length} of {applications.length} applicants
                    selected
                  </span>
                </div>
              </section>
            </>
          )}
        </section>
      </div>
    </>
  );
}
