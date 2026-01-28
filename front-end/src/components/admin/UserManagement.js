import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [accessLevels, setAccessLevels] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchAccessLevels();
    fetchPrograms();
  }, []);

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
  }, [users, searchTerm, roleFilter, statusFilter]);

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

  const isStudentRole = () => {
    if (!formData.role_id) return false;
    const selectedRole = roles.find(r => (r.id || r.role_id) == formData.role_id);
    return selectedRole && (selectedRole.role_name || selectedRole.name) === 'Student';
  };

  const isDeanRole = () => {
    if (!formData.role_id) return false;
    const selectedRole = roles.find(r => (r.id || r.role_id) == formData.role_id);
    return selectedRole && (selectedRole.role_name || selectedRole.name) === 'Dean';
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      contact_number: '',
      role_id: '',
      access_level_id: '',
      status: 'active',
      // Student-specific fields
      student_id_number: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      address: '',
      age: '',
      current_program: '',
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
          formDataToSet.current_program = profile.current_program || '';
        }
      } catch (error) {
        // If profile doesn't exist or error, continue with empty fields
        console.warn('Could not fetch student profile:', error);
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const submitData = { ...formData };
      
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
              first_name: submitData.first_name,
              middle_name: submitData.middle_name,
              last_name: submitData.last_name,
              contact_number: submitData.contact_number,
              address: submitData.address,
              academic_status: submitData.academic_status || null,
              current_program: submitData.current_program || null,
            };
            await api.put('/students/profile', profileData);
          } catch (studentError) {
            console.error('Error updating student profile:', studentError);
            // Continue even if profile update fails
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
            });
          } catch (studentError) {
            console.error('Error creating student profile:', studentError);
            // User is created but profile failed - still show success
          }
        }

        // If dean role, dean profile is created automatically via UserController
        // The program_id is sent with the user creation request
      }
      
      setShowModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.message || `Failed to ${editingUser ? 'update' : 'create'} user`);
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

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="user-management">
      <div className="management-header">
        <h2>User Management</h2>
        <button className="add-button" onClick={handleAdd}>
          Add User
        </button>
      </div>

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
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.id || role.role_id} value={role.id || role.role_id}>
                {role.role_name || role.name}
              </option>
            ))}
          </select>
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
                  // Get program name for dean users
                  const getProgramName = () => {
                    if (user.dean_profile && user.dean_profile.program) {
                      return user.dean_profile.program.program_name || 'N/A';
                    }
                    if (user.deanProfile && user.deanProfile.program) {
                      return user.deanProfile.program.program_name || 'N/A';
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
                          className="edit-button"
                          onClick={() => handleEdit(user)}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDelete(user.user_id || user.id)}
                        >
                          Delete
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
                {editingUser ? 'Edit User' : 'Add User'}
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
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
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
                      required={isStudentRole() && !editingUser}
                      disabled={!!editingUser && !!formData.student_id_number}
                    />
                    {editingUser && formData.student_id_number && (
                      <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                        Student ID number cannot be changed
                      </small>
                    )}
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
    </div>
  );
};

export default UserManagement;
