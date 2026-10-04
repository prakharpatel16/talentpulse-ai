import { useState } from "react";
import {
  BadgeCheck,
  Building2,
  Check,
  KeyRound,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function SettingsPage() {
  const { user, company, setUser, setCompany } = useAuth();
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api.patch("/auth/profile", {
        name: values.name,
        phone: values.phone,
        location: values.location,
        title: values.title,
        profile: {
          bio: values.bio,
          skills: values.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
        },
      });
      setUser(result.user);
      setSuccess("Your profile has been updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }
  async function savePassword(event) {
    event.preventDefault();
    setPasswordSaving(true);
    setError("");
    setSuccess("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.newPassword !== values.confirmPassword) {
      setError("The new passwords do not match.");
      setPasswordSaving(false);
      return;
    }
    try {
      await api.patch("/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      event.currentTarget.reset();
      setSuccess("Your password has been changed.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPasswordSaving(false);
    }
  }
  async function saveCompany(event) {
    event.preventDefault();
    if (!company?._id) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api.patch(`/companies/${company._id}`, values);
      setCompany(result.company);
      setSuccess("Company details have been updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ACCOUNT PREFERENCES</p>
          <h1>Profile &amp; settings</h1>
          <p>Manage the information and security attached to your account.</p>
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
      {success && (
        <div className="notice success page-notice">
          <Check size={14} />
          {success}
          <button
            className="notice-close"
            onClick={() => setSuccess("")}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="settings-layout">
        <nav className="settings-nav panel">
          <span className="settings-nav-label">ACCOUNT</span>
          <a className="settings-nav-link active" href="#profile">
            <UserRound size={15} /> Profile details
          </a>
          <a className="settings-nav-link" href="#security">
            <LockKeyhole size={15} /> Password &amp; security
          </a>
          {user?.role === "recruiter" && (
            <>
              <span className="settings-nav-label settings-company-label">
                WORKSPACE
              </span>
              <a className="settings-nav-link" href="#company">
                <Building2 size={15} /> Company profile
              </a>
            </>
          )}
        </nav>
        <div className="settings-content">
          <section className="panel settings-section" id="profile">
            <div className="settings-section-heading">
              <span className="settings-icon">
                <UserRound size={17} />
              </span>
              <div>
                <h2>Profile details</h2>
                <p>
                  This information helps people understand who they will work
                  with.
                </p>
              </div>
            </div>
            <form onSubmit={saveProfile}>
              <div className="settings-fields">
                <div className="field">
                  <label htmlFor="profile-name">Full name</label>
                  <input
                    className="input"
                    id="profile-name"
                    name="name"
                    defaultValue={user?.name || ""}
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </div>
                <div className="field">
                  <label htmlFor="profile-email">Email address</label>
                  <input
                    className="input input-readonly"
                    id="profile-email"
                    value={user?.email || ""}
                    readOnly
                    aria-describedby="email-hint"
                  />
                  <small id="email-hint" className="field-hint">
                    Email changes require account verification.
                  </small>
                </div>
                <div className="field">
                  <label htmlFor="profile-title">Professional title</label>
                  <input
                    className="input"
                    id="profile-title"
                    name="title"
                    defaultValue={user?.title || ""}
                    placeholder="e.g. Senior Product Designer"
                    maxLength={100}
                  />
                </div>
                <div className="field">
                  <label htmlFor="profile-phone">Phone number</label>
                  <input
                    className="input"
                    id="profile-phone"
                    name="phone"
                    defaultValue={user?.phone || ""}
                    autoComplete="tel"
                    maxLength={30}
                  />
                </div>
                <div className="field span-2">
                  <label htmlFor="profile-location">Location</label>
                  <input
                    className="input"
                    id="profile-location"
                    name="location"
                    defaultValue={user?.location || ""}
                    placeholder="City, country or remote"
                    maxLength={100}
                  />
                </div>
                <div className="field span-2">
                  <label htmlFor="profile-bio">About</label>
                  <textarea
                    className="textarea"
                    id="profile-bio"
                    name="bio"
                    defaultValue={user?.profile?.bio || ""}
                    maxLength={1000}
                    placeholder="A short introduction…"
                  />
                </div>
                <div className="field span-2">
                  <label htmlFor="profile-skills">
                    Skills{" "}
                    <span className="field-optional">Separate with commas</span>
                  </label>
                  <input
                    className="input"
                    id="profile-skills"
                    name="skills"
                    defaultValue={(user?.profile?.skills || []).join(", ")}
                    maxLength={500}
                    placeholder="React, Node.js, Product strategy"
                  />
                </div>
              </div>
              <div className="settings-footer">
                <span>
                  <ShieldCheck size={14} /> Your profile is only visible
                  according to your role and application activity.
                </span>
                <button className="button primary" disabled={saving}>
                  <Save size={14} />
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
          {user?.role === "recruiter" && (
            <section className="panel settings-section" id="company">
              <div className="settings-section-heading">
                <span className="settings-icon">
                  <Building2 size={17} />
                </span>
                <div>
                  <h2>Company profile</h2>
                  <p>Share useful context about your organization.</p>
                </div>
              </div>
              <form onSubmit={saveCompany}>
                <div className="settings-fields">
                  <div className="field">
                    <label htmlFor="company-name">Company name</label>
                    <input
                      className="input"
                      id="company-name"
                      name="name"
                      defaultValue={company?.name || ""}
                      required
                      maxLength={120}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="company-website">Website</label>
                    <input
                      className="input"
                      id="company-website"
                      name="website"
                      type="url"
                      defaultValue={company?.website || ""}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="company-industry">Industry</label>
                    <input
                      className="input"
                      id="company-industry"
                      name="industry"
                      defaultValue={company?.industry || ""}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="company-location">Location</label>
                    <input
                      className="input"
                      id="company-location"
                      name="location"
                      defaultValue={company?.location || ""}
                    />
                  </div>
                  <div className="field span-2">
                    <label htmlFor="company-description">Description</label>
                    <textarea
                      className="textarea"
                      id="company-description"
                      name="description"
                      defaultValue={company?.description || ""}
                      maxLength={2000}
                    />
                  </div>
                </div>
                <div className="settings-footer">
                  <span>
                    <Building2 size={14} /> Company data is shown on published
                    roles.
                  </span>
                  <button
                    className="button primary"
                    disabled={saving || !company?._id}
                  >
                    <Save size={14} /> Save company
                  </button>
                </div>
              </form>
            </section>
          )}
          <section className="panel settings-section" id="security">
            <div className="settings-section-heading">
              <span className="settings-icon security-settings-icon">
                <KeyRound size={17} />
              </span>
              <div>
                <h2>Password &amp; security</h2>
                <p>Use a unique password to keep your account protected.</p>
              </div>
            </div>
            <form onSubmit={savePassword}>
              <div className="settings-fields">
                <div className="field span-2">
                  <label htmlFor="current-password">Current password</label>
                  <input
                    className="input"
                    type="password"
                    id="current-password"
                    name="currentPassword"
                    autoComplete="current-password"
                    minLength={8}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="new-password">New password</label>
                  <input
                    className="input"
                    type="password"
                    id="new-password"
                    name="newPassword"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="confirm-password">Confirm new password</label>
                  <input
                    className="input"
                    type="password"
                    id="confirm-password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              </div>
              <div className="settings-footer">
                <span>
                  <BadgeCheck size={14} /> At least 8 characters. Never reuse a
                  password.
                </span>
                <button className="button primary" disabled={passwordSaving}>
                  <LockKeyhole size={14} />
                  {passwordSaving ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
