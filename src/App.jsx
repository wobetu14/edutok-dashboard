import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import OrgsPage from './pages/organizations/OrgsPage';
import CoursesPage from './pages/courses/CoursesPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import AuditPage from './pages/audit/AuditPage';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import SettingsPage from './pages/settings/SettingsPage';
import ProfilePage from './pages/profile/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

function RequireAuth({ children, roles }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route
          path="/users"
          element={
            <RequireAuth roles={['super_admin', 'org_admin']}>
              <UsersPage />
            </RequireAuth>
          }
        />

        <Route
          path="/organizations"
          element={
            <RequireAuth roles={['super_admin']}>
              <OrgsPage />
            </RequireAuth>
          }
        />

        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route
          path="/analytics"
          element={
            <RequireAuth roles={['super_admin', 'org_admin']}>
              <AnalyticsPage />
            </RequireAuth>
          }
        />

        <Route
          path="/audit"
          element={
            <RequireAuth roles={['super_admin']}>
              <AuditPage />
            </RequireAuth>
          }
        />

        <Route
          path="/announcements"
          element={
            <RequireAuth roles={['super_admin']}>
              <AnnouncementsPage />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
