import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import StudentProfile from './StudentProfile';
import StudentEnrollments from './StudentEnrollments';
import StudentCurriculum from './StudentCurriculum';
import EligibleSubjects from './EligibleSubjects';
import './StudentPanel.css';

const StudentPanel = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

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
          className={activeTab === 'profile' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('profile')}
        >
          My Profile
        </button>
        <button
          className={activeTab === 'enrollments' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('enrollments')}
        >
          My Enrollments
        </button>
        <button
          className={activeTab === 'curriculum' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('curriculum')}
        >
          My Curriculum
        </button>
        <button
          className={activeTab === 'eligible-subjects' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('eligible-subjects')}
        >
          Eligible Subjects
        </button>
      </div>

      <div className="student-content">
        {activeTab === 'profile' && <StudentProfile />}
        {activeTab === 'enrollments' && <StudentEnrollments />}
        {activeTab === 'curriculum' && <StudentCurriculum />}
        {activeTab === 'eligible-subjects' && <EligibleSubjects />}
      </div>
    </div>
  );
};

export default StudentPanel;

