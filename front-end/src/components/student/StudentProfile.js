import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const StudentProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    contact_number: '',
    student_id_number: '',
    address: '',
    academic_status: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // Assuming there's an endpoint to get student profile by user_id
      const response = await api.get(`/students/profile`);
      setProfile(response.data);
      setFormData({
        first_name: response.data.first_name || '',
        middle_name: response.data.middle_name || '',
        last_name: response.data.last_name || '',
        contact_number: response.data.contact_number || '',
        student_id_number: response.data.student_id_number || '',
        address: response.data.address || '',
        academic_status: response.data.academic_status || '',
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
      // If profile doesn't exist yet, set empty state
      if (err.response?.status === 404) {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (profile) {
        // Update existing profile
        await api.put(`/students/profile`, formData);
      } else {
        // Create new profile
        await api.post(`/students/profile`, formData);
      }
      await fetchProfile();
      alert('Profile saved successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.message || 'Failed to save profile');
      alert(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-message">Loading profile...</div>;
  }

  return (
    <div className="student-profile">
      <div className="profile-header">
        <h2>Student Profile</h2>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label htmlFor="student_id_number">Student ID Number</label>
          <input
            type="text"
            id="student_id_number"
            name="student_id_number"
            value={formData.student_id_number}
            onChange={handleInputChange}
            disabled={!!profile?.student_id_number}
            required
            placeholder="Enter student ID number"
          />
          {profile?.student_id_number && (
            <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
              Student ID number cannot be changed after creation
            </small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="first_name">First Name</label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            required
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
            onChange={handleInputChange}
            placeholder="Enter middle name (optional)"
          />
        </div>

        <div className="form-group">
          <label htmlFor="last_name">Last Name</label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            required
            placeholder="Enter last name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="contact_number">Contact Number</label>
          <input
            type="text"
            id="contact_number"
            name="contact_number"
            value={formData.contact_number}
            onChange={handleInputChange}
            placeholder="Enter contact number"
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter address"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="academic_status">Academic Status</label>
          <select
            id="academic_status"
            name="academic_status"
            value={formData.academic_status}
            onChange={handleInputChange}
          >
            <option value="">Select Status</option>
            <option value="Regular">Regular</option>
            <option value="Irregular">Irregular</option>
            <option value="Probationary">Probationary</option>
            <option value="On Leave">On Leave</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-button" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentProfile;

