import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import UserManagement from './UserManagement';
import RoleSettings from './RoleSettings';
import CurriculumManagement from './CurriculumManagement';
import LookupDataManagement from './LookupDataManagement';
import AcademicManagement from './AcademicManagement';
import ElectiveSlotManagement from './ElectiveSlotManagement';
import CsvImport from './CsvImport';
import StudentManagement from './StudentManagement';
import SecuritySettings from './SecuritySettings';
import AuditLogsManagement from './AuditLogsManagement';
import { ADMIN_PANEL_TABS, ADMIN_SIDEBAR_GROUPS } from '../../config/adminPanelTabs';
import {
  LOOKUP_DATA_SIDEBAR_PANELS,
  lookupSidebarChildId,
  parseLookupSidebarChildId,
} from '../../config/lookupDataSidebarPanels';
import PortalSidebar from '../common/PortalSidebar';
import './AdminPanel.css';

const homeRouteForUser = (user) => {
  if (!user?.role) return '/student';
  const r = user.role;
  if (r === 'Evaluator' || r === 'Adviser') return '/evaluator';
  if (r === 'Dean') return '/dean';
  if (r === 'Program Head') return '/program-head';
  if (r === 'Secretary') return '/secretary';
  return '/student';
};

/** Admin role, or Dean / Program Head / Secretary — same shell; tabs permission-based. */
const AdminPanel = () => {
  const { user, logout, isAdmin, isDean, isProgramHead, isSecretary, canAccessModule, hasPermission } =
    useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('lookup');
  const [lookupSubPanel, setLookupSubPanel] = useState('programs');
  const [academicMgmtRemountKey, setAcademicMgmtRemountKey] = useState(0);

  const canUseAdminShell = isAdmin || isDean || isProgramHead || isSecretary;

  const visibleTabs = useMemo(() => {
    return ADMIN_PANEL_TABS.filter((tab) => {
      if (tab.id === 'role-settings') {
        return isAdmin;
      }
      return canAccessModule(tab.permissions || []);
    });
  }, [isAdmin, canAccessModule]);

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

  const sidebarGroups = useMemo(() => {
    const map = new Map(ADMIN_SIDEBAR_GROUPS.map((g) => [g.id, { ...g, items: [] }]));
    visibleTabs.forEach((tab) => {
      const gid = tab.group || 'directory';
      const bucket = map.get(gid);
      if (bucket) {
        if (tab.id === 'lookup') {
          if (visibleLookupPanels.length === 0) {
            bucket.items.push({ id: tab.id, label: tab.label, icon: tab.icon });
          } else {
            bucket.items.push({
              id: tab.id,
              label: tab.label,
              icon: tab.icon,
              children: visibleLookupPanels.map((p) => ({
                id: lookupSidebarChildId(p.panelKey),
                label: p.label,
              })),
            });
          }
        } else {
          bucket.items.push({ id: tab.id, label: tab.label, icon: tab.icon });
        }
      }
    });
    return ADMIN_SIDEBAR_GROUPS.map((g) => map.get(g.id)).filter((g) => g && g.items.length > 0);
  }, [visibleTabs, visibleLookupPanels]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!canUseAdminShell) {
      navigate(homeRouteForUser(user));
    }
  }, [user, canUseAdminShell, navigate]);

  useEffect(() => {
    const openAcademicManagement = () => {
      setActiveTab('system');
      setAcademicMgmtRemountKey((k) => k + 1);
    };
    window.addEventListener('portal-open-credit-evaluation', openAcademicManagement);
    window.addEventListener('portal-open-academic-management', openAcademicManagement);
    return () => {
      window.removeEventListener('portal-open-credit-evaluation', openAcademicManagement);
      window.removeEventListener('portal-open-academic-management', openAcademicManagement);
    };
  }, []);

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    if (activeTab !== 'lookup' || visibleLookupPanels.length === 0) return;
    if (!visibleLookupPanels.some((p) => p.panelKey === lookupSubPanel)) {
      setLookupSubPanel(visibleLookupPanels[0].panelKey);
    }
  }, [activeTab, lookupSubPanel, visibleLookupPanels]);

  const handleAdminSidebarSelect = (id) => {
    const panelKey = parseLookupSidebarChildId(id);
    if (panelKey) {
      setActiveTab('lookup');
      setLookupSubPanel(panelKey);
      return;
    }
    setActiveTab(id);
  };

  const adminSidebarActiveId =
    activeTab === 'lookup' ? lookupSidebarChildId(lookupSubPanel) : activeTab;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user || !canUseAdminShell) {
    return null;
  }

  const panelTitle = isAdmin ? 'Admin Panel' : 'Administration';

  return (
    <div className="admin-panel portal-shell">
      {visibleTabs.length > 0 && (
        <PortalSidebar
          variant="admin"
          storageKey="portalSidebarCollapsed_admin"
          brandTitle={panelTitle}
          groups={sidebarGroups}
          activeId={adminSidebarActiveId}
          onSelect={handleAdminSidebarSelect}
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
      )}

      <div className="portal-shell__main">
        <header className="admin-header">
          <h1>{panelTitle}</h1>
          <div className="header-info">
            <span className="admin-header__welcome">Welcome, {user.email}</span>
            {isDean && !isAdmin && (
              <button type="button" className="admin-dean-portal-link" onClick={() => navigate('/dean')}>
                Dean portal
              </button>
            )}
            {isProgramHead && !isAdmin && (
              <button type="button" className="admin-dean-portal-link" onClick={() => navigate('/program-head')}>
                Program head portal
              </button>
            )}
            {isSecretary && !isAdmin && (
              <button type="button" className="admin-dean-portal-link" onClick={() => navigate('/secretary')}>
                Secretary portal
              </button>
            )}
            <button type="button" onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </header>

        {visibleTabs.length === 0 ? (
          <div className="admin-panel-empty">
            <p>
              No administration modules are assigned to your account. An administrator can grant them under User
              permissions.
            </p>
            {isDean && !isAdmin && (
              <button type="button" className="admin-panel-empty__cta" onClick={() => navigate('/dean')}>
                Back to Dean portal
              </button>
            )}
            {isProgramHead && !isAdmin && (
              <button type="button" className="admin-panel-empty__cta" onClick={() => navigate('/program-head')}>
                Program head portal
              </button>
            )}
            {isSecretary && !isAdmin && (
              <button type="button" className="admin-panel-empty__cta" onClick={() => navigate('/secretary')}>
                Secretary portal
              </button>
            )}
          </div>
        ) : (
          <div className="portal-shell__content admin-content">
            {activeTab === 'lookup' && (
              <LookupDataManagement
                panelNav="external"
                activePanel={lookupSubPanel}
                onActivePanelChange={setLookupSubPanel}
              />
            )}
            {activeTab === 'curriculum-headers' && (
              <LookupDataManagement
                panelNav="external"
                activePanel="curriculumHeaders"
                onActivePanelChange={() => {}}
              />
            )}
            {activeTab === 'users' && <UserManagement userScope="staff" />}
            {activeTab === 'student-management' && <StudentManagement />}
            {activeTab === 'role-settings' && <RoleSettings />}
            {activeTab === 'curriculum' && <CurriculumManagement />}
            {activeTab === 'system' && (
              <AcademicManagement key={academicMgmtRemountKey} remountKey={academicMgmtRemountKey} />
            )}
            {activeTab === 'elective-slots' && <ElectiveSlotManagement />}
            {activeTab === 'csv-import' && (
              <CsvImport excludeImportKeys={['students', 'grades', 'prerequisite_links', 'sis_mixed']} />
            )}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'audit-logs' && <AuditLogsManagement />}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
