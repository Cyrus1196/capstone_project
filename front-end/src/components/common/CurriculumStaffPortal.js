import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PortalSidebar from './PortalSidebar';
import StudentEvaluationView from './StudentEvaluationView';
import EvaluatorDashboard from '../faculty/EvaluatorDashboard';
import EvaluatorAnalytics from '../faculty/EvaluatorAnalytics';
import ProgramHeadProfile from '../program_head/ProgramHeadProfile';
import LookupDataManagement from '../admin/LookupDataManagement';
import { LOOKUP_TAB_PERMISSIONS, STUDENT_EVALUATION_TAB_PERMISSIONS } from '../../config/adminPanelTabs';
import {
  LOOKUP_DATA_SIDEBAR_PANELS,
  lookupSidebarChildId,
  parseLookupSidebarChildId,
} from '../../config/lookupDataSidebarPanels';
import '../faculty/FacultyPanel.css';
import '../program_head/ProgramHeadPanel.css';

function readStoredStaffTab(key) {
  try {
    return window.localStorage.getItem(key) || 'dashboard';
  } catch {
    return 'dashboard';
  }
}

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
  if (r === 'Adviser' || r === 'Evaluator') return '/evaluator';
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
  const { user, logout, refreshUser, canAccessModule, hasPermission } = useAuth();
  const navigate = useNavigate();
  const activeTabStorageKey = `${collapsedStorageKey}_activeTab`;
  const [activeTab, setActiveTabState] = useState(() => readStoredStaffTab(activeTabStorageKey));
  const [lookupSubPanel, setLookupSubPanel] = useState('programs');
  const refreshedUserIdRef = useRef(null);

  const hasExpectedRole = user?.role === expectedRole;

  const showEvalModules = canAccessModule(STUDENT_EVALUATION_TAB_PERMISSIONS);
  const showLookupTab = canAccessModule(LOOKUP_TAB_PERMISSIONS);
  const visibleLookupPanels = useMemo(
    () =>
      LOOKUP_DATA_SIDEBAR_PANELS.filter(
        (p) =>
          user?.is_admin ||
          hasPermission('lookup.view') ||
          hasPermission('lookup.manage') ||
          hasPermission(`lookup.${p.permissionSlug}.view`) ||
          hasPermission(`lookup.${p.permissionSlug}.manage`)
      ),
    [user?.is_admin, hasPermission]
  );

  const setActiveTab = useCallback(
    (tab) => {
      setActiveTabState(tab);
      try {
        window.localStorage.setItem(activeTabStorageKey, tab);
      } catch {
        // Ignore storage errors; tab navigation should still work.
      }
    },
    [activeTabStorageKey]
  );

  const sidebarGroups = useMemo(() => {
    const items = [{ id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-table-columns' }];
    if (showEvalModules) {
      items.push(
        { id: 'academic-record', label: 'Student', icon: 'fa-solid fa-user-graduate' },
        { id: 'evaluated-students', label: 'Evaluated students', icon: 'fa-solid fa-clipboard-check' }
      );
    }
    if (showLookupTab && visibleLookupPanels.length > 0) {
      items.push({
        id: 'lookup-data',
        label: 'Lookup data',
        icon: 'fa-solid fa-table-list',
        children: visibleLookupPanels.map((p) => ({
          id: lookupSidebarChildId(p.panelKey),
          label: p.label,
        })),
      });
    }
    items.push(
      { id: 'analytics', label: 'Analytics', icon: 'fa-solid fa-chart-column' },
      { id: 'profile', label: 'My Profile', icon: 'fa-solid fa-id-card' }
    );
    return [{ id: 'main', title: workspaceTitle, items }];
  }, [showEvalModules, showLookupTab, visibleLookupPanels, workspaceTitle]);

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
    if (!hasExpectedRole || !user?.user_id) return undefined;
    if (refreshedUserIdRef.current !== user.user_id) {
      refreshedUserIdRef.current = user.user_id;
      refreshUser();
    }
    let lastAt = 0;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastAt < 60_000) return;
      lastAt = now;
      refreshUser();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [hasExpectedRole, user?.user_id, refreshUser]);

  useEffect(() => {
    if (!hasExpectedRole) return;
    if (!showEvalModules && (activeTab === 'academic-record' || activeTab === 'evaluated-students')) {
      setActiveTab('dashboard');
      return;
    }
    if ((!showLookupTab || visibleLookupPanels.length === 0) && activeTab === 'lookup-data') {
      setActiveTab('dashboard');
    }
  }, [hasExpectedRole, showEvalModules, showLookupTab, visibleLookupPanels.length, activeTab, setActiveTab]);

  useEffect(() => {
    if (activeTab !== 'lookup-data' || visibleLookupPanels.length === 0) return;
    if (!visibleLookupPanels.some((p) => p.panelKey === lookupSubPanel)) {
      setLookupSubPanel(visibleLookupPanels[0].panelKey);
    }
  }, [activeTab, lookupSubPanel, visibleLookupPanels]);

  const handleSidebarSelect = (id) => {
    const panelKey = parseLookupSidebarChildId(id);
    if (panelKey) {
      setActiveTab('lookup-data');
      setLookupSubPanel(panelKey);
      return;
    }
    setActiveTab(id);
  };

  const sidebarActiveId = activeTab === 'lookup-data' ? lookupSidebarChildId(lookupSubPanel) : activeTab;

  const handleLogout = async () => {
    try {
      window.localStorage.removeItem(activeTabStorageKey);
    } catch {
      // Ignore storage errors; logout should still continue.
    }
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
        activeId={sidebarActiveId}
        onSelect={handleSidebarSelect}
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
          {activeTab === 'lookup-data' && showLookupTab && visibleLookupPanels.length > 0 && (
            <LookupDataManagement
              panelNav="external"
              activePanel={lookupSubPanel}
              onActivePanelChange={setLookupSubPanel}
            />
          )}
          {activeTab === 'analytics' && (
            <EvaluatorAnalytics showEvalModules={showEvalModules} onNavigate={setActiveTab} />
          )}
          {activeTab === 'profile' && <ProgramHeadProfile />}
        </div>
      </div>
    </div>
  );
};

export default CurriculumStaffPortal;
