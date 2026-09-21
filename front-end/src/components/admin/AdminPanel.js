import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppShell from '../layout/AppShell';
import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement';
import CurriculumManagement from './CurriculumManagement';
import LookupDataManagement from './LookupDataManagement';
import './AdminPanel.css';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Overview' },
  { key: 'users', label: 'User Management', icon: 'users', section: 'Administration' },
  { key: 'curriculum', label: 'Curriculum', icon: 'book', section: 'Administration' },
  { key: 'lookup', label: 'Lookup Data', icon: 'database', section: 'Administration' },
];

const AdminPanel = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, navigate]);

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <AppShell
      portalName="Admin Panel"
      nav={NAV}
      activeKey={activeTab}
      onNavigate={setActiveTab}
    >
      {activeTab === 'dashboard' && <AdminDashboard onNavigate={setActiveTab} />}
      {activeTab === 'lookup' && <LookupDataManagement />}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'curriculum' && <CurriculumManagement />}
    </AppShell>
  );
};

export default AdminPanel;
