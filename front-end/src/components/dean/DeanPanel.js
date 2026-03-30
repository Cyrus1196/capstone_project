import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import DeanProfile from './DeanProfile';
import DeanDashboard from './DeanDashboard';
import DeanAnalytics from './DeanAnalytics';
import StudentEvaluationView from '../common/StudentEvaluationView';
import CreditEvaluationManagement from '../admin/CreditEvaluationManagement';
import ElectiveSlotManagement from '../admin/ElectiveSlotManagement';
import SystemManagement from '../admin/SystemManagement';
import UserManagement from '../admin/UserManagement';
import LookupDataManagement from '../admin/LookupDataManagement';
import CurriculumManagement from '../admin/CurriculumManagement';
import CsvImport from '../admin/CsvImport';
import SecuritySettings from '../admin/SecuritySettings';
import {
  ACADEMIC_MANAGEMENT_TAB_PERMISSIONS,
  CREDIT_EVALUATION_SIDEBAR_PERMISSIONS,
  CURRICULUM_HEADERS_TAB_PERMISSIONS,
  CURRICULUM_TAB_PERMISSIONS,
  CSV_IMPORT_TAB_PERMISSIONS,
  ELECTIVE_SLOTS_TAB_PERMISSIONS,
  LOOKUP_TAB_PERMISSIONS,
  SECURITY_TAB_PERMISSIONS,
  STUDENT_EVALUATION_TAB_PERMISSIONS,
  USER_MANAGEMENT_TAB_PERMISSIONS,
} from '../../config/adminPanelTabs';
import PortalSidebar from '../common/PortalSidebar';
import {
  LOOKUP_DATA_SIDEBAR_PANELS,
  lookupSidebarChildId,
  parseLookupSidebarChildId,
} from '../../config/lookupDataSidebarPanels';
import './DeanPanel.css';

