import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { swalToast, swalError } from '../../utils/swal';
import './RoleSettings.css';

const RoleSettings = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [assignedIds, setAssignedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchPermissionsForRole(selectedRole.role_id);
    } else {
      setPermissions([]);
      setAssignedIds([]);
    }
  }, [selectedRole?.role_id]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/lookup/roles');
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || response.data || []);
      setRoles(data);
      if (data.length > 0 && !selectedRole) {
        setSelectedRole(data[0]);
      }
    } catch (err) {
      try {
        const fallback = await api.get('/users/roles/list');
        const data = Array.isArray(fallback.data) ? fallback.data : (fallback.data?.data || fallback.data || []);
        setRoles(data);
        if (data.length > 0 && !selectedRole) setSelectedRole(data[0]);
      } catch (e2) {
        setError('Failed to load roles');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionsForRole = async (roleId) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/permissions/for-role/${roleId}`);
      setPermissions(response.data.permissions || []);
      setAssignedIds(response.data.assigned_ids || []);
    } catch (err) {
      setError('Failed to load permissions for role');
      setPermissions([]);
      setAssignedIds([]);
      swalError('Could not load permissions', 'Failed to load permissions for this role.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (permissionId) => {
    setAssignedIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await api.put(`/permissions/sync-role/${selectedRole.role_id}`, {
        permission_ids: assignedIds,
      });
      setSuccess('Permissions saved successfully.');
      swalToast('success', 'Permissions saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save permissions';
      setError(msg);
      swalError('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const permissionsByCategory = permissions.reduce((acc, p) => {
    const cat = p.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  if (loading && roles.length === 0) {
    return (
      <div className="role-settings">
        <div className="role-settings-loading">Loading roles...</div>
      </div>
    );
  }

  return (
    <div className="role-settings">
      <div className="role-settings-header">
        <h2>Role Settings</h2>
        <p className="role-settings-subtitle">Manage which modules each role can access.</p>
      </div>

      {error && <div className="role-settings-error">{error}</div>}
      {success && <div className="role-settings-success">{success}</div>}

      <div className="role-settings-panels">
        <div className="role-settings-panel role-settings-roles">
          <div className="role-panel-header">
            <h3>User Roles</h3>
          </div>
          <div className="role-table-wrap">
            <table className="role-table">
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Access Level</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="no-data">No roles found</td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr
                      key={role.role_id || role.id}
                      className={selectedRole?.role_id === role.role_id || selectedRole?.id === role.id ? 'selected' : ''}
                      onClick={() => setSelectedRole(role)}
                    >
                      <td>{role.role_name || role.name}</td>
                      <td>
                        <span className="access-badge">{role.access_level ?? role.access_level_id ?? '-'}</span>
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
            <h3>Role Permissions</h3>
            {selectedRole && (
              <button
                type="button"
                className="role-save-button"
                onClick={handleSavePermissions}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            )}
          </div>
          {selectedRole ? (
            <>
              <p className="permissions-for-label">Permissions for {selectedRole.role_name || selectedRole.name}</p>
              {loading ? (
                <div className="role-settings-loading">Loading permissions...</div>
              ) : (
                <div className="permissions-list">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="permission-category">
                      <h4 className="permission-category-title">{category}</h4>
                      <ul className="permission-items">
                        {perms.map((p) => (
                          <li key={p.permission_id} className="permission-item">
                            <label className="permission-checkbox-label">
                              <input
                                type="checkbox"
                                checked={assignedIds.includes(p.permission_id)}
                                onChange={() => handleTogglePermission(p.permission_id)}
                              />
                              <span className="permission-name">{p.permission_name}</span>
                            </label>
                            {p.description && (
                              <span className="permission-desc">{p.description}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {permissions.length === 0 && (
                    <p className="no-data">No permissions defined. Add permissions in User Management → Permissions.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="permissions-placeholder">Select a role to view and edit its permissions.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleSettings;
