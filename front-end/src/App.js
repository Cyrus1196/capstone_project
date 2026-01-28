import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import AdminPanel from './components/admin/AdminPanel';
import StudentPanel from './components/student/StudentPanel';
import DeanPanel from './components/dean/DeanPanel';
import FacultyPanel from './components/faculty/FacultyPanel';
import './App.css';

const PrivateRoute = ({ children, requiredRole = null }) => {
  const { user, loading, isAdmin, isDean, isFaculty } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  } 

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Role-based access control
  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to={isDean ? "/dean" : isFaculty ? "/faculty" : "/student"} />;
  }
  
  if (requiredRole === 'dean' && !isDean) {
    return <Navigate to={isAdmin ? "/admin" : isFaculty ? "/faculty" : "/student"} />;
  }
  
  if (requiredRole === 'faculty' && !isFaculty) {
    return <Navigate to={isAdmin ? "/admin" : isDean ? "/dean" : "/student"} />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
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
            path="/faculty"
            element={
              <PrivateRoute requiredRole="faculty">
                <FacultyPanel />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
