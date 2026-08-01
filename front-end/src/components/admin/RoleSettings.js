import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { permissionService, userService } from '../../services/rbacService';
import { swalToast, swalError, swalConfirm } from '../../utils/swal';
import './RoleSettings.css';

/** Modules without `*.view` (e.g. system.settings / system.backup): minimal tier = these ids. */
const VIEW_TIER_IDS_RESOLVER = {
  evaluation: (perms) =>
    perms
      .filter((p) => ['evaluation.view', 'credit_eval.view'].includes(p.permission_name))
      .map((p) => Number(p.permission_id)),
  system: (perms) =>
    perms
      .filter((p) => p.permission_name === 'system.settings')
      .map((p) => Number(p.permission_id)),
};

const getViewTierPermissionIds = (moduleKey, perms) => {
  if (VIEW_TIER_IDS_RESOLVER[moduleKey]) {
    return VIEW_TIER_IDS_RESOLVER[moduleKey](perms);
  }
  return perms
    .filter((p) => p.permission_name === `${moduleKey}.view`)
    .map((p) => Number(p.permission_id));
};

const sortNum = (a, b) => a - b;

const sameIdSet = (assignedSubset, targetIds) => {
  const ta = [...new Set(targetIds.map(Number))].sort(sortNum);
  const sa = [...new Set(assignedSubset.map(Number))].sort(sortNum);
  if (ta.length !== sa.length) return false;
  return ta.every((v, i) => v === sa[i]);
};

const FRIENDLY_PERMISSION_MERGE_INTO = {
  'Curriculum Management': 'curriculum',
  'Elective Slots': 'electives',
  'User Management': 'users',
  'Student Management': 'students',
  'Credit Evaluation': 'evaluation',
  'Student Evaluation': 'evaluation',
  /** Merge with system.settings / system.backup — one "Security Settings" block in the UI */
  'System Management': 'system',
};

const moduleKeyFromPermissionName = (name) => {
  const mergeTarget = FRIENDLY_PERMISSION_MERGE_INTO[name];
  if (mergeTarget) return mergeTarget;
  const parts = name.split('.');
  if (parts[0] === 'lookup' && parts.length >= 3) {
    return `lookup.${parts[1]}`;
  }
  if (parts[0] === 'credit_eval') {
    return 'evaluation';
  }
  const dot = name.indexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
};

/** Dot-prefix module keys → clearer titles (not the same as the user’s role name). */
const MODULE_LABEL_OVERRIDES = {
  curriculum: 'Curriculum Management',
  evaluation: 'Credit Evaluation',
  system: 'Security Settings',
  users: 'User Management',
  students: 'Student Management',
};

/** DB permission_name → label in lists (backend still uses "System Management"). */
const PERMISSION_DISPLAY_NAME_OVERRIDES = {
  'System Management': 'Security Settings',
};

const displayPermissionName = (name) =>
  PERMISSION_DISPLAY_NAME_OVERRIDES[name] ?? name;

const LOOKUP_DATA_CATEGORY = 'lookup-data';
const LOOKUP_DATA_LABEL = 'Lookup Data';
const isLookupModuleKey = (key) => key.startsWith('lookup.');
const HIDDEN_PERMISSION_NAMES = new Set([
  'Evaluation Reports',
  'reports.view',
  'reports.generate',
  'Faculty',
  'faculty.view',
  'lookup.view',
  'lookup.manage',
  'roles.view',
  'roles.create',
  'roles.edit',
  'roles.delete',
]);

const HIDDEN_MODULE_KEYS = new Set(['faculty']);

