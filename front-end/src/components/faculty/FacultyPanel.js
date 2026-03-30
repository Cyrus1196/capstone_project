import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import FacultyProfile from './FacultyProfile';
import StudentEvaluationView from '../common/StudentEvaluationView';
import EvaluatorDashboard from './EvaluatorDashboard';
import EvaluatorAnalytics from './EvaluatorAnalytics';
import PortalSidebar from '../common/PortalSidebar';
import { STUDENT_EVALUATION_TAB_PERMISSIONS } from '../../config/adminPanelTabs';
import './FacultyPanel.css';

/**
 * Evaluator / Adviser portal: dashboard, student evaluation, analytics, profile.
 */
const FacultyPanel = () => {
  const { user, logout, refreshUser, canAccessModule } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const isEvaluatorOrAdviser = user?.role === 'Evaluator' || user?.role === 'Adviser';

  const showEvalModules = canAccessModule(STUDENT_EVALUATION_TAB_PERMISSIONS);

  const facultySidebarGroups = useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-table-columns' },
    ];
    if (showEvalModules) {
      items.push(
        {
          id: 'academic-record',
          label: 'Student',
          icon: 'fa-solid fa-user-graduate',
        },
        {
          id: 'evaluated-students',
          label: 'Evaluated students',
          icon: 'fa-solid fa-clipboard-check',
        }
      );
    }
    items.push(
      { id: 'analytics', label: 'Analytics', icon: 'fa-solid fa-chart-column' },
      { id: 'profile', label: 'My Profile', icon: 'fa-solid fa-id-card' }
    );
    return [
      {
        id: 'main',
        title: user?.role === 'Adviser' ? 'Adviser workspace' : 'Evaluator workspace',
        items,
      },
    ];
  }, [user?.role, showEvalModules]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!isEvaluatorOrAdviser && !user.is_admin) {
      navigate('/');
    } else if (isEvaluatorOrAdviser) {
      fetchFacultyProfile();
    }
  }, [user, navigate, isEvaluatorOrAdviser]);

  useEffect(() => {
    if (!isEvaluatorOrAdviser || !user) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isEvaluatorOrAdviser, user, refreshUser]);

  useEffect(() => {
    if (!isEvaluatorOrAdviser) return;
    if (
      !showEvalModules &&
      (activeTab === 'academic-record' || activeTab === 'evaluated-students')
    ) {
      setActiveTab('dashboard');
    }
  }, [isEvaluatorOrAdviser, showEvalModules, activeTab]);

  useEffect(() => {
    if (!isEvaluatorOrAdviser) return;
    if (activeTab === 'curriculum') {
      setActiveTab('dashboard');
    }
  }, [isEvaluatorOrAdviser, activeTab]);

  const fetchFacultyProfile = async () => {
    try {
      const response = await api.get('/faculty/profile');
      setFacultyProfile(response.data);
    } catch (error) {
      console.error('Error fetching faculty profile:', error);
      setFacultyProfile(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  const portalTitle =
    user?.role === 'Adviser'
      ? 'Adviser Portal'
      : user?.role === 'Evaluator'
        ? 'Evaluator Portal'
        : 'Faculty Portal';

  return (
    <div className="faculty-panel portal-shell faculty-panel--evaluator-ui">
      <PortalSidebar
        variant="faculty"
        storageKey="portalSidebarCollapsed_faculty"
        brandTitle={portalTitle}
        groups={facultySidebarGroups}
        activeId={activeTab}
        onSelect={setActiveTab}
        footer={
          <>
            <i className="fa-solid fa-user-circle portal-sidebar__footer-icon" aria-hidden />
            <div className="portal-sidebar__footer-text">
              <span className="portal-sidebar__footer-muted">Logged in</span>
              <div className="portal-sidebar__footer-email">{user.email}</div>
            </div>
          </>
        }
      />

      <div className="portal-shell__main">
        <header className="faculty-header faculty-header--evaluator">
          <div className="faculty-header__brand">
            <span className="faculty-header__college">Cagayan de Oro College</span>
            <span className="faculty-header__sub">PHINMA Education</span>
          </div>
          <div className="faculty-header__actions">
            <span className="faculty-header__role-chip" title={user.email}>
              {user?.role === 'Adviser' ? 'Adviser' : 'Evaluator'}
            </span>
            <span className="faculty-header__welcome faculty-header__welcome--compact">{user.email}</span>
            <button type="button" onClick={handleLogout} className="logout-button faculty-header__logout">
              Logout
            </button>
          </div>
        </header>

        <div className="portal-shell__content faculty-content">
          {activeTab === 'dashboard' && (
            <EvaluatorDashboard onNavigate={setActiveTab} showEvalModules={showEvalModules} />
          )}
          {activeTab === 'academic-record' && showEvalModules && (
            <StudentEvaluationView listMode="need-evaluation" />
          )}
          {activeTab === 'evaluated-students' && showEvalModules && (
            <StudentEvaluationView listMode="already-evaluated" />
          )}
          {activeTab === 'analytics' && <EvaluatorAnalytics showEvalModules={showEvalModules} />}
          {activeTab === 'profile' && (
            <FacultyProfile facultyProfile={facultyProfile} onUpdate={fetchFacultyProfile} />
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyPanel;
