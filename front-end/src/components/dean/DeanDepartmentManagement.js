import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import './DeanPanel.css';

const DeanDepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formData, setFormData] = useState({
    department_name: '',
    department_code: '',
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    filterDepartments();
  }, [searchTerm, departments]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/lookup/departments');
      const departmentsData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setDepartments(departmentsData);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const filterDepartments = () => {
    let filtered = [...departments];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((dept) => {
        const name = dept.department_name?.toLowerCase() || '';
        const code = dept.department_code?.toLowerCase() || '';
        return name.includes(term) || code.includes(term);
      });
    }

    setFilteredDepartments(filtered);
  };

  const handleAdd = () => {
    setEditingDepartment(null);
    setFormData({
      department_name: '',
      department_code: '',
    });
    setError('');
    setShowModal(true);
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setFormData({
      department_name: department.department_name || '',
      department_code: department.department_code || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      await api.delete(`/lookup/departments/${id}`);
      fetchDepartments();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete department');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingDepartment) {
        await api.put(`/lookup/departments/${editingDepartment.department_id}`, formData);
      } else {
        await api.post('/lookup/departments', formData);
      }
      setShowModal(false);
      fetchDepartments();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save department');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <div className="dean-section">
        <div className="loading-message">Loading departments...</div>
      </div>
    );
  }

  return (
    <div className="dean-section">
      <div className="section-header">
        <h2>Department Management</h2>
        <button className="button button-primary" onClick={handleAdd}>
          Add Department
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Search */}
      <div className="form-group" style={{ maxWidth: '400px', marginBottom: '2rem' }}>
        <label>Search Departments</label>
        <input
          type="text"
          placeholder="Search by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Departments Table */}
      <div className="table-container">
        {filteredDepartments.length === 0 ? (
          <div className="empty-state">No departments found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Department Code</th>
                <th>Department Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.map((dept) => (
                <tr key={dept.department_id}>
                  <td>{dept.department_code}</td>
                  <td>{dept.department_name}</td>
                  <td>
                    <button
                      className="button button-primary"
                      onClick={() => handleEdit(dept)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', marginRight: '0.5rem' }}
                    >
                      Edit
                    </button>
                    <button
                      className="button button-danger"
                      onClick={() => handleDelete(dept.department_id)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDepartment ? 'Edit Department' : 'Add Department'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="error-message">{error}</div>}
                <div className="form-group">
                  <label>Department Code *</label>
                  <input
                    type="text"
                    name="department_code"
                    value={formData.department_code}
                    onChange={handleChange}
                    required
                    placeholder="e.g., CS, IT, ENG"
                  />
                </div>
                <div className="form-group">
                  <label>Department Name *</label>
                  <input
                    type="text"
                    name="department_name"
                    value={formData.department_name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Computer Science"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {editingDepartment ? 'Update' : 'Add'} Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeanDepartmentManagement;

