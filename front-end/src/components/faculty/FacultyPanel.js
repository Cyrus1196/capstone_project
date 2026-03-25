import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import FacultyProfile from './FacultyProfile';
import FacultyClasses from './FacultyClasses';
import FacultyGrades from './FacultyGrades';
import StudentEvaluationView from '../common/StudentEvaluationView';
import CreditEvaluationManagement from '../admin/CreditEvaluationManagement';
import ElectiveSlotManagement from '../admin/ElectiveSlotManagement';
import SystemManagement from '../admin/SystemManagement';
import './FacultyPanel.css';

const FacultyPanel = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  // Show evaluation immediately for Dean/Faculty so they can view & evaluate students.
  const [activeTab, setActiveTab] = useState('evaluation');
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const isFacultyOrAdviser = user?.role === 'Faculty' || user?.role === 'Adviser';

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!isFacultyOrAdviser && !user.is_admin) {
      navigate('/');
    } else if (isFacultyOrAdviser) {
      fetchFacultyProfile();
    }
  }, [user, navigate, isFacultyOrAdviser]);

  const fetchFacultyProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await api.get('/faculty/profile');
      setFacultyProfile(response.data);
    } catch (error) {
      console.error('Error fetching faculty profile:', error);
      // Profile might not exist yet, that's okay
      setFacultyProfile(null);
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
    <div className="faculty-panel">
      <header className="faculty-header">
        <h1>{user?.role === 'Adviser' ? 'Adviser / Faculty Portal' : 'Faculty Portal'}</h1>
        <div className="header-info">
          <span>Welcome, {user.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="faculty-tabs">
        <button
          className={activeTab === 'classes' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('classes')}
        >
          My Classes
        </button>
        <button
          className={activeTab === 'grades' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('grades')}
        >
          Grade Management
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
        {hasPermission('Elective Slots') && (
          <button
            className={activeTab === 'elective-slots' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('elective-slots')}
          >
            Elective slots
          </button>
        )}
        {hasPermission('System Management') && (
          <button
            className={activeTab === 'system-mgmt' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('system-mgmt')}
          >
            System management
          </button>
        )}
        <button
          className={activeTab === 'profile' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('profile')}
        >
          My Profile
        </button>
      </div>

      <div className="faculty-content">
        {activeTab === 'classes' && <FacultyClasses facultyProfile={facultyProfile} />}
        {activeTab === 'grades' && <FacultyGrades facultyProfile={facultyProfile} />}
        {activeTab === 'evaluation' && <StudentEvaluationView />}
        {activeTab === 'credits' && <CreditEvaluationManagement approvalMode />}
        {activeTab === 'elective-slots' && hasPermission('Elective Slots') && <ElectiveSlotManagement />}
        {activeTab === 'system-mgmt' && hasPermission('System Management') && <SystemManagement />}
        {activeTab === 'profile' && <FacultyProfile facultyProfile={facultyProfile} onUpdate={fetchFacultyProfile} />}
      </div>
    </div>
  );
};

export default FacultyPanel;

