import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import './DeanPanel.css';

const DeanProfile = ({ deanProfile, onUpdate }) => {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    contact_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    employee_id: '',
    department: '',
    specialization: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || '',
        contact_number: user.contact_number || '',
      }));
    }
    if (deanProfile) {
      setFormData((prev) => ({
        ...prev,
        first_name: deanProfile.first_name || '',
        middle_name: deanProfile.middle_name || '',
        last_name: deanProfile.last_name || '',
        employee_id: deanProfile.employee_id || '',
        department:
          deanProfile.department?.department_name ||
          deanProfile.department?.department_code ||
          deanProfile.program?.department?.department_name ||
          '',
        specialization: deanProfile.specialization || '',
      }));
    }
  }, [user, deanProfile]);

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
      await api.put('/profile/account', {
        contact_number: formData.contact_number,
      });
      await api.put('/deans/profile', {
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        employee_id: formData.employee_id,
        specialization: formData.specialization,
      });
      
      setMessage({
        type: 'success',
        text: 'Profile updated successfully!',
      });

      refreshUser();
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
    <div className="dean-section">
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
              disabled
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
            <label htmlFor="dean_department">Assigned Department</label>
            <input
              type="text"
              id="dean_department"
              value={formData.department || 'Not assigned'}
              disabled
            />
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

        <div className="form-actions">
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeanProfile;

