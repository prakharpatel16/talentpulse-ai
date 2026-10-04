import { useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";
  const [role, setRole] = useState("candidate");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { setUser, setCompany, refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(event) {
    event.preventDefault();
    setError("");
    setPending(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = isRegister
        ? await api.post("/auth/register", { ...values, role })
        : await api.post("/auth/login", values);
      setUser(result.user);
      if (result.company) setCompany(result.company);
      await refreshSession();
      const home =
        result.user.role === "recruiter"
          ? "/recruiter/dashboard"
          : "/candidate/dashboard";
      navigate(location.state?.from || home, { replace: true });
    } catch (requestError) {
      setError(
        requestError.message || "We could not sign you in. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <Link className="brand-lockup auth-brand" to="/">
          <span className="brand-mark">tp</span>
          <span className="brand-name">
            talent<span>pulse</span>
          </span>
        </Link>
        <div className="story-content">
          <div className="eyebrow light-eyebrow">
            <Sparkles size={13} /> A clearer way to hire
          </div>
          <h1>Good work starts with the right people.</h1>
          <p>
            One considered workspace for finding talent, growing your career,
            and moving every opportunity forward.
          </p>
          <div className="story-proof">
            <div className="story-avatars">
              <span>AJ</span>
              <span>MK</span>
              <span>SL</span>
              <b>+2k</b>
            </div>
            <span>Teams and candidates moving forward together</span>
          </div>
        </div>
        <div className="story-footer">
          <span>TalentPulse</span>
          <span>Built for people-first hiring</span>
        </div>
      </section>
      <section className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="auth-mobile-brand">
            <span className="brand-mark">tp</span>
            <span className="brand-name">
              talent<span>pulse</span>
            </span>
          </div>
          <div className="auth-intro">
            <span className="auth-icon">
              <BriefcaseBusiness size={19} />
            </span>
            <p className="eyebrow">YOUR TALENT WORKSPACE</p>
            <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
            <p>
              {isRegister
                ? "Start building a more thoughtful hiring journey."
                : "Sign in to pick up where your work left off."}
            </p>
          </div>
          <div className="auth-mode-switch">
            <Link className={!isRegister ? "selected" : ""} to="/login">
              Sign in
            </Link>
            <Link className={isRegister ? "selected" : ""} to="/register">
              Create account
            </Link>
          </div>
          {isRegister && (
            <div className="role-select" aria-label="Choose account type">
              <button
                type="button"
                className={role === "candidate" ? "selected" : ""}
                onClick={() => setRole("candidate")}
              >
                <span className="role-check">
                  {role === "candidate" && <Check size={12} />}
                </span>
                <span>
                  <strong>I'm a candidate</strong>
                  <small>Find your next opportunity</small>
                </span>
              </button>
              <button
                type="button"
                className={role === "recruiter" ? "selected" : ""}
                onClick={() => setRole("recruiter")}
              >
                <span className="role-check">
                  {role === "recruiter" && <Check size={12} />}
                </span>
                <span>
                  <strong>I'm a recruiter</strong>
                  <small>Build your next great team</small>
                </span>
              </button>
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <form className="auth-form" onSubmit={submit}>
            {isRegister && (
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input
                  className="input"
                  id="name"
                  name="name"
                  autoComplete="name"
                  placeholder="e.g. Alex Morgan"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                className="input"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                maxLength={254}
                required
              />
            </div>
            <div className="field">
              <div className="password-label">
                <label htmlFor="password">Password</label>
                {!isRegister && (
                  <button
                    className="text-link"
                    type="button"
                    onClick={() =>
                      setError(
                        "Password reset is not configured yet. Contact your workspace administrator.",
                      )
                    }
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="password-control">
                <input
                  className="input"
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  placeholder={
                    isRegister ? "At least 8 characters" : "Enter your password"
                  }
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="button primary auth-submit" disabled={pending}>
              {pending
                ? "Please wait…"
                : isRegister
                  ? "Create account"
                  : "Sign in"}
              <ArrowRight size={15} />
            </button>
          </form>
          <p className="auth-legal">
            By continuing, you agree to our <a href="#terms">Terms</a> and{" "}
            <a href="#privacy">Privacy Policy</a>.
          </p>
          {!isRegister && (
            <p className="auth-switch">
              New to TalentPulse? <Link to="/register">Create an account</Link>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
