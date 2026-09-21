import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppShell from '../layout/AppShell';
import StudentDashboard from './StudentDashboard';
import StudentProfile from './StudentProfile';
import StudentEnrollments from './StudentEnrollments';
import StudentCurriculum from './StudentCurriculum';
import './StudentPanel.css';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Overview' },
  { key: 'enrollments', label: 'My Enrollments', icon: 'clipboard', section: 'Academics' },
  { key: 'curriculum', label: 'My Curriculum', icon: 'book', section: 'Academics' },
  { key: 'profile', label: 'My Profile', icon: 'user', section: 'Account' },
];

const StudentPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <AppShell
      portalName="Student Portal"
      nav={NAV}
      activeKey={activeTab}
      onNavigate={setActiveTab}
    >
      {activeTab === 'dashboard' && <StudentDashboard onNavigate={setActiveTab} />}
      {activeTab === 'profile' && <StudentProfile />}
      {activeTab === 'enrollments' && <StudentEnrollments />}
      {activeTab === 'curriculum' && <StudentCurriculum />}
    </AppShell>
  );
};

export default StudentPanel;
