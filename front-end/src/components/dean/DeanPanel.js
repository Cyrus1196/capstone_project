import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import DeanProfile from './DeanProfile';
import DeanCurriculumReview from './DeanCurriculumReview';
import DeanDepartmentManagement from './DeanDepartmentManagement';
import DeanReports from './DeanReports';
import StudentEvaluationView from '../common/StudentEvaluationView';
import CreditEvaluationManagement from '../admin/CreditEvaluationManagement';
import ElectiveSlotManagement from '../admin/ElectiveSlotManagement';
import SystemManagement from '../admin/SystemManagement';
import './DeanPanel.css';

const DeanPanel = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  // Show evaluation first so deans can immediately view & evaluate students.
  const [activeTab, setActiveTab] = useState('evaluation');
  const [deanProfile, setDeanProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'Dean' && !user.is_admin) {
      // Redirect non-dean users
      navigate('/');
    } else if (user.role === 'Dean') {
      fetchDeanProfile();
    }
  }, [user, navigate]);

  const fetchDeanProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await api.get('/deans/profile');
      setDeanProfile(response.data);
    } catch (error) {
      console.error('Error fetching dean profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="dean-panel">
      <header className="dean-header">
        <h1>Dean Portal</h1>
        <div className="header-info">
          <span>Welcome, {user.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="dean-tabs">
        <button
          className={activeTab === 'curriculum' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('curriculum')}
        >
          Curriculum Review
        </button>
        <button
          className={activeTab === 'departments' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('departments')}
        >
          Department Management
        </button>
        <button
          className={activeTab === 'reports' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('reports')}
        >
          Academic Reports
        </button>
        <button
          className={activeTab === 'evaluation' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('evaluation')}
        >
          Student Evaluation
        </button>
        <button
          className={activeTab === 'credits' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('credits')}
        >
          Credit evaluation
        </button>
        <button
          className={activeTab === 'profile' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('profile')}
        >
          My Profile
        </button>
      </div>

      <div className="dean-content">
        {activeTab === 'curriculum' && <DeanCurriculumReview deanProfile={deanProfile} />}
        {activeTab === 'departments' && <DeanDepartmentManagement deanProfile={deanProfile} />}
        {activeTab === 'reports' && <DeanReports deanProfile={deanProfile} />}
        {activeTab === 'evaluation' && <StudentEvaluationView />}
        {activeTab === 'credits' && <CreditEvaluationManagement approvalMode />}
        {activeTab === 'elective-slots' && hasPermission('Elective Slots') && <ElectiveSlotManagement />}
        {activeTab === 'system-mgmt' && hasPermission('System Management') && <SystemManagement />}
        {activeTab === 'profile' && <DeanProfile deanProfile={deanProfile} onUpdate={fetchDeanProfile} />}
      </div>
    </div>
  );
};

export default DeanPanel;

