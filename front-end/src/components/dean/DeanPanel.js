import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import DeanProfile from './DeanProfile';
import DeanDashboard from './DeanDashboard';
import DeanAnalytics from './DeanAnalytics';
import ElectiveSlotManagement from '../admin/ElectiveSlotManagement';
import AcademicManagement from '../admin/AcademicManagement';
import UserManagement from '../admin/UserManagement';
import StudentManagement from '../admin/StudentManagement';
import LookupDataManagement from '../admin/LookupDataManagement';
import CurriculumManagement from '../admin/CurriculumManagement';
import SecuritySettings from '../admin/SecuritySettings';
import StudentEvaluationView from '../common/StudentEvaluationView';
import {
  ACADEMIC_MANAGEMENT_TAB_PERMISSIONS,
  CURRICULUM_HEADERS_TAB_PERMISSIONS,
  CURRICULUM_TAB_PERMISSIONS,
  EVALUATION_REPORTS_TAB_PERMISSIONS,
  ELECTIVE_SLOTS_TAB_PERMISSIONS,
  LOOKUP_TAB_PERMISSIONS,
  SECURITY_TAB_PERMISSIONS,
  STUDENT_EVALUATION_TAB_PERMISSIONS,
  STUDENT_MANAGEMENT_TAB_PERMISSIONS,
  USER_MANAGEMENT_TAB_PERMISSIONS,
} from '../../config/adminPanelTabs';
import PortalSidebar from '../common/PortalSidebar';
import {
  LOOKUP_DATA_SIDEBAR_PANELS,
  lookupSidebarChildId,
  parseLookupSidebarChildId,
} from '../../config/lookupDataSidebarPanels';
import './DeanPanel.css';

const DEAN_ACTIVE_TAB_STORAGE_KEY = 'deanPortalActiveTab';

function readStoredDeanTab() {
  try {
    return window.localStorage.getItem(DEAN_ACTIVE_TAB_STORAGE_KEY) || 'dean-dashboard';
  } catch {
    return 'dean-dashboard';
  }
}

