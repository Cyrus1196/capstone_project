import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import UserManagement from './UserManagement';
import CurriculumManagement from './CurriculumManagement';
import LookupDataManagement from './LookupDataManagement';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('lookup');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>Admin Panel</h1>
        <div className="header-info">
          <span>Welcome, {user.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="admin-tabs">
        <button
          className={activeTab === 'lookup' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('lookup')}
        >
          Lookup Data
        </button>
        <button
          className={activeTab === 'users' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button
          className={activeTab === 'curriculum' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('curriculum')}
        >
          Curriculum Management
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'lookup' && <LookupDataManagement />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'curriculum' && <CurriculumManagement />}
      </div>
    </div>
  );
};

export default AdminPanel;

