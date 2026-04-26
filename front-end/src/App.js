import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SessionIdleController from './components/SessionIdleController';
import Landing from './components/Landing';
import Login from './components/Login';
import './App.css';

const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));
const SecuritySettings = lazy(() => import('./components/admin/SecuritySettings'));
const StudentPanel = lazy(() => import('./components/student/StudentPanel'));
const DeanPanel = lazy(() => import('./components/dean/DeanPanel'));
const FacultyPanel = lazy(() => import('./components/faculty/FacultyPanel'));
const ProgramHeadPanel = lazy(() => import('./components/program_head/ProgramHeadPanel'));
const SecretaryPanel = lazy(() => import('./components/secretary/SecretaryPanel'));
const GuestPanel = lazy(() => import('./components/guest/GuestPanel'));

const RouteFallback = () => (
  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading module…</div>
);

const PrivateRoute = ({ children, requiredRole = null }) => {
  const { user, loading, isAdmin, isDean, isFaculty, isProgramHead, isSecretary } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const canOpenAdminShell = isAdmin || isDean || isProgramHead || isSecretary;

  if (requiredRole === 'admin' && !canOpenAdminShell) {
    return <Navigate to={isFaculty ? '/evaluator' : '/student'} />;
  }

  if (requiredRole === 'dean' && !isDean) {
    return (
      <Navigate
        to={
          isAdmin ? '/admin' : isProgramHead ? '/program-head' : isSecretary ? '/secretary' : isFaculty ? '/evaluator' : '/student'
        }
      />
    );
  }

  if (requiredRole === 'evaluator' && !isFaculty) {
    return (
      <Navigate
        to={
          isAdmin ? '/admin' : isDean ? '/dean' : isProgramHead ? '/program-head' : isSecretary ? '/secretary' : '/student'
        }
      />
    );
  }

  if (requiredRole === 'program-head' && !isProgramHead) {
    return (
      <Navigate
        to={
          isAdmin ? '/admin' : isSecretary ? '/secretary' : isDean ? '/dean' : isFaculty ? '/evaluator' : '/student'
        }
      />
    );
  }

  if (requiredRole === 'secretary' && !isSecretary) {
    return (
      <Navigate
        to={
          isAdmin ? '/admin' : isProgramHead ? '/program-head' : isDean ? '/dean' : isFaculty ? '/evaluator' : '/student'
        }
      />
    );
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <SessionIdleController />
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <PrivateRoute requiredRole="admin">
                  <AdminPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <PrivateRoute requiredRole="admin">
                  <div style={{ padding: '1.25rem', maxWidth: 900, margin: '0 auto' }}>
                    <SecuritySettings showBackLink />
                  </div>
                </PrivateRoute>
              }
            />
            <Route
              path="/student"
              element={
                <PrivateRoute>
                  <StudentPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/dean"
              element={
                <PrivateRoute requiredRole="dean">
                  <DeanPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/evaluator"
              element={
                <PrivateRoute requiredRole="evaluator">
                  <FacultyPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/program-head"
              element={
                <PrivateRoute requiredRole="program-head">
                  <ProgramHeadPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/secretary"
              element={
                <PrivateRoute requiredRole="secretary">
                  <SecretaryPanel />
                </PrivateRoute>
              }
            />
            <Route path="/faculty" element={<Navigate to="/evaluator" replace />} />
            <Route path="/guest" element={<GuestPanel />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
