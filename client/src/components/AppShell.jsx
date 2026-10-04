import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  CircleHelp,
  Columns3,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";

const recruiterLinks = [
  { to: "/recruiter/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/pipeline", label: "Talent pipeline", icon: Users },
  { to: "/compare", label: "Compare candidates", icon: Columns3 },
  { to: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/interviews", label: "Interviews", icon: Activity },
  { to: "/assistant", label: "AI assistant", icon: MessageSquareText },
];
const candidateLinks = [
  { to: "/candidate/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/jobs", label: "Discover jobs", icon: Search },
  { to: "/applications", label: "My applications", icon: BriefcaseBusiness },
  { to: "/resumes", label: "Resume library", icon: FileText },
  { to: "/interviews", label: "Interviews", icon: Activity },
];

export default function AppShell({ children }) {
  const { user, company, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isRecruiter = user?.role === "recruiter";
  const links = isRecruiter ? recruiterLinks : candidateLinks;
  const pageTitle =
    [...links, { to: "/settings", label: "Settings" }].find(
      (link) => link.to === location.pathname,
    )?.label || "Talent workspace";
  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "TP";

  return (
    <div className="app-frame">
      {menuOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <span className="brand-mark">tp</span>
          <span className="brand-name">
            talent<span>pulse</span>
          </span>
          <button
            className="icon-button mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-symbol">
            <Building2 size={17} />
          </span>
          <span>
            <strong>
              {company?.name ||
                (isRecruiter ? "Recruiting team" : "Candidate workspace")}
            </strong>
            <small>
              {isRecruiter ? "Recruiter account" : "Personal workspace"}
            </small>
          </span>
          <ChevronDown size={15} />
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Talent pipeline" && (
                <span className="nav-count">4</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-bottom-links">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Settings size={18} strokeWidth={1.8} />
            <span>Settings</span>
          </NavLink>
          <button className="nav-link" onClick={() => navigate("/settings")}>
            <CircleHelp size={18} strokeWidth={1.8} />
            <span>Help center</span>
          </button>
        </div>
        <div className="sidebar-profile">
          <div className="avatar avatar-blue">{initials}</div>
          <div className="profile-copy">
            <strong>{user?.name || "TalentPulse user"}</strong>
            <small>
              {user?.title || (isRecruiter ? "Recruiter" : "Candidate")}
            </small>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            title="Sign out"
            onClick={signOut}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumbs">
              <span>Workspace</span>
              <span className="crumb-divider">/</span>
              <strong>{pageTitle}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="availability">
              <i /> All systems operational
            </span>
            <button
              className="icon-button notification-trigger"
              aria-label="Notifications"
              onClick={() => navigate("/notifications")}
            >
              <Bell size={19} />
              <i className="notification-dot" />
            </button>
            <div className="profile-menu-wrap">
              <button
                className="topbar-user"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="avatar avatar-blue avatar-small">
                  {initials}
                </span>
                <ChevronDown size={14} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setProfileOpen(false);
                    }}
                  >
                    Profile &amp; settings
                  </button>
                  <button onClick={signOut}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page-content" key={location.pathname}>
          {children}
        </main>
      </div>
    </div>
  );
}
