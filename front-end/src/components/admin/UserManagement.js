import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { swalConfirm, swalToast, swalError } from '../../utils/swal';
import './UserManagement.css';

function isStudentRoleName(name) {
  return String(name || '').trim().toLowerCase() === 'student';
}

/**
 * @param {{ userScope?: 'staff' | 'students' }} props
 * staff — directory staff only (excludes Student role). students — Student role only.
 */
const UserManagement = ({ userScope = 'staff' }) => {
  const { user: sessionUser } = useAuth();
  const sessionUserId = Number(sessionUser?.user_id ?? sessionUser?.id ?? NaN);
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [accessLevels, setAccessLevels] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const showPermissionsTab = userScope !== 'students';

  const assignableRoles = useMemo(() => {
    if (userScope === 'staff') {
      return roles.filter((r) => !isStudentRoleName(r.role_name || r.name));
    }
    if (userScope === 'students') {
      return roles.filter((r) => isStudentRoleName(r.role_name || r.name));
    }
    return roles;
  }, [roles, userScope]);

  const formatAxiosError = (err) => {
    const data = err?.response?.data;
    if (!data) return err?.message || 'Request failed';

    if (data.messages && typeof data.messages === 'object') {
      // Laravel validation: { error: 'Validation failed', messages: { field: [msg] } }
      const flat = Object.values(data.messages).flat().filter(Boolean);
      if (flat.length) return flat.join('\n');
    }

    return data.message || data.error || err.message || 'Request failed';
  };

  useEffect(() => {
    if (!showPermissionsTab && activeTab === 'permissions') {
      setActiveTab('users');
    }
  }, [showPermissionsTab, activeTab]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
      fetchRoles();
      fetchAccessLevels();
      fetchPrograms();
      fetchProfileOptions();
    } else if (activeTab === 'permissions') {
      fetchPermissions();
      fetchRoles();
    }
  }, [activeTab]);

  const fetchProfileOptions = async () => {
    try {
      const response = await api.get('/students/profile-options');
      setYearLevels(response.data?.year_levels || []);
      setTracks(response.data?.tracks || []);
    } catch (err) {
      console.warn('Could not fetch student profile options:', err);
      setYearLevels([]);
      setTracks([]);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      const usersData = response.data || [];
      console.log('Users fetched:', usersData);
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search users
  useEffect(() => {
    let filtered = [...users];

    if (userScope === 'staff') {
      filtered = filtered.filter(
        (u) => !isStudentRoleName(u.role?.role_name || u.role?.name)
      );
    } else if (userScope === 'students') {
      filtered = filtered.filter((u) =>
        isStudentRoleName(u.role?.role_name || u.role?.name)
      );
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        (user.email && user.email.toLowerCase().includes(term)) ||
        (user.contact_number && user.contact_number.includes(term)) ||
        (user.role && user.role.role_name && user.role.role_name.toLowerCase().includes(term)) ||
        (user.user_id && user.user_id.toString().includes(term))
      );
    }

    // Apply role filter
    if (roleFilter) {
      filtered = filtered.filter(user => 
        user.role_id && user.role_id.toString() === roleFilter
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(user => 
        (user.status || 'active').toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter, userScope]);

  const fetchAccessLevels = async () => {
    try {
      const response = await api.get('/lookup/access-levels');
      const accessLevelsData = Array.isArray(response.data) ? response.data : (response.data?.data || response.data || []);
      console.log('Access levels fetched:', accessLevelsData);
      setAccessLevels(accessLevelsData);
    } catch (error) {
      console.warn('Could not fetch access levels from /lookup/access-levels:', error);
      // Fallback to hardcoded access levels if API fails
      const fallbackLevels = [
        { id: 1, name: 'Admin', description: 'Full system access' },
        { id: 2, name: 'Manager', description: 'Department management' },
        { id: 3, name: 'User', description: 'Basic user access' },
        { id: 4, name: 'Viewer', description: 'Read-only access' }
      ];
      console.log('Using fallback access levels:', fallbackLevels);
      setAccessLevels(fallbackLevels);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/lookup/roles');
      const rolesData = Array.isArray(response.data) ? response.data : (response.data?.data || response.data || []);
      setRoles(rolesData);
    } catch (error) {
      console.warn('Could not fetch roles from /lookup/roles, trying /users/roles/list:', error);
      // Fallback to the original endpoint
      try {
        const fallbackResponse = await api.get('/users/roles/list');
        setRoles(fallbackResponse.data || []);
      } catch (fallbackError) {
        console.warn('Could not fetch roles from fallback endpoint:', fallbackError);
      }
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await api.get('/lookup/programs');
      const programsData = Array.isArray(response.data) ? response.data : (response.data?.data || response.data || []);
      setPrograms(programsData);
    } catch (error) {
      console.warn('Could not fetch programs:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/permissions');
      const permissionsData = response.data?.data || response.data || [];
      setPermissions(Array.isArray(permissionsData) ? permissionsData : []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setError('Failed to fetch permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermission = () => {
    setEditingItem(null);
    setFormData({ permission_name: '', description: '' });
    setShowModal(true);
  };

  const handleEditPermission = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleDeletePermission = async (id) => {
    const ok = await swalConfirm({
      title: 'Delete permission?',
      text: 'Are you sure you want to delete this permission?',
      confirmButtonText: 'Delete',
    });
    if (!ok) return;
    try {
      await api.delete(`/permissions/${id}`);
      fetchPermissions();
      swalToast('success', 'Permission deleted');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to delete permission';
      setError(msg);
      await swalError('Delete failed', msg);
    }
  };

  const handleSubmitPermission = async (e) => {
    e.preventDefault();
    try {
      setError('');
      if (editingItem) {
        await api.put(`/permissions/${editingItem.permission_id}`, formData);
      } else {
        await api.post('/permissions', formData);
      }
      setShowModal(false);
      fetchPermissions();
      swalToast('success', editingItem ? 'Permission updated' : 'Permission created');
    } catch (error) {
      const msg = error.response?.data?.message || `Failed to ${editingItem ? 'update' : 'create'} permission`;
      setError(msg);
      await swalError('Save failed', msg);
    }
  };

  const isStudentRole = () => {
    if (!formData.role_id) return false;
    const selectedRole = roles.find(r => (r.id || r.role_id) == formData.role_id);
    const roleName = (selectedRole?.role_name || selectedRole?.name || '').toString().trim().toLowerCase();
    return roleName === 'student';
  };

  const isDeanRole = () => {
    if (!formData.role_id) return false;
    const selectedRole = roles.find(r => (r.id || r.role_id) == formData.role_id);
    const roleName = (selectedRole?.role_name || selectedRole?.name || '').toString().trim().toLowerCase();
    return roleName === 'dean';
  };

  const handleAdd = () => {
    setEditingUser(null);
    const studentRole = roles.find((r) => isStudentRoleName(r.role_name || r.name));
    const sid = studentRole ? studentRole.role_id || studentRole.id : '';
    const studentAccess =
      studentRole && studentRole.access_level !== undefined && studentRole.access_level !== null
        ? String(studentRole.access_level)
        : '';
    setFormData({
      email: '',
      password: '',
      contact_number: '',
      role_id: userScope === 'students' && sid ? String(sid) : '',
      access_level_id: userScope === 'students' && studentAccess ? studentAccess : '',
      status: 'active',
      // Student-specific fields
      student_id_number: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      address: '',
      age: '',
      current_program: '',
      year_level_id: '',
      track_id: '',
      // Dean-specific fields
      program_id: '',
    });
    setShowModal(true);
  };

  const handleEdit = async (user) => {
    setEditingUser(user);
    const roleId = user.role_id || '';
    
    // Auto-populate access level from role if available
    let accessLevelId = '';
    if (roleId) {
      const userRole = roles.find(r => (r.id || r.role_id) == roleId);
      if (userRole && userRole.access_level !== undefined) {
        accessLevelId = userRole.access_level;
      } else if (user.role && user.role.access_level !== undefined) {
        // Fallback: get from user.role if roles array doesn't have it yet
        accessLevelId = user.role.access_level;
      }
    }
    
    const formDataToSet = {
      email: user.email || '',
      password: '', // Don't pre-fill password for security
      contact_number: user.contact_number || '',
      role_id: roleId,
      access_level_id: accessLevelId,
      status: user.status || 'active',
      // Student-specific fields - initialize as empty
      student_id_number: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      address: '',
      age: '',
      current_program: '',
      year_level_id: '',
      track_id: '',
    };

    // If user is a student, fetch their student profile
    const isStudent = user.role && (user.role.role_name === 'Student' || user.role.name === 'Student');
    if (isStudent && user.user_id) {
      try {
        // Fetch student profile - we'll need to create an admin endpoint or use a workaround
        // For now, try to get it via the student endpoint with user_id in query
        const profileResponse = await api.get(`/students/profile?user_id=${user.user_id}`, { silent: true });
        if (profileResponse.data) {
          const profile = profileResponse.data;
          formDataToSet.student_id_number = profile.student_id_number || '';
          formDataToSet.first_name = profile.first_name || '';
          formDataToSet.middle_name = profile.middle_name || '';
          formDataToSet.last_name = profile.last_name || '';
          formDataToSet.address = profile.address || '';
          formDataToSet.academic_status = profile.academic_status || '';
          formDataToSet.current_program = profile.current_program || profile.Current_Program || profile.currentProgram || '';
          formDataToSet.year_level_id = profile.year_level_id || '';
          formDataToSet.track_id = profile.track_id || '';
        }
      } catch (error) {
        // If profile doesn't exist or error, continue with empty fields
        // Backend returns an empty object {} when profile doesn't exist,
        // so only warn for real errors (not 404).
        if (error?.response?.status !== 404) {
          console.warn('Could not fetch student profile:', error);
        }
      }
    }

    // If user is a dean, fetch their dean profile
    const isDean = user.role && (user.role.role_name === 'Dean' || user.role.name === 'Dean');
    if (isDean && user.user_id) {
      try {
        const deanResponse = await api.get(`/deans/profile?user_id=${user.user_id}`, { silent: true });
        if (deanResponse.data && deanResponse.data.program_id) {
          formDataToSet.program_id = deanResponse.data.program_id;
        }
      } catch (error) {
        console.warn('Could not fetch dean profile:', error);
      }
    }
    
    setFormData(formDataToSet);
    setShowModal(true);
  };

  const handleToggleUserStatus = async (row) => {
    const id = row.user_id || row.id;
    const current = String(row.status || 'active').toLowerCase();
    const isActive = current === 'active';
    const next = isActive ? 'inactive' : 'active';

    if (Number.isFinite(sessionUserId) && sessionUserId === Number(id) && next === 'inactive') {
      await swalError('Not allowed', 'You cannot deactivate your own account.');
      return;
    }

    const ok = await swalConfirm({
      title: next === 'inactive' ? 'Deactivate account?' : 'Activate account?',
      text:
        next === 'inactive'
          ? 'This user will not be able to sign in until an administrator activates the account again.'
          : 'Restore login access for this user.',
      confirmButtonText: next === 'inactive' ? 'Deactivate' : 'Activate',
    });
    if (!ok) return;

    try {
      const payload = {
        email: row.email,
        contact_number: row.contact_number ?? '',
        role_id: row.role_id,
        status: next,
      };
      const deanProgramId =
        row.dean_profile?.program_id ??
        row.deanProfile?.program_id ??
        row.dean_profile?.program?.program_id ??
        row.deanProfile?.program?.program_id;
      if (deanProgramId != null && deanProgramId !== '') {
        payload.program_id = deanProgramId;
      }
      await api.put(`/users/${id}`, payload);
      fetchUsers();
      swalToast('success', next === 'active' ? 'User activated' : 'User deactivated');
    } catch (error) {
      const msg = formatAxiosError(error) || 'Failed to update status';
      setError(msg);
      await swalError('Update failed', msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const submitData = { ...formData };

      // Admin validation: ensure year level is set for students,
      // and ensure track is set when year level is 3rd year.
      if (isStudentRole()) {
        if (!submitData.student_id_number) {
          await swalError('Student ID required', 'Please enter Student ID Number to save student profile.');
          return;
        }
        const yearLevelId = submitData.year_level_id ? Number(submitData.year_level_id) : null;
        const isThirdYear = yearLevelId === 3;
        if (isThirdYear && !submitData.track_id) {
          await swalError('Track required', 'Please assign a Track for 3rd year students.');
          return;
        }
      }
      
      // Only include password if it's provided (for updates)
      if (!submitData.password && editingUser) {
        delete submitData.password;
      }

      // Separate user creation and student profile creation
      if (editingUser) {
        // Update user account
        const userData = {
          email: submitData.email,
          password: submitData.password,
          contact_number: submitData.contact_number,
          role_id: submitData.role_id,
          status: submitData.status,
        };
        if (!userData.password) {
          delete userData.password;
        }

        // If dean role, include program_id in user update (handled by backend)
        if (isDeanRole() && submitData.program_id) {
          userData.program_id = submitData.program_id;
        }

        await api.put(`/users/${editingUser.user_id}`, userData);
        
        // If student role, update student profile
        if (isStudentRole()) {
          try {
            const profileData = {
              user_id: editingUser.user_id,
              student_id_number: submitData.student_id_number,
              first_name: submitData.first_name,
              middle_name: submitData.middle_name,
              last_name: submitData.last_name,
              contact_number: submitData.contact_number,
              address: submitData.address,
              academic_status: submitData.academic_status || null,
              current_program: submitData.current_program || null,
              year_level_id: submitData.year_level_id ? Number(submitData.year_level_id) : null,
              track_id: submitData.track_id ? Number(submitData.track_id) : null,
            };
            await api.put('/students/profile', profileData);
          } catch (studentError) {
            console.error('Error updating student profile:', studentError);
            await swalError('Student profile save failed', formatAxiosError(studentError));
            return;
          }
        }
      } else {
        // Create user first
        const userData = {
          email: submitData.email,
          password: submitData.password,
          contact_number: submitData.contact_number,
          role_id: submitData.role_id,
          status: submitData.status,
        };

        // Include program_id if dean role
        if (isDeanRole() && submitData.program_id) {
          userData.program_id = submitData.program_id;
        }
        
        const userResponse = await api.post('/users', userData);
        const newUser = userResponse.data;
        
        // If student role, create student profile
        if (isStudentRole() && newUser.user_id) {
          try {
            await api.post('/students/profile', {
              user_id: newUser.user_id,
              student_id_number: submitData.student_id_number,
              first_name: submitData.first_name,
              middle_name: submitData.middle_name,
              last_name: submitData.last_name,
              contact_number: submitData.contact_number,
              address: submitData.address,
              academic_status: submitData.academic_status || null,
              current_program: submitData.current_program || null,
              year_level_id: submitData.year_level_id ? Number(submitData.year_level_id) : null,
              track_id: submitData.track_id ? Number(submitData.track_id) : null,
            });
          } catch (studentError) {
            console.error('Error creating student profile:', studentError);
            await swalError('Student profile save failed', formatAxiosError(studentError));
            return;
          }
        }

        // If dean role, dean profile is created automatically via UserController
        // The program_id is sent with the user creation request
      }
      
      setShowModal(false);
      setEditingUser(null);
      fetchUsers();
      swalToast('success', editingUser ? 'User updated' : 'User created');
    } catch (error) {
      const msg = error.response?.data?.message || `Failed to ${editingUser ? 'update' : 'create'} user`;
      setError(msg);
      await swalError('Save failed', msg);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    // Don't immediately clear error - let user see it for a moment
    setTimeout(() => setError(''), 3000);
  };

  const getAccessLevelName = (user) => {
    // Get access level from role
    if (user && user.role && user.role.access_level !== undefined && user.role.access_level !== null) {
      return user.role.access_level.toString();
    }
    if (user && user.role_id) {
      const userRole = roles.find(r => (r.id || r.role_id) == user.role_id);
      if (userRole && userRole.access_level !== undefined && userRole.access_level !== null) {
        return userRole.access_level.toString();
      }
    }
    return 'Not Set';
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId || r.role_id === roleId);
    return role ? (role.role_name || role.name || 'Unknown') : 'No Role';
  };

  const adminSelectedYearId = formData.year_level_id ? Number(formData.year_level_id) : null;
  const adminShouldShowTrack = adminSelectedYearId === 3;

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
      <div className="user-management">
      <div
        className={`management-header${userScope === 'students' ? ' management-header--minimal' : ''}`}
      >
        {userScope !== 'students' ? (
          <h2>User Management</h2>
        ) : (
          <span className="management-header__minimal-spacer" aria-hidden />
        )}
        {activeTab === 'users' && (
          <button className="add-button" onClick={handleAdd}>
            {userScope === 'students' ? 'Add Student' : 'Add User'}
          </button>
        )}
        {activeTab === 'permissions' && (
          <button className="add-button" onClick={handleAddPermission}>
            Add Permission
          </button>
        )}
      </div>

      {showPermissionsTab && (
        <div className="user-tabs">
          <button
            className={activeTab === 'users' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={activeTab === 'permissions' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('permissions')}
          >
            Permissions
          </button>
        </div>
      )}

      {activeTab === 'users' && (
        <>

      {error && <div className="error-message">{error}</div>}

      {/* Search and Filter Section */}
      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by email, contact number, ID, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-controls">
          {userScope !== 'students' && (
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Roles</option>
            {assignableRoles.map((role) => (
              <option key={role.id || role.role_id} value={role.id || role.role_id}>
                {role.role_name || role.name}
              </option>
            ))}
          </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {(searchTerm || roleFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setStatusFilter('');
              }}
              className="clear-filters-button"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="table-section">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Contact Number</th>
                <th>Role</th>
                <th>Program</th>
                <th>Access Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-data">
                    {users.length === 0 ? 'No users found' : 'No users match your filters'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const getProgramName = () => {
                    if (user.dean_profile?.program) {
                      return user.dean_profile.program.program_name || 'N/A';
                    }
                    if (user.deanProfile?.program) {
                      return user.deanProfile.program.program_name || 'N/A';
                    }
                    if (user.student_profile?.program) {
                      return user.student_profile.program.program_name || 'N/A';
                    }
                    if (user.studentProfile?.program) {
                      return user.studentProfile.program.program_name || 'N/A';
                    }
                    return '-';
                  };
                  
                  return (
                    <tr key={user.user_id || user.id}>
                      <td>{user.user_id || user.id || '-'}</td>
                      <td>{user.email || '-'}</td>
                      <td>{user.contact_number || '-'}</td>
                      <td>{getRoleName(user.role_id)}</td>
                      <td>{getProgramName()}</td>
                      <td>
                        <span className="access-level-badge">
                          {getAccessLevelName(user)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.status === 'active' ? 'active' : 'inactive'}`}>
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => handleEdit(user)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`status-toggle-button ${
                            (user.status || 'active').toLowerCase() === 'active'
                              ? 'status-toggle-button--deactivate'
                              : 'status-toggle-button--activate'
                          }`}
                          onClick={() => handleToggleUserStatus(user)}
                          disabled={
                            Number.isFinite(sessionUserId) &&
                            sessionUserId === Number(user.user_id || user.id) &&
                            (user.status || 'active').toLowerCase() === 'active'
                          }
                          title={
                            Number.isFinite(sessionUserId) &&
                            sessionUserId === Number(user.user_id || user.id) &&
                            (user.status || 'active').toLowerCase() === 'active'
                              ? 'You cannot deactivate your own account'
                              : undefined
                          }
                        >
                          {(user.status || 'active').toLowerCase() === 'active'
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                {userScope === 'students'
                  ? editingUser
                    ? 'Edit Student'
                    : 'Add Student'
                  : editingUser
                    ? 'Edit User'
                    : 'Add User'}
              </h3>
              <button className="close-button" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password {editingUser && '(leave blank to keep current)'}</label>
                <input
                  type="password"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="text"
                  value={formData.contact_number || ''}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role_id || ''}
                  onChange={(e) => {
                    const selectedRoleId = e.target.value;
                    const selectedRole = roles.find(
                      (r) => (r.id || r.role_id) == selectedRoleId
                    );
                    
                    // Auto-fill access level based on selected role
                    const newFormData = { ...formData, role_id: selectedRoleId };
                    if (selectedRole && selectedRole.access_level !== undefined) {
                      newFormData.access_level_id = selectedRole.access_level;
                    }
                    setFormData(newFormData);
                  }}
                  required
                  disabled={userScope === 'students' && assignableRoles.length <= 1}
                >
                  <option value="">Select Role</option>
                  {assignableRoles.map((role) => (
                    <option key={role.id || role.role_id} value={role.id || role.role_id}>
                      {role.role_name || role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Access Level</label>
                <input
                  type="number"
                  value={formData.access_level_id || ''}
                  onChange={(e) => setFormData({ ...formData, access_level_id: e.target.value })}
                  placeholder="Enter access level (e.g., 1-10)"
                  min="1"
                  max="10"
                  required
                />
                {formData.role_id && (
                  <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                    Automatically set based on selected role
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Dean-specific fields */}
              {isDeanRole() && (
                <>
                  <div style={{ marginTop: '1.5rem', marginBottom: '1rem', borderTop: '2px solid #e0e0e0', paddingTop: '1rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Dean Information</h4>
                  </div>
                  
                  <div className="form-group">
                    <label>Program *</label>
                    <select
                      value={formData.program_id || ''}
                      onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                      required={isDeanRole()}
                    >
                      <option value="">Select Program</option>
                      {programs.map((program) => (
                        <option key={program.program_id || program.id} value={program.program_id || program.id}>
                          {program.program_name || program.name} ({program.program_code || program.code || 'N/A'})
                        </option>
                      ))}
                    </select>
                    <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                      Select the program this dean will manage
                    </small>
                  </div>
                </>
              )}

              {/* Student-specific fields */}
              {isStudentRole() && (
                <>
                  <div style={{ marginTop: '1.5rem', marginBottom: '1rem', borderTop: '2px solid #e0e0e0', paddingTop: '1rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Student Information</h4>
                  </div>
                  
                  <div className="form-group">
                    <label>Student ID Number *</label>
                    <input
                      type="text"
                      value={formData.student_id_number || ''}
                      onChange={(e) => setFormData({ ...formData, student_id_number: e.target.value })}
                      placeholder="e.g., 02-2324-07413"
                      required={isStudentRole() && (!editingUser || !formData.student_id_number)}
                    />
                  </div>

                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      value={formData.first_name || ''}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Enter first name"
                      required={isStudentRole()}
                    />
                  </div>

                  <div className="form-group">
                    <label>Middle Name</label>
                    <input
                      type="text"
                      value={formData.middle_name || ''}
                      onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                      placeholder="Enter middle name (optional)"
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      value={formData.last_name || ''}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Enter last name"
                      required={isStudentRole()}
                    />
                  </div>

                  <div className="form-group">
                    <label>Address</label>
                    <textarea
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter address"
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Academic Status</label>
                    <select
                      value={formData.academic_status || ''}
                      onChange={(e) => setFormData({ ...formData, academic_status: e.target.value })}
                    >
                      <option value="">Select Status</option>
                      <option value="Regular">Regular</option>
                      <option value="Irregular">Irregular</option>
                      <option value="Probationary">Probationary</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Year Level</label>
                    <select
                      value={formData.year_level_id || ''}
                      onChange={(e) => {
                        const newYearLevelId = e.target.value;
                        // Reset track if year level changes
                        setFormData({
                          ...formData,
                          year_level_id: newYearLevelId,
                          track_id: '',
                        });
                      }}
                    >
                      <option value="">Select Year Level</option>
                      {yearLevels.map((yearLevel) => (
                        <option key={yearLevel.year_level_id} value={yearLevel.year_level_id}>
                          {yearLevel.year_level}
                        </option>
                      ))}
                    </select>
                  </div>

                  {adminShouldShowTrack && (
                    <div className="form-group">
                      <label>Track (3rd Year) *</label>
                      <select
                        value={formData.track_id || ''}
                        onChange={(e) => setFormData({ ...formData, track_id: e.target.value })}
                        required={adminShouldShowTrack}
                      >
                        <option value="">Select Track</option>
                        {tracks.map((track) => (
                          <option key={track.track_id} value={track.track_id}>
                            {track.track_name}
                            {track.track_code ? ` (${track.track_code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Program</label>
                    <select
                      value={formData.current_program || ''}
                      onChange={(e) => setFormData({ ...formData, current_program: e.target.value })}
                    >
                      <option value="">Select Program (optional)</option>
                      {programs.map((program) => (
                        <option key={program.program_id || program.id} value={program.program_id || program.id}>
                          {program.program_name || program.name} ({program.program_code || program.code || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
      
      {activeTab === 'permissions' && (
        <div className="table-section">
          {loading ? (
            <div className="loading">Loading permissions...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Permission Name</th>
                    <th>Description</th>
                    <th>Assigned Roles</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="no-data">No permissions found</td>
                    </tr>
                  ) : (
                    permissions.map((item) => (
                      <tr key={item.permission_id}>
                        <td>{item.permission_name}</td>
                        <td>{item.description || '-'}</td>
                        <td>
                          {item.roles && item.roles.length > 0
                            ? item.roles.map(r => r.role_name).join(', ')
                            : 'None'}
                        </td>
                        <td className="actions">
                          <button className="edit-button" onClick={() => handleEditPermission(item)}>
                            Edit
                          </button>
                          <button className="delete-button" onClick={() => handleDeletePermission(item.permission_id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && activeTab === 'permissions' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? 'Edit' : 'Add'} Permission</h3>
              <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmitPermission} className="modal-form">
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label>Permission Name <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.permission_name || ''}
                  onChange={(e) => setFormData({ ...formData, permission_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