const DeanPanel = () => {
  const { user, logout, refreshUser, hasPermission, canAccessModule, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTabState] = useState(readStoredDeanTab);
  const [academicMgmtRemountKey, setAcademicMgmtRemountKey] = useState(0);
  const [lookupSubPanel, setLookupSubPanel] = useState('programs');
  const [deanProfile, setDeanProfile] = useState(null);

  const fetchDeanProfile = useCallback(async () => {
    try {
      const response = await api.get('/deans/profile', { skipLoading: true, silent: true });
      setDeanProfile(response.data);
    } catch (error) {
      console.error('Error fetching dean profile:', error);
    }
  }, []);

  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab);
    try {
      window.localStorage.setItem(DEAN_ACTIVE_TAB_STORAGE_KEY, tab);
    } catch {
      // Ignore storage errors; tab navigation should still work.
    }
  }, []);

  /** Refetch permissions when opening /dean (e.g. after Admin saved this role) or when Dean returns to the tab. */
  useEffect(() => {
    if (location.pathname !== '/dean' || user?.role !== 'Dean') return;
    refreshUser();
  }, [location.pathname, user?.role, refreshUser]);

  useEffect(() => {
    let lastAt = 0;
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || user?.role !== 'Dean') return;
      const now = Date.now();
      // Avoid hammering /user on every Alt+Tab (and stacking loaders on artisan serve).
      if (now - lastAt < 60_000) return;
      lastAt = now;
      refreshUser();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.role, refreshUser]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'Dean' && !user.is_admin) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.role === 'Dean') {
      fetchDeanProfile();
    }
  }, [user?.user_id, user?.role, fetchDeanProfile]);

  useEffect(() => {
    const openAcademicManagement = () => {
      setActiveTab('system-mgmt');
      setAcademicMgmtRemountKey((k) => k + 1);
    };
    window.addEventListener('portal-open-credit-evaluation', openAcademicManagement);
    window.addEventListener('portal-open-academic-management', openAcademicManagement);
    return () => {
      window.removeEventListener('portal-open-credit-evaluation', openAcademicManagement);
      window.removeEventListener('portal-open-academic-management', openAcademicManagement);
    };
  }, [setActiveTab]);

  const showStudentEvalTabs = canAccessModule(STUDENT_EVALUATION_TAB_PERMISSIONS);
  const showUserManagement = canAccessModule(USER_MANAGEMENT_TAB_PERMISSIONS);
  const showStudentManagement = canAccessModule(STUDENT_MANAGEMENT_TAB_PERMISSIONS);
  const showElectiveTab = canAccessModule(ELECTIVE_SLOTS_TAB_PERMISSIONS);
  const showSystemTab = canAccessModule(ACADEMIC_MANAGEMENT_TAB_PERMISSIONS);
  const showLookupTab = canAccessModule(LOOKUP_TAB_PERMISSIONS);
  const showEvaluationReportsTab = canAccessModule(EVALUATION_REPORTS_TAB_PERMISSIONS);

  const visibleLookupPanels = useMemo(
    () =>
      LOOKUP_DATA_SIDEBAR_PANELS.filter(
        (p) =>
          isAdmin ||
          hasPermission('lookup.view') ||
          hasPermission('lookup.manage') ||
          hasPermission(`lookup.${p.permissionSlug}.view`) ||
          hasPermission(`lookup.${p.permissionSlug}.manage`)
      ),
    [isAdmin, hasPermission]
  );

  const showCurriculumHeadersTab = canAccessModule(CURRICULUM_HEADERS_TAB_PERMISSIONS);
  const showAdminCurriculumTab = canAccessModule(CURRICULUM_TAB_PERMISSIONS);
  const showSecurityTab = canAccessModule(SECURITY_TAB_PERMISSIONS);

  const deanSidebarGroups = useMemo(() => {
    const overviewItems = [];
    if (showStudentEvalTabs) {
      overviewItems.push({ id: 'dean-dashboard', label: 'Dashboard', icon: 'fa-solid fa-table-columns' });
    }
    if (showEvaluationReportsTab) {
      overviewItems.push({ id: 'dean-analytics', label: 'Analytics', icon: 'fa-solid fa-chart-column' });
    }

    const adminItems = [];
    if (showUserManagement) {
      adminItems.push({ id: 'user-management', label: 'User management', icon: 'fa-solid fa-users' });
    }
    if (showStudentManagement) {
      adminItems.push({
        id: 'student-management',
        label: 'Student management',
        icon: 'fa-solid fa-user-graduate',
      });
    }
    if (showCurriculumHeadersTab) {
      adminItems.push({
        id: 'curriculum-headers',
        label: 'Curriculum headers',
        icon: 'fa-solid fa-file-lines',
      });
    }
    if (showAdminCurriculumTab) {
      adminItems.push({
        id: 'admin-curriculum',
        label: 'Curriculum management',
        icon: 'fa-solid fa-book',
      });
    }
    if (showElectiveTab) {
      adminItems.push({ id: 'elective-slots', label: 'Elective slots', icon: 'fa-solid fa-list-check' });
    }
    if (showSystemTab) {
      adminItems.push({
        id: 'system-mgmt',
        label: 'Student information',
        icon: 'fa-solid fa-school',
      });
    }
    if (showLookupTab && visibleLookupPanels.length > 0) {
      adminItems.push({
        id: 'lookup-data',
        label: 'Lookup data',
        icon: 'fa-solid fa-table-list',
        children: visibleLookupPanels.map((p) => ({
          id: lookupSidebarChildId(p.panelKey),
          label: p.label,
        })),
      });
    }
    if (showSecurityTab) {
      adminItems.push({
        id: 'security-settings',
        label: 'Security settings',
        icon: 'fa-solid fa-lock',
      });
    }

    const evaluationItems = [];
    if (showStudentEvalTabs) {
      evaluationItems.push(
        { id: 'academic-record', label: 'Student', icon: 'fa-solid fa-user-graduate' },
        { id: 'evaluated-students', label: 'Evaluated students', icon: 'fa-solid fa-clipboard-check' }
      );
    }

    const accountItems = [{ id: 'profile', label: 'My Profile', icon: 'fa-solid fa-id-card' }];

    const groups = [];
    if (overviewItems.length) {
      groups.push({ id: 'overview', title: 'Overview', items: overviewItems });
    }
    if (evaluationItems.length) {
      groups.push({ id: 'evaluation', title: 'Evaluation', items: evaluationItems });
    }
    if (adminItems.length) {
      groups.push({ id: 'admin', title: 'Administration', items: adminItems });
    }
    groups.push({ id: 'account', title: 'Account', items: accountItems });
    return groups;
  }, [
    showStudentEvalTabs,
    showEvaluationReportsTab,
    showUserManagement,
    showStudentManagement,
    showCurriculumHeadersTab,
    showAdminCurriculumTab,
    showElectiveTab,
    showSystemTab,
    showLookupTab,
    visibleLookupPanels,
    showSecurityTab,
  ]);

  const firstAllowedDeanTab = useMemo(() => {
    const order = [
      ['dean-dashboard', showStudentEvalTabs],
      ['dean-analytics', showEvaluationReportsTab],
      ['academic-record', showStudentEvalTabs],
      ['evaluated-students', showStudentEvalTabs],
      ['user-management', showUserManagement],
      ['student-management', showStudentManagement],
      ['curriculum-headers', showCurriculumHeadersTab],
      ['admin-curriculum', showAdminCurriculumTab],
      ['elective-slots', showElectiveTab],
      ['system-mgmt', showSystemTab],
      ['lookup-data', showLookupTab && visibleLookupPanels.length > 0],
      ['security-settings', showSecurityTab],
      ['profile', true],
    ];
    const hit = order.find(([, ok]) => ok);
    return hit ? hit[0] : 'profile';
  }, [
    showStudentEvalTabs,
    showEvaluationReportsTab,
    showUserManagement,
    showStudentManagement,
    showCurriculumHeadersTab,
    showAdminCurriculumTab,
    showElectiveTab,
    showSystemTab,
    showLookupTab,
    visibleLookupPanels.length,
    showSecurityTab,
  ]);

  useEffect(() => {
    if (activeTab !== 'lookup-data' || visibleLookupPanels.length === 0) return;
    if (!visibleLookupPanels.some((p) => p.panelKey === lookupSubPanel)) {
      setLookupSubPanel(visibleLookupPanels[0].panelKey);
    }
  }, [activeTab, lookupSubPanel, visibleLookupPanels]);

  useEffect(() => {
    if (['curriculum', 'departments', 'reports'].includes(activeTab)) {
      setActiveTab(firstAllowedDeanTab);
      return;
    }
    if (activeTab === 'credits') {
      setActiveTab(showSystemTab ? 'system-mgmt' : firstAllowedDeanTab);
      return;
    }
    const allowed = {
      'dean-dashboard': showStudentEvalTabs,
      'dean-analytics': showEvaluationReportsTab,
      'academic-record': showStudentEvalTabs,
      'evaluated-students': showStudentEvalTabs,
      'user-management': showUserManagement,
      'student-management': showStudentManagement,
      'curriculum-headers': showCurriculumHeadersTab,
      'elective-slots': showElectiveTab,
      'system-mgmt': showSystemTab,
      'lookup-data': showLookupTab && visibleLookupPanels.length > 0,
      'admin-curriculum': showAdminCurriculumTab,
      'security-settings': showSecurityTab,
      profile: true,
    };
    if (allowed[activeTab] === false) {
      setActiveTab(firstAllowedDeanTab);
    }
  }, [
    activeTab,
    firstAllowedDeanTab,
    showStudentEvalTabs,
    showEvaluationReportsTab,
    showUserManagement,
    showStudentManagement,
    showCurriculumHeadersTab,
    showElectiveTab,
    showSystemTab,
    showLookupTab,
    visibleLookupPanels.length,
    showAdminCurriculumTab,
    showSecurityTab,
    setActiveTab,
  ]);

  const handleDeanSidebarSelect = (id) => {
    const panelKey = parseLookupSidebarChildId(id);
    if (panelKey) {
      setActiveTab('lookup-data');
      setLookupSubPanel(panelKey);
      return;
    }
    setActiveTab(id);
  };

  const deanSidebarActiveId =
    activeTab === 'lookup-data' ? lookupSidebarChildId(lookupSubPanel) : activeTab;

  const noopPanelChange = () => {};

  const handleLogout = async () => {
    try {
      window.localStorage.removeItem(DEAN_ACTIVE_TAB_STORAGE_KEY);
    } catch {
      // Ignore storage errors; logout should still continue.
    }
    await logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="dean-panel portal-shell">
      <PortalSidebar
        variant="dean"
        storageKey="portalSidebarCollapsed_dean"
        brandTitle="Dean Portal"
        groups={deanSidebarGroups}
        activeId={deanSidebarActiveId}
        onSelect={handleDeanSidebarSelect}
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
        <header className="dean-header">
          <h1>Dean Portal</h1>
          <div className="header-info">
            <span className="dean-header__welcome">Welcome, {user.email}</span>
            <button type="button" onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </header>

        <div className="portal-shell__content dean-content dean-content--shell">
        {activeTab === 'dean-dashboard' && showStudentEvalTabs && (
          <DeanDashboard
            onNavigate={setActiveTab}
            showEvalModules={showStudentEvalTabs}
            canManageCurriculum={showAdminCurriculumTab}
            canManageUsers={showUserManagement}
          />
        )}
        {activeTab === 'dean-analytics' && showEvaluationReportsTab && (
          <DeanAnalytics showEvalModules={showEvaluationReportsTab} />
        )}
        {activeTab === 'academic-record' && showStudentEvalTabs && (
          <StudentEvaluationView listMode="need-evaluation" />
        )}
        {activeTab === 'evaluated-students' && showStudentEvalTabs && (
          <StudentEvaluationView listMode="already-evaluated" />
        )}
        {activeTab === 'user-management' && showUserManagement && <UserManagement userScope="staff" />}
        {activeTab === 'student-management' && showStudentManagement && <StudentManagement />}
        {activeTab === 'curriculum-headers' && showCurriculumHeadersTab && (
          <LookupDataManagement
            panelNav="external"
            activePanel="curriculumHeaders"
            onActivePanelChange={noopPanelChange}
          />
        )}
        {activeTab === 'admin-curriculum' && showAdminCurriculumTab && (
          <CurriculumManagement
            lockedProgramId={
              deanProfile?.program_id ?? deanProfile?.program?.program_id ?? null
            }
          />
        )}
        {activeTab === 'elective-slots' && showElectiveTab && (
          <ElectiveSlotManagement
            lockedProgramId={
              deanProfile?.program_id ?? deanProfile?.program?.program_id ?? null
            }
          />
        )}
        {activeTab === 'system-mgmt' && showSystemTab && (
          <AcademicManagement key={academicMgmtRemountKey} remountKey={academicMgmtRemountKey} />
        )}
        {activeTab === 'lookup-data' && showLookupTab && (
          <LookupDataManagement
            panelNav="external"
            activePanel={lookupSubPanel}
            onActivePanelChange={setLookupSubPanel}
          />
        )}
        {activeTab === 'security-settings' && showSecurityTab && <SecuritySettings />}
        {activeTab === 'profile' && <DeanProfile deanProfile={deanProfile} onUpdate={fetchDeanProfile} />}
        </div>
      </div>
    </div>
  );
};

export default DeanPanel;
