import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import AppShell from '../layout/AppShell';
import FacultyDashboard from './FacultyDashboard';
import FacultyProfile from './FacultyProfile';
import FacultyClasses from './FacultyClasses';
import FacultyGrades from './FacultyGrades';
import StudentEvaluationView from '../common/StudentEvaluationView';
import './FacultyPanel.css';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Overview' },
  { key: 'classes', label: 'My Classes', icon: 'graduation', section: 'Teaching' },
  { key: 'grades', label: 'Grade Management', icon: 'clipboard', section: 'Teaching' },
  { key: 'evaluation', label: 'Student Evaluation', icon: 'checkCircle', section: 'Teaching' },
  { key: 'profile', label: 'My Profile', icon: 'user', section: 'Account' },
];

const FacultyPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [facultyProfile, setFacultyProfile] = useState(null);

  const fetchFacultyProfile = useCallback(async () => {
    try {
      const response = await api.get('/faculty/profile');
      setFacultyProfile(response.data);
    } catch (error) {
      console.error('Error fetching faculty profile:', error);
      // Profile might not exist yet, that's okay
      setFacultyProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'Faculty' && !user.is_admin) {
      navigate('/');
    } else if (user.role === 'Faculty') {
      fetchFacultyProfile();
    }
  }, [user, navigate, fetchFacultyProfile]);

  if (!user) {
    return null;
  }

  return (
    <AppShell
      portalName="Faculty Portal"
      nav={NAV}
      activeKey={activeTab}
      onNavigate={setActiveTab}
    >
      {activeTab === 'dashboard' && (
        <FacultyDashboard facultyProfile={facultyProfile} onNavigate={setActiveTab} />
      )}
      {activeTab === 'classes' && <FacultyClasses facultyProfile={facultyProfile} />}
      {activeTab === 'grades' && <FacultyGrades facultyProfile={facultyProfile} />}
      {activeTab === 'evaluation' && <StudentEvaluationView />}
      {activeTab === 'profile' && (
        <FacultyProfile facultyProfile={facultyProfile} onUpdate={fetchFacultyProfile} />
      )}
    </AppShell>
  );
};

export default FacultyPanel;
