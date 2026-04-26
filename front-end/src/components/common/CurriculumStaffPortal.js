import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PortalSidebar from './PortalSidebar';
import StudentEvaluationView from './StudentEvaluationView';
import EvaluatorDashboard from '../faculty/EvaluatorDashboard';
import EvaluatorAnalytics from '../faculty/EvaluatorAnalytics';
import ProgramHeadProfile from '../program_head/ProgramHeadProfile';
import { STUDENT_EVALUATION_TAB_PERMISSIONS } from '../../config/adminPanelTabs';
import '../faculty/FacultyPanel.css';
import '../program_head/ProgramHeadPanel.css';

/**
 * @param {{ expectedRole: 'Program Head' | 'Secretary', sidebarVariant: string, collapsedStorageKey: string, sidebarBrand: string, workspaceTitle: string, roleChipLabel: string }} props
 */
function homeRouteForWrongRole(user, expectedRole) {
  if (!user?.role) return '/student';
  const r = user.role;
  if (r === 'Student') return '/student';
  if (r === 'Admin') return '/admin';
  if (expectedRole === 'Program Head' && r === 'Secretary') return '/secretary';
  if (expectedRole === 'Secretary' && r === 'Program Head') return '/program-head';
  if (r === 'Secretary') return '/secretary';
  if (r === 'Program Head') return '/program-head';
  if (r === 'Dean') return '/dean';
  if (r === 'Evaluator' || r === 'Adviser') return '/evaluator';
  return '/admin';
}

const CurriculumStaffPortal = ({
  expectedRole,
  sidebarVariant,
  collapsedStorageKey,
  sidebarBrand,
  workspaceTitle,
  roleChipLabel,
}) => {
  const { user, logout, refreshUser, canAccessModule } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const hasExpectedRole = user?.role === expectedRole;

  const showEvalModules = canAccessModule(STUDENT_EVALUATION_TAB_PERMISSIONS);

  const sidebarGroups = useMemo(() => {
    const items = [{ id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-table-columns' }];
    if (showEvalModules) {
      items.push(
        { id: 'academic-record', label: 'Student', icon: 'fa-solid fa-user-graduate' },
        { id: 'evaluated-students', label: 'Evaluated students', icon: 'fa-solid fa-clipboard-check' }
      );
    }
    items.push(
      { id: 'analytics', label: 'Analytics', icon: 'fa-solid fa-chart-column' },
      { id: 'profile', label: 'My Profile', icon: 'fa-solid fa-id-card' }
    );
    return [{ id: 'main', title: workspaceTitle, items }];
  }, [showEvalModules, workspaceTitle]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.is_admin && !hasExpectedRole) {
      navigate('/admin');
    } else if (!hasExpectedRole && !user.is_admin) {
      navigate(homeRouteForWrongRole(user, expectedRole));
    }
  }, [user, navigate, hasExpectedRole, expectedRole]);

  useEffect(() => {
    if (!hasExpectedRole || !user) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [hasExpectedRole, user, refreshUser]);

  useEffect(() => {
    if (!hasExpectedRole) return;
    if (!showEvalModules && (activeTab === 'academic-record' || activeTab === 'evaluated-students')) {
      setActiveTab('dashboard');
    }
  }, [hasExpectedRole, showEvalModules, activeTab]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  const shellClass =
    expectedRole === 'Secretary'
      ? 'faculty-panel portal-shell faculty-panel--evaluator-ui program-head-panel secretary-staff-portal'
      : 'faculty-panel portal-shell faculty-panel--evaluator-ui program-head-panel';

  return (
    <div className={shellClass}>
      <PortalSidebar
        variant={sidebarVariant}
        storageKey={collapsedStorageKey}
        brandTitle={sidebarBrand}
        groups={sidebarGroups}
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
              {roleChipLabel}
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
          {activeTab === 'profile' && <ProgramHeadProfile />}
        </div>
      </div>
    </div>
  );
};

export default CurriculumStaffPortal;
