import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { api } from "./lib/api";
import { AuthContext, useAuth } from "./lib/auth";
import AppShell from "./components/AppShell";
import AuthPage from "./pages/AuthPage";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const ApplicationsPage = lazy(() => import("./pages/ApplicationsPage"));
const ResumesPage = lazy(() => import("./pages/ResumesPage"));
const InterviewsPage = lazy(() => import("./pages/InterviewsPage"));
const AssistantPage = lazy(() => import("./pages/AssistantPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const CandidateComparisonPage = lazy(
  () => import("./pages/CandidateComparisonPage"),
);

function PageLoader() {
  return (
    <div className="page-loader">
      <LoaderCircle className="spin" size={22} /> Loading workspace
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role))
    return (
      <Navigate
        to={
          user.role === "recruiter"
            ? "/recruiter/dashboard"
            : "/candidate/dashboard"
        }
        replace
      />
    );
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const session = await api.get("/auth/me");
      setUser(session.user);
      setCompany(session.company || null);
    } catch {
      setUser(null);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signOut = async () => {
    try {
      await api.post("/auth/logout", {});
    } finally {
      setUser(null);
      setCompany(null);
    }
  };

  const context = {
    user,
    company,
    loading,
    setUser,
    setCompany,
    refreshSession,
    signOut,
  };
  const home =
    user?.role === "recruiter"
      ? "/recruiter/dashboard"
      : "/candidate/dashboard";

  return (
    <AuthContext.Provider value={context}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={
              user ? <Navigate to={home} replace /> : <AuthPage mode="login" />
            }
          />
          <Route
            path="/register"
            element={
              user ? (
                <Navigate to={home} replace />
              ) : (
                <AuthPage mode="register" />
              )
            }
          />
          <Route
            path="/"
            element={<Navigate to={user ? home : "/login"} replace />}
          />
          <Route
            path="/candidate/dashboard"
            element={
              <ProtectedRoute roles={["candidate"]}>
                <AppShell>
                  <DashboardPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/dashboard"
            element={
              <ProtectedRoute roles={["recruiter"]}>
                <AppShell>
                  <DashboardPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <AppShell>
                <JobsPage />
              </AppShell>
            }
          />
          <Route
            path="/jobs/:jobId"
            element={
              <AppShell>
                <JobsPage />
              </AppShell>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ApplicationsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pipeline"
            element={
              <ProtectedRoute roles={["recruiter"]}>
                <AppShell>
                  <ApplicationsPage pipeline />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/compare"
            element={
              <ProtectedRoute roles={["recruiter"]}>
                <AppShell>
                  <CandidateComparisonPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/resumes"
            element={
              <ProtectedRoute roles={["candidate"]}>
                <AppShell>
                  <ResumesPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/interviews"
            element={
              <ProtectedRoute>
                <AppShell>
                  <InterviewsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute roles={["recruiter"]}>
                <AppShell>
                  <AssistantPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SettingsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <AppShell>
                  <NotificationsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={<Navigate to={user ? home : "/login"} replace />}
          />
        </Routes>
      </Suspense>
    </AuthContext.Provider>
  );
}