const formatModuleLabel = (key) => {
  if (MODULE_LABEL_OVERRIDES[key]) {
    return MODULE_LABEL_OVERRIDES[key];
  }
  if (isLookupModuleKey(key)) {
    return key
      .replace(/^lookup\./, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatPermissionActionLabel = (name, moduleKey, multi) => {
  if (!multi) return null;
  const parts = name.split('.');
  if (isLookupModuleKey(moduleKey)) {
    return parts[2] || null;
  }
  const dot = name.indexOf('.');
  return dot > 0 ? name.slice(dot + 1) : null;
};

const userRoleName = (u) => u?.role?.role_name || u?.role_name || '';

/** User permissions UI is for editable staff roles only — not Student or Admin accounts. */
const editablePermissionUsers = (list) =>
  list.filter((u) => {
    const roleName = userRoleName(u);
    return roleName !== 'Student' && roleName !== 'Admin';
  });

const RoleSettings = () => {
  const { user, refreshUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [assignedIds, setAssignedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [portalPanelIds, setPortalPanelIds] = useState([]);
  const [permissionsReadOnly, setPermissionsReadOnly] = useState(false);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [yearLevels, setYearLevels] = useState([]);
  const [evalYearLevelSelectedIds, setEvalYearLevelSelectedIds] = useState([]);
  const selectedUserId = selectedUser?.user_id;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchPermissionsForUser(selectedUserId);
    } else {
      setPermissions([]);
      setAssignedIds([]);
      setPortalPanelIds([]);
      setPermissionsReadOnly(false);
      setUseCustomPermissions(false);
      setYearLevels([]);
      setEvalYearLevelSelectedIds([]);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userService.getUsers();
      const raw = Array.isArray(data) ? data : [];
      const list = editablePermissionUsers(raw);
      setUsers(list);
      setSelectedUser((prev) => {
        if (prev && list.some((u) => Number(u.user_id) === Number(prev.user_id))) {
          return prev;
        }
        return list[0] ?? null;
      });
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionsForUser = async (userId) => {
    try {
      setLoading(true);
      setError('');
      const data = await permissionService.getPermissionsForUser(userId);
      setPermissions(data.permissions || []);
      setAssignedIds(data.assigned_ids || []);
      setPortalPanelIds(data.portal_panel_permission_ids || []);
      setPermissionsReadOnly(!!data.permissions_read_only);
      setUseCustomPermissions(!!data.use_custom_permissions);
      const yl = Array.isArray(data.year_levels) ? data.year_levels : [];
      setYearLevels(yl);
      const catalogIds = [...new Set(yl.map((r) => Number(r.year_level_id)))].filter(Number.isFinite).sort(
        (a, b) => a - b
      );
      const userOverride = data.evaluation_year_level_ids_user_override;
      const effective = data.evaluation_year_level_ids_effective;
      let selected = [];
      if (userOverride !== null && userOverride !== undefined) {
        selected = (Array.isArray(userOverride) ? userOverride : []).map(Number).filter(Number.isFinite);
      } else if (effective === null || effective === undefined) {
        selected = catalogIds;
      } else {
        selected = (Array.isArray(effective) ? effective : []).map(Number).filter(Number.isFinite);
      }
      setEvalYearLevelSelectedIds([...new Set(selected)].sort((a, b) => a - b));
    } catch (err) {
      setError('Failed to load permissions for user');
      setPermissions([]);
      setAssignedIds([]);
      setPortalPanelIds([]);
      setPermissionsReadOnly(false);
      setUseCustomPermissions(false);
      setYearLevels([]);
      setEvalYearLevelSelectedIds([]);
      swalError('Could not load permissions', 'Failed to load permissions for this user.');
    } finally {
      setLoading(false);
    }
  };

  const toggleEvalYearLevel = (yearLevelId) => {
    if (permissionsReadOnly) return;
    const n = Number(yearLevelId);
    if (!Number.isFinite(n)) return;
    setEvalYearLevelSelectedIds((prev) => {
      const has = prev.some((id) => Number(id) === n);
      if (has) return prev.filter((id) => Number(id) !== n);
      return [...prev, n].sort((a, b) => Number(a) - Number(b));
    });
  };

  const handleTogglePermission = (permissionId) => {
    if (permissionsReadOnly) return;
    const n = Number(permissionId);
    setAssignedIds((prev) =>
      prev.some((id) => Number(id) === n)
        ? prev.filter((id) => Number(id) !== n)
        : [...prev, n]
    );
  };

  const applyModuleAccessTier = (allModuleIds, viewTierIds, tier) => {
    if (permissionsReadOnly) return;
    const allNum = [...new Set(allModuleIds.map(Number))];
    const viewNum = [...new Set(viewTierIds.map(Number))];
    setAssignedIds((prev) => {
      const without = prev.filter((id) => !allNum.includes(Number(id)));
      if (tier === 'none') return without;
      if (tier === 'view') return [...without, ...viewNum];
      if (tier === 'full') return [...without, ...allNum];
      return without;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUser || permissionsReadOnly) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const evalPayload =
        yearLevels.length > 0 ? [...new Set(evalYearLevelSelectedIds.map(Number))].sort((a, b) => a - b) : undefined;
      await permissionService.syncUserPermissions(selectedUser.user_id, assignedIds, evalPayload);
      await fetchPermissionsForUser(selectedUser.user_id);
      const savedId = Number(selectedUser.user_id);
      const myId = user?.user_id != null ? Number(user.user_id) : NaN;
      if (Number.isFinite(savedId) && Number.isFinite(myId) && savedId === myId) {
        await refreshUser();
      }
      setSuccess('Permissions saved for this user only.');
      swalToast('success', 'Permissions saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const msg = err?.message || err?.error || 'Failed to save permissions';
      setError(msg);
      swalError('Save failed', typeof msg === 'string' ? msg : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToRole = async () => {
    if (!selectedUser || permissionsReadOnly) return;
    const confirmed = await swalConfirm(
      'Reset to role defaults?',
      'This removes custom permissions for this user. They will use their role’s permissions again.',
      'Reset',
      'Cancel'
    );
    if (!confirmed) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await permissionService.resetUserPermissionsToRole(selectedUser.user_id);
      await fetchPermissionsForUser(selectedUser.user_id);
      const savedId = Number(selectedUser.user_id);
      const myId = user?.user_id != null ? Number(user.user_id) : NaN;
      if (Number.isFinite(savedId) && Number.isFinite(myId) && savedId === myId) {
        await refreshUser();
      }
      swalToast('success', 'Reset to role defaults');
    } catch (err) {
      const msg = err?.message || err?.error || 'Failed to reset';
      swalError('Reset failed', typeof msg === 'string' ? msg : 'Failed to reset');
    } finally {
      setSaving(false);
    }
  };

  const modulesByCategory = useMemo(() => {
    const buckets = {};
    permissions.forEach((p) => {
      const name = p.permission_name || '';
      if (HIDDEN_PERMISSION_NAMES.has(name)) return;
      const mk = moduleKeyFromPermissionName(name);
      if (HIDDEN_MODULE_KEYS.has(mk)) return;
      if (!buckets[mk]) buckets[mk] = [];
      buckets[mk].push(p);
    });
    Object.keys(buckets).forEach((k) => {
      buckets[k].sort((a, b) =>
        (a.permission_name || '').localeCompare(b.permission_name || '')
      );
    });
    const moduleCategory = {};
    Object.entries(buckets).forEach(([mk, perms]) => {
      const dotted = perms.find((x) => (x.permission_name || '').includes('.'));
      moduleCategory[mk] = dotted?.category || perms[0]?.category || 'Other';
    });
    const byCat = {};
    Object.entries(buckets).forEach(([mk, perms]) => {
      const cat = moduleCategory[mk] || 'Other';
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push([mk, perms]);
    });
    const out = {};
    Object.entries(byCat).forEach(([category, entries]) => {
      out[category] = entries.sort(([a], [b]) =>
        formatModuleLabel(a).localeCompare(formatModuleLabel(b))
      );
    });
    return out;
  }, [permissions]);

  const permissionCategoryEntries = useMemo(() => {
    const entries = Object.entries(modulesByCategory).flatMap(([, moduleEntries]) => moduleEntries);
    const regularEntries = entries
      .filter(([moduleKey]) => !isLookupModuleKey(moduleKey))
      .sort(([a], [b]) => formatModuleLabel(a).localeCompare(formatModuleLabel(b)));
    const lookupEntries = entries
      .filter(([moduleKey]) => isLookupModuleKey(moduleKey))
      .sort(([a], [b]) => formatModuleLabel(a).localeCompare(formatModuleLabel(b)));

    const sections = regularEntries.map(([moduleKey, perms]) => [
      `module:${moduleKey}`,
      [[moduleKey, perms]],
    ]);
    if (lookupEntries.length > 0) {
      sections.push([LOOKUP_DATA_CATEGORY, lookupEntries]);
    }

    const sectionLabel = ([category, moduleEntries]) =>
      category === LOOKUP_DATA_CATEGORY
        ? LOOKUP_DATA_LABEL
        : formatModuleLabel(moduleEntries[0]?.[0] || category);

    return sections.sort((a, b) => sectionLabel(a).localeCompare(sectionLabel(b)));
  }, [modulesByCategory]);

  const [expandedModules, setExpandedModules] = useState({});
  const [lookupDataExpanded, setLookupDataExpanded] = useState(false);
  const moduleStorageKey = (category, moduleKey) => `${category}::${moduleKey}`;

  const isModuleExpanded = (category, moduleKey, permCount) => {
    if (permCount <= 1) return true;
    const k = moduleStorageKey(category, moduleKey);
    return expandedModules[k] === true;
  };

  const toggleModuleExpanded = (category, moduleKey) => {
    const k = moduleStorageKey(category, moduleKey);
    setExpandedModules((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const portalPanelIdSet = useMemo(
    () => new Set(portalPanelIds.map((id) => Number(id))),
    [portalPanelIds]
  );

  const isPortalPermission = (permissionId) => portalPanelIdSet.has(Number(permissionId));

  const userLabel = (u) => u?.email || `User #${u?.user_id}`;
  const roleLabel = (u) => u?.role?.role_name || u?.role_name || '—';

  if (loading && users.length === 0) {
    return (
      <div className="role-settings">
        <div className="role-settings-loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="role-settings">
      <div className="role-settings-header">
        <h2>User permissions</h2>
        <p className="role-settings-subtitle">
          Adjust modules per user. Saving applies only to the selected user (not everyone with the same role).
        </p>
      </div>

      {error && <div className="role-settings-error">{error}</div>}
      {success && <div className="role-settings-success">{success}</div>}

      <div className="role-settings-panels">
        <div className="role-settings-panel role-settings-roles">
          <div className="role-panel-header role-panel-header-actions">
            <h3>Users</h3>
          </div>
          <div className="role-table-wrap">
            <table className="role-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="no-data">No users found</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.user_id}
                      className={
                        selectedUser?.user_id === u.user_id ? 'selected' : ''
                      }
                      onClick={() => setSelectedUser(u)}
                    >
                      <td>{userLabel(u)}</td>
                      <td>
                        <span className="access-badge">{roleLabel(u)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="role-settings-panel role-settings-permissions">
          <div className="role-panel-header role-panel-header-actions">
            <h3>Permissions</h3>
            {selectedUser && !permissionsReadOnly && (
              <>
                <button
                  type="button"
                  className="role-reset-button"
                  onClick={handleResetToRole}
                  disabled={saving || !useCustomPermissions}
                  title={
                    useCustomPermissions
                      ? 'Clear custom list and use role defaults'
                      : 'Already using role defaults'
                  }
                >
                  Reset to role
                </button>
                <button
                  type="button"
                  className="role-save-button"
                  onClick={handleSavePermissions}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save permissions'}
                </button>
              </>
            )}
          </div>
          {selectedUser ? (
            <>
              <p className="permissions-for-label">
                {userLabel(selectedUser)}
                {roleLabel(selectedUser) !== '—' && (
                  <span className="permissions-user-role"> — {roleLabel(selectedUser)}</span>
                )}
                {useCustomPermissions && !permissionsReadOnly && (
                  <span className="permissions-custom-badge"> Custom</span>
                )}
              </p>
              {permissionsReadOnly && (
                <p className="role-settings-permissions-hint role-settings-readonly-note">
                  Admin accounts always have full access. Permission rows are shown for reference only.
                </p>
              )}
              {loading ? (
                <div className="role-settings-loading">Loading permissions...</div>
              ) : (
                <div className="permissions-list">
                  {permissionCategoryEntries.map(([category, moduleEntries]) => {
                    const isLookupCategory = category === LOOKUP_DATA_CATEGORY;
                    const allLookupIds = isLookupCategory
                      ? [
                          ...new Set(
                            moduleEntries.flatMap(([, perms]) =>
                              perms.map((p) => Number(p.permission_id))
                            )
                          ),
                        ]
                      : [];
                    const assignedLookupCount = isLookupCategory
                      ? assignedIds.filter((id) => allLookupIds.includes(Number(id))).length
                      : 0;
                    const lookupAllChecked =
                      isLookupCategory &&
                      allLookupIds.length > 0 &&
                      assignedLookupCount === allLookupIds.length;
                    const lookupIndeterminate =
                      isLookupCategory &&
                      assignedLookupCount > 0 &&
                      !lookupAllChecked;

                    return (
                    <div
                      key={category}
                      className={
                        isLookupCategory
                          ? 'permission-category permission-category-lookup'
                          : 'permission-category'
                      }
                    >
                      {isLookupCategory && (
                        <div className="permission-module-toggle permission-lookup-toggle">
                          <button
                            type="button"
                            className="permission-lookup-expand-button"
                            onClick={() => setLookupDataExpanded((v) => !v)}
                            aria-expanded={lookupDataExpanded}
                          >
                            <span className="permission-module-chevron" aria-hidden>
                              {lookupDataExpanded ? '▼' : '▶'}
                            </span>
                            <span className="permission-module-title">{LOOKUP_DATA_LABEL}</span>
                          </button>
                          {!permissionsReadOnly && allLookupIds.length > 0 && (
                            <label className="permission-category-lookup-master">
                              <input
                                type="checkbox"
                                checked={lookupAllChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = lookupIndeterminate;
                                }}
                                onChange={(e) => {
                                  const on = e.target.checked;
                                  setAssignedIds((prev) => {
                                    const without = prev.filter(
                                      (id) => !allLookupIds.includes(Number(id))
                                    );
                                    if (!on) return without;
                                    return [...without, ...allLookupIds];
                                  });
                                }}
                              />
                              <span>All lookup data</span>
                            </label>
                          )}
                        </div>
                      )}
                      {(!isLookupCategory || lookupDataExpanded) && (
                        <div className={isLookupCategory ? 'permission-lookup-modules' : undefined}>
                      {moduleEntries.map(([moduleKey, perms]) => {
                        const multi = perms.length > 1;
                        const open = isModuleExpanded(category, moduleKey, perms.length);
                        const allIds = perms.map((p) => Number(p.permission_id));
                        const viewTierIds = getViewTierPermissionIds(moduleKey, perms);
                        const useTierUi = multi && viewTierIds.length > 0;
                        const modulePortal = perms.some((p) =>
                          isPortalPermission(p.permission_id)
                        );
                        const tierUiClass = `permission-module permission-module-tier${
                          modulePortal ? ' permission-module-tier-portal' : ''
                        }`;
                        const uid = selectedUser.user_id;

                        if (perms.length === 1) {
                          const p = perms[0];
                          const pid = Number(p.permission_id);
                          const checked = assignedIds.some((id) => Number(id) === pid);
                          return (
                            <div
                              key={`${category}-${moduleKey}`}
                              className={tierUiClass}
                            >
                              <div className="permission-tier-parent-row">
                                <label className="permission-tier-parent-label">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={permissionsReadOnly}
                                    onChange={() => handleTogglePermission(p.permission_id)}
                                  />
                                  <span className="permission-tier-parent-title">
                                    {formatModuleLabel(moduleKey)}
                                  </span>
                                </label>
                              </div>
                            </div>
                          );
                        }

                        if (useTierUi) {
                          const assignedInModule = assignedIds
                            .map(Number)
                            .filter((id) => allIds.includes(id));
                          const moduleEnabled = assignedInModule.length > 0;
                          let tier = 'none';
                          if (moduleEnabled) {
                            if (sameIdSet(assignedInModule, allIds)) tier = 'full';
                            else if (sameIdSet(assignedInModule, viewTierIds)) tier = 'view';
                            else tier = 'mixed';
                          }
                          const nestedKey = `${category}::tier_nested::${moduleKey}::${uid}`;
                          const nestedOpen =
                            expandedModules[nestedKey] === undefined
                              ? moduleEnabled
                              : expandedModules[nestedKey];
                          const radioName = `module-tier-${uid}-${category}-${moduleKey}`;
                          return (
                            <div key={`${category}-${moduleKey}-tier`} className={tierUiClass}>
                              <div className="permission-tier-parent-row">
                                <label className="permission-tier-parent-label">
                                  <input
                                    type="checkbox"
                                    checked={moduleEnabled}
                                    disabled={permissionsReadOnly}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        applyModuleAccessTier(allIds, viewTierIds, 'view');
                                        setExpandedModules((prev) => ({
                                          ...prev,
                                          [nestedKey]: true,
                                        }));
                                      } else {
                                        applyModuleAccessTier(allIds, viewTierIds, 'none');
                                      }
                                    }}
                                  />
                                  <span className="permission-tier-parent-title">
                                    {formatModuleLabel(moduleKey)}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  className="permission-tier-chevron"
                                  aria-expanded={nestedOpen}
                                  aria-label={
                                    nestedOpen ? 'Collapse access options' : 'Expand access options'
                                  }
                                  disabled={!moduleEnabled || permissionsReadOnly}
                                  onClick={() =>
                                    setExpandedModules((prev) => ({
                                      ...prev,
                                      [nestedKey]: !prev[nestedKey],
                                    }))
                                  }
                                >
                                  {nestedOpen ? '▼' : '▶'}
                                </button>
                              </div>
                              {moduleEnabled && nestedOpen && (
                                <div
                                  className="permission-tier-nested"
                                  role="group"
                                  aria-label={`${formatModuleLabel(moduleKey)} access level`}
                                >
                                  <label className="permission-tier-radio-label">
                                    <input
                                      type="radio"
                                      name={radioName}
                                      checked={tier === 'view'}
                                      disabled={permissionsReadOnly}
                                      onChange={() =>
                                        applyModuleAccessTier(allIds, viewTierIds, 'view')
                                      }
                                    />
                                    <span>VIEW ONLY</span>
                                  </label>
                                  <label className="permission-tier-radio-label">
                                    <input
                                      type="radio"
                                      name={radioName}
                                      checked={tier === 'full'}
                                      disabled={permissionsReadOnly}
                                      onChange={() =>
                                        applyModuleAccessTier(allIds, viewTierIds, 'full')
                                      }
                                    />
                                    <span>FULL ACCESS</span>
                                  </label>
                                  {moduleKey === 'evaluation' && yearLevels.length > 0 && (
                                    <div className="permission-eval-year-nested">
                                      <div className="permission-eval-year-checkboxes">
                                        {yearLevels.map((yl) => {
                                          const id = Number(yl.year_level_id);
                                          const checked = evalYearLevelSelectedIds.some(
                                            (x) => Number(x) === id
                                          );
                                          return (
                                            <label
                                              key={id}
                                              className="permission-checkbox-label permission-eval-year-label"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={permissionsReadOnly}
                                                onChange={() => toggleEvalYearLevel(id)}
                                              />
                                              <span className="permission-name">
                                                {yl.year_level || `Year level #${id}`}
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`${category}-${moduleKey}`}
                            className={
                              multi ? 'permission-module' : 'permission-module permission-module-single'
                            }
                          >
                            {multi && (
                              <button
                                type="button"
                                className="permission-module-toggle"
                                onClick={() => toggleModuleExpanded(category, moduleKey)}
                                aria-expanded={open}
                                disabled={permissionsReadOnly}
                              >
                                <span className="permission-module-chevron" aria-hidden>
                                  {open ? '▼' : '▶'}
                                </span>
                                <span className="permission-module-title">
                                  {formatModuleLabel(moduleKey)}
                                </span>
                              </button>
                            )}
                            <ul
                              className={
                                multi
                                  ? `permission-module-items${open ? ' is-open' : ' is-collapsed'}`
                                  : 'permission-module-items permission-module-items-flat'
                              }
                            >
                              {perms.map((p) => {
                                const name = p.permission_name || '';
                                const actionLabel = formatPermissionActionLabel(name, moduleKey, multi);
                                return (
                                  <li
                                    key={p.permission_id}
                                    className={
                                      isPortalPermission(p.permission_id)
                                        ? 'permission-item permission-item-portal'
                                        : 'permission-item'
                                    }
                                  >
                                    <label className="permission-checkbox-label">
                                      <input
                                        type="checkbox"
                                        disabled={permissionsReadOnly}
                                        checked={assignedIds.some(
                                          (id) => Number(id) === Number(p.permission_id)
                                        )}
                                        onChange={() => handleTogglePermission(p.permission_id)}
                                      />
                                      {actionLabel ? (
                                        <span className="permission-name permission-name-crud">
                                          <span className="permission-crud-action">{actionLabel}</span>
                                        </span>
                                      ) : (
                                        <span className="permission-name">
                                          {displayPermissionName(name)}
                                        </span>
                                      )}
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                        </div>
                      )}
                    </div>
                    );
                  })}
                  {permissions.length === 0 && (
                    <p className="no-data">No permissions defined.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="permissions-placeholder">Select a user to view and edit permissions.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleSettings;
