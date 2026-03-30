import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import './FacultyPanel.css';

const FacultyProfile = ({ facultyProfile, onUpdate }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    contact_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    employee_id: '',
    department_id: '',
    specialization: '',
  });
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchDepartments();
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || '',
        contact_number: user.contact_number || '',
      }));
    }
    if (facultyProfile) {
      setFormData((prev) => ({
        ...prev,
        first_name: facultyProfile.first_name || '',
        middle_name: facultyProfile.middle_name || '',
        last_name: facultyProfile.last_name || '',
        employee_id: facultyProfile.employee_id || '',
        department_id: facultyProfile.department_id || '',
        specialization: facultyProfile.specialization || '',
      }));
    }
  }, [user, facultyProfile]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.departments || response.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Update user info
      await api.put(`/users/${user.user_id}`, {
        email: formData.email,
        contact_number: formData.contact_number,
      });

      // Update or create faculty profile
      if (facultyProfile) {
        await api.put(`/faculty/profile`, {
          first_name: formData.first_name,
          middle_name: formData.middle_name,
          last_name: formData.last_name,
          employee_id: formData.employee_id,
          department_id: formData.department_id,
          specialization: formData.specialization,
        });
      } else {
        await api.post(`/faculty/profile`, {
          first_name: formData.first_name,
          middle_name: formData.middle_name,
          last_name: formData.last_name,
          employee_id: formData.employee_id,
          department_id: formData.department_id,
          specialization: formData.specialization,
        });
      }

      setMessage({
        type: 'success',
        text: 'Profile updated successfully!',
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="faculty-section">
      <div className="section-header">
        <h2>My Profile</h2>
      </div>

      {message.text && (
        <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="contact_number">Contact Number</label>
            <input
              type="text"
              id="contact_number"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              placeholder="Enter contact number"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="first_name">First Name</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Enter first name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="middle_name">Middle Name</label>
            <input
              type="text"
              id="middle_name"
              name="middle_name"
              value={formData.middle_name}
              onChange={handleChange}
              placeholder="Enter middle name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Last Name</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="employee_id">Employee ID</label>
            <input
              type="text"
              id="employee_id"
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              placeholder="Enter employee ID"
            />
          </div>

          <div className="form-group">
            <label htmlFor="department_id">Department</label>
            <select
              id="department_id"
              name="department_id"
              value={formData.department_id}
              onChange={handleChange}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>
                  {dept.department_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="specialization">Specialization</label>
          <input
            type="text"
            id="specialization"
            name="specialization"
            value={formData.specialization}
            onChange={handleChange}
            placeholder="Enter area of specialization"
          />
        </div>

        <div className="form-group">
          <label>Role</label>
          <input
            type="text"
            value={user?.role || 'Evaluator'}
            disabled
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FacultyProfile;

