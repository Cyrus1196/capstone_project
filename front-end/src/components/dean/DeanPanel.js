import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import AppShell from '../layout/AppShell';
import DeanDashboard from './DeanDashboard';
import DeanProfile from './DeanProfile';
import DeanCurriculumReview from './DeanCurriculumReview';
import DeanDepartmentManagement from './DeanDepartmentManagement';
import DeanReports from './DeanReports';
import StudentEvaluationView from '../common/StudentEvaluationView';
import './DeanPanel.css';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Overview' },
  { key: 'curriculum', label: 'Curriculum Review', icon: 'book', section: 'Academics' },
  { key: 'evaluation', label: 'Student Evaluation', icon: 'checkCircle', section: 'Academics' },
  { key: 'reports', label: 'Academic Reports', icon: 'chart', section: 'Academics' },
  { key: 'departments', label: 'Departments', icon: 'building', section: 'Management' },
  { key: 'profile', label: 'My Profile', icon: 'user', section: 'Account' },
];

const DeanPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deanProfile, setDeanProfile] = useState(null);

  const fetchDeanProfile = useCallback(async () => {
    try {
      const response = await api.get('/deans/profile');
      setDeanProfile(response.data);
    } catch (error) {
      console.error('Error fetching dean profile:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'Dean' && !user.is_admin) {
      navigate('/');
    } else if (user.role === 'Dean') {
      fetchDeanProfile();
    }
  }, [user, navigate, fetchDeanProfile]);

  if (!user) {
    return null;
  }

  return (
    <AppShell
      portalName="Dean Portal"
      nav={NAV}
      activeKey={activeTab}
      onNavigate={setActiveTab}
    >
      {activeTab === 'dashboard' && (
        <DeanDashboard deanProfile={deanProfile} onNavigate={setActiveTab} />
      )}
      {activeTab === 'curriculum' && <DeanCurriculumReview deanProfile={deanProfile} />}
      {activeTab === 'departments' && <DeanDepartmentManagement deanProfile={deanProfile} />}
      {activeTab === 'reports' && <DeanReports deanProfile={deanProfile} />}
      {activeTab === 'evaluation' && <StudentEvaluationView />}
      {activeTab === 'profile' && (
        <DeanProfile deanProfile={deanProfile} onUpdate={fetchDeanProfile} />
      )}
    </AppShell>
  );
};

export default DeanPanel;
