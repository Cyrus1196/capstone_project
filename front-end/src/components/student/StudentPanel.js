import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import StudentProfile from './StudentProfile';
import StudentCurriculum from './StudentCurriculum';
import StudentDashboard from './StudentDashboard';
import './StudentPanel.css';

const StudentPanel = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (isAdmin) {
      // Redirect admins to admin panel (they can still access student panel via direct URL if needed)
      // navigate('/admin');
    }
  }, [user, isAdmin, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="student-panel">
      <header className="student-header">
        <h1>Student Portal</h1>
        <div className="header-info">
          <span>Welcome, {user.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="student-tabs">
        <button
          className={activeTab === 'dashboard' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={activeTab === 'profile' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('profile')}
        >
          My Profile
        </button>
        <button
          className={activeTab === 'curriculum' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('curriculum')}
        >
          My Curriculum
        </button>
      </div>

      <div className="student-content">
        {activeTab === 'dashboard' && <StudentDashboard onNavigate={setActiveTab} />}
        {activeTab === 'profile' && <StudentProfile />}
        {activeTab === 'curriculum' && <StudentCurriculum />}
      </div>
    </div>
  );
};

export default StudentPanel;

