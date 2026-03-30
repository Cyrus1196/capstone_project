/**
 * Maps Admin Panel tabs to permission names from tbl_permission (and DefaultPermissionsSeeder labels).
 * Reuse the same permission arrays on Evaluator/Dean portals so granted modules appear there too.
 */

import {
  allLookupResourcePanels,
  lookupGranularPermissionNames,
} from './lookupDataSidebarPanels';

/** Dean (and any role): “Academic record evaluation” + “Evaluated students” tabs. */
export const STUDENT_EVALUATION_TAB_PERMISSIONS = [
  'Student Evaluation',
  'evaluation.view',
  'evaluation.create',
  'evaluation.edit',
  'evaluation.approve',
];

export const USER_MANAGEMENT_TAB_PERMISSIONS = [
  'User Management',
  'users.view',
  'users.create',
  'users.edit',
  'users.delete',
  'users.manage_roles',
];

export const ROLE_SETTINGS_TAB_PERMISSIONS = [
  'Role Settings',
  'roles.view',
  'roles.create',
  'roles.edit',
  'roles.delete',
];

export const LOOKUP_TAB_PERMISSIONS = [
  'lookup.view',
  'lookup.manage',
  'Lookup Data',
  ...lookupGranularPermissionNames(),
];

export const CURRICULUM_TAB_PERMISSIONS = [
  'Curriculum Management',
  'curriculum.view',
  'curriculum.create',
  'curriculum.edit',
  'curriculum.delete',
  'curriculum.approve',
];

/** Curriculum header records (lookup.curriculum_headers.*); also under Curriculum in the admin sidebar. */
export const CURRICULUM_HEADERS_TAB_PERMISSIONS = [
  'lookup.view',
  'lookup.manage',
  'Lookup Data',
  'lookup.curriculum_headers.view',
  'lookup.curriculum_headers.manage',
];

/** Credit evaluation area (sidebar / tab) — any of these grants the module. */
export const CREDIT_EVALUATION_SIDEBAR_PERMISSIONS = [
  'Credit Evaluation',
  'credit_eval.view',
  'credit_eval.create',
  'credit_eval.approve',
];

export const ACADEMIC_MANAGEMENT_TAB_PERMISSIONS = [
  'System Management',
  'system.settings',
  'system.backup',
  'Credit Evaluation',
  'credit_eval.view',
  'credit_eval.create',
  'credit_eval.approve',
  'subjects.view',
  'subjects.create',
  'subjects.edit',
  'subjects.delete',
  'prerequisites.view',
  'prerequisites.manage',
];

export const ELECTIVE_SLOTS_TAB_PERMISSIONS = ['Elective Slots', 'electives.view', 'electives.manage'];

export const CSV_IMPORT_TAB_PERMISSIONS = [
  'User Management',
  'Curriculum Management',
  'Lookup Data',
  'users.create',
  'curriculum.create',
  'lookup.manage',
];

export const SECURITY_TAB_PERMISSIONS = ['System Management', 'system.settings', 'system.backup'];

/** Audit log viewer (Security area). */
export const AUDIT_LOGS_TAB_PERMISSIONS = ['Audit Logs', 'audit.view'];

/** Sidebar section order + titles (admin shell). */
export const ADMIN_SIDEBAR_GROUPS = [
  { id: 'directory', title: 'Directory & access' },
  { id: 'curriculum', title: 'Curriculum' },
  { id: 'operations', title: 'Records & import' },
  { id: 'security', title: 'Security' },
];

export const ADMIN_PANEL_TABS = [
  {
    id: 'lookup',
    label: 'Lookup Data',
    permissions: LOOKUP_TAB_PERMISSIONS,
    group: 'directory',
    icon: 'fa-solid fa-table-list',
  },
  {
    id: 'users',
    label: 'User Management',
    permissions: USER_MANAGEMENT_TAB_PERMISSIONS,
    group: 'directory',
    icon: 'fa-solid fa-users',
  },
  {
    id: 'role-settings',
    label: 'User permissions',
    permissions: ROLE_SETTINGS_TAB_PERMISSIONS,
    group: 'directory',
    icon: 'fa-solid fa-user-shield',
  },
  {
    id: 'curriculum',
    label: 'Curriculum Management',
    permissions: CURRICULUM_TAB_PERMISSIONS,
    group: 'curriculum',
    icon: 'fa-solid fa-book',
  },
  {
    id: 'elective-slots',
    label: 'Elective Slots',
    permissions: ELECTIVE_SLOTS_TAB_PERMISSIONS,
    group: 'curriculum',
    icon: 'fa-solid fa-list-check',
  },
  {
    id: 'system',
    label: 'Academic Management',
    permissions: ACADEMIC_MANAGEMENT_TAB_PERMISSIONS,
    group: 'operations',
    icon: 'fa-solid fa-school',
  },
  {
    id: 'csv-import',
    label: 'CSV Import',
    permissions: CSV_IMPORT_TAB_PERMISSIONS,
    group: 'operations',
    icon: 'fa-solid fa-file-csv',
  },
  {
    id: 'security',
    label: 'Security Settings',
    permissions: SECURITY_TAB_PERMISSIONS,
    group: 'security',
    icon: 'fa-solid fa-lock',
  },
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    permissions: AUDIT_LOGS_TAB_PERMISSIONS,
    group: 'security',
    icon: 'fa-solid fa-clipboard-list',
  },
];

/** Lookup admin screen: allow edits only with manage-level grants. */
export const LOOKUP_MANAGE_PERMISSIONS = [
  'lookup.manage',
  'Lookup Data',
  ...allLookupResourcePanels().map((p) => `lookup.${p.permissionSlug}.manage`),
];