const DeanPanel = () => {
  const { user, logout, refreshUser, hasPermission, canAccessModule, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dean-dashboard');
  const [lookupSubPanel, setLookupSubPanel] = useState('programs');
  const [deanProfile, setDeanProfile] = useState(null);

  /** Refetch permissions when opening /dean (e.g. after Admin saved this role) or when Dean returns to the tab. */
  useEffect(() => {
    if (location.pathname !== '/dean' || user?.role !== 'Dean') return;
    refreshUser();
  }, [location.pathname, user?.role, refreshUser]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && user?.role === 'Dean') {
        refreshUser();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.role, refreshUser]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'Dean' && !user.is_admin) {
      navigate('/');
    } else if (user.role === 'Dean') {
      fetchDeanProfile();
    }
  }, [user, navigate]);

  const showStudentEvalTabs = canAccessModule(STUDENT_EVALUATION_TAB_PERMISSIONS);
  const showCreditsTab = canAccessModule(CREDIT_EVALUATION_SIDEBAR_PERMISSIONS);
  const showUserManagement = canAccessModule(USER_MANAGEMENT_TAB_PERMISSIONS);
  const showElectiveTab = canAccessModule(ELECTIVE_SLOTS_TAB_PERMISSIONS);
  const showSystemTab = canAccessModule(ACADEMIC_MANAGEMENT_TAB_PERMISSIONS);
  const showLookupTab = canAccessModule(LOOKUP_TAB_PERMISSIONS);

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
  const showCsvTab = canAccessModule(CSV_IMPORT_TAB_PERMISSIONS);
  const showSecurityTab = canAccessModule(SECURITY_TAB_PERMISSIONS);

  const deanSidebarGroups = useMemo(() => {
    const overviewItems = [];
    if (showStudentEvalTabs) {
      overviewItems.push(
        { id: 'dean-dashboard', label: 'Dashboard', icon: 'fa-solid fa-table-columns' },
        { id: 'dean-analytics', label: 'Analytics', icon: 'fa-solid fa-chart-column' }
      );
    }

    const evalItems = [];
    if (showStudentEvalTabs) {
      evalItems.push({
        id: 'academic-record',
        label: 'Student',
        icon: 'fa-solid fa-user-graduate',
      });
    }
    if (showCreditsTab) {
      evalItems.push({
        id: 'credits',
        label: 'Credit evaluation',
        icon: 'fa-solid fa-file-invoice-dollar',
      });
    }
    if (showStudentEvalTabs) {
      evalItems.push({
        id: 'evaluated-students',
        label: 'Evaluated students',
        icon: 'fa-solid fa-clipboard-check',
      });
    }

    const adminItems = [];
    if (showUserManagement) {
      adminItems.push({ id: 'user-management', label: 'User management', icon: 'fa-solid fa-users' });
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
        label: 'Academic management',
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
    if (showCsvTab) {
      adminItems.push({ id: 'csv-import', label: 'CSV import', icon: 'fa-solid fa-file-csv' });
    }
    if (showSecurityTab) {
      adminItems.push({
        id: 'security-settings',
        label: 'Security settings',
        icon: 'fa-solid fa-lock',
      });
    }

    const accountItems = [{ id: 'profile', label: 'My Profile', icon: 'fa-solid fa-id-card' }];

    const groups = [];
    if (overviewItems.length) {
      groups.push({ id: 'overview', title: 'Overview', items: overviewItems });
    }
    if (evalItems.length) {
      groups.push({ id: 'eval', title: 'Evaluation & credits', items: evalItems });
    }
    if (adminItems.length) {
      groups.push({ id: 'admin', title: 'Administration', items: adminItems });
    }
    groups.push({ id: 'account', title: 'Account', items: accountItems });
    return groups;
  }, [
    showStudentEvalTabs,
    showCreditsTab,
    showUserManagement,
    showCurriculumHeadersTab,
    showAdminCurriculumTab,
    showElectiveTab,
    showSystemTab,
    showLookupTab,
    visibleLookupPanels.length,
    showCsvTab,
    showSecurityTab,
  ]);

  const firstAllowedDeanTab = useMemo(() => {
    const order = [
      ['dean-dashboard', showStudentEvalTabs],
      ['dean-analytics', showStudentEvalTabs],
      ['academic-record', showStudentEvalTabs],
      ['credits', showCreditsTab],
      ['user-management', showUserManagement],
      ['curriculum-headers', showCurriculumHeadersTab],
      ['admin-curriculum', showAdminCurriculumTab],
      ['elective-slots', showElectiveTab],
      ['system-mgmt', showSystemTab],
      ['lookup-data', showLookupTab && visibleLookupPanels.length > 0],
      ['csv-import', showCsvTab],
      ['security-settings', showSecurityTab],
      ['evaluated-students', showStudentEvalTabs],
      ['profile', true],
    ];
    const hit = order.find(([, ok]) => ok);
    return hit ? hit[0] : 'profile';
  }, [
    showStudentEvalTabs,
    showCreditsTab,
    showUserManagement,
    showCurriculumHeadersTab,
    showAdminCurriculumTab,
    showElectiveTab,
    showSystemTab,
    showLookupTab,
    visibleLookupPanels.length,
    showCsvTab,
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
    const allowed = {
      'dean-dashboard': showStudentEvalTabs,
      'dean-analytics': showStudentEvalTabs,
      'academic-record': showStudentEvalTabs,
      'evaluated-students': showStudentEvalTabs,
      'user-management': showUserManagement,
      'curriculum-headers': showCurriculumHeadersTab,
      'elective-slots': showElectiveTab,
      'system-mgmt': showSystemTab,
      'lookup-data': showLookupTab && visibleLookupPanels.length > 0,
      'admin-curriculum': showAdminCurriculumTab,
      'csv-import': showCsvTab,
      'security-settings': showSecurityTab,
      credits: showCreditsTab,
      profile: true,
    };
    if (allowed[activeTab] === false) {
      setActiveTab(firstAllowedDeanTab);
    }
  }, [
    activeTab,
    firstAllowedDeanTab,
    showStudentEvalTabs,
    showUserManagement,
    showCurriculumHeadersTab,
    showElectiveTab,
    showSystemTab,
    showLookupTab,
    visibleLookupPanels.length,
    showAdminCurriculumTab,
    showCsvTab,
    showSecurityTab,
    showCreditsTab,
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

  const fetchDeanProfile = async () => {
    try {
      const response = await api.get('/deans/profile');
      setDeanProfile(response.data);
    } catch (error) {
      console.error('Error fetching dean profile:', error);
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
            {user.role === 'Dean' && (
              <button type="button" className="dean-link-admin" onClick={() => navigate('/admin')}>
                Admin modules
              </button>
            )}
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
        {activeTab === 'dean-analytics' && showStudentEvalTabs && (
          <DeanAnalytics showEvalModules={showStudentEvalTabs} />
        )}
        {activeTab === 'academic-record' && showStudentEvalTabs && (
          <StudentEvaluationView listMode="need-evaluation" />
        )}
        {activeTab === 'evaluated-students' && showStudentEvalTabs && (
          <StudentEvaluationView listMode="already-evaluated" />
        )}
        {activeTab === 'credits' && showCreditsTab && (
          <CreditEvaluationManagement approvalMode />
        )}
        {activeTab === 'user-management' && showUserManagement && <UserManagement />}
        {activeTab === 'curriculum-headers' && showCurriculumHeadersTab && (
          <LookupDataManagement
            panelNav="external"
            activePanel="curriculumHeaders"
            onActivePanelChange={noopPanelChange}
          />
        )}
        {activeTab === 'admin-curriculum' && showAdminCurriculumTab && <CurriculumManagement />}
        {activeTab === 'elective-slots' && showElectiveTab && <ElectiveSlotManagement />}
        {activeTab === 'system-mgmt' && showSystemTab && <SystemManagement />}
        {activeTab === 'lookup-data' && showLookupTab && (
          <LookupDataManagement
            panelNav="external"
            activePanel={lookupSubPanel}
            onActivePanelChange={setLookupSubPanel}
          />
        )}
        {activeTab === 'csv-import' && showCsvTab && <CsvImport />}
        {activeTab === 'security-settings' && showSecurityTab && <SecuritySettings />}
        {activeTab === 'profile' && <DeanProfile deanProfile={deanProfile} onUpdate={fetchDeanProfile} />}
        </div>
      </div>
    </div>
  );
};

export default DeanPanel;
