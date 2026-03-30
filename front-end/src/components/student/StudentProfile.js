import React, { useState, useEffect } from 'react';
import { swalSuccess, swalError } from '../../utils/swal';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const StudentProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [yearLevels, setYearLevels] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    contact_number: '',
    student_id_number: '',
    address: '',
    academic_status: '',
    year_level_id: '',
    track_id: '',
  });

  useEffect(() => {
    fetchProfile();
    fetchProfileOptions();
  }, []);

  const fetchProfileOptions = async () => {
    try {
      const response = await api.get('/students/profile-options');
      setYearLevels(response.data?.year_levels || []);
      setTracks(response.data?.tracks || []);
    } catch (err) {
      console.error('Error fetching profile options:', err);
    }
  };

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
        year_level_id: response.data.year_level_id || '',
        track_id: response.data.track_id || '',
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
      const yearLevelId = formData.year_level_id ? Number(formData.year_level_id) : null;
      const selectedYear = yearLevels.find((y) => Number(y.year_level_id) === yearLevelId);
      const yearText = (selectedYear?.year_level || '').toString().toLowerCase();
      const isThirdYear = yearText.includes('3') || yearText.includes('third');

      if (isThirdYear && !formData.track_id) {
        await swalError('Track required', 'Please select your track for 3rd year.');
        setSaving(false);
        return;
      }

      const payload = {
        ...formData,
        year_level_id: formData.year_level_id ? Number(formData.year_level_id) : null,
        track_id: formData.track_id ? Number(formData.track_id) : null,
      };

      if (profile) {
        // Update existing profile
        await api.put(`/students/profile`, payload);
      } else {
        // Create new profile
        await api.post(`/students/profile`, payload);
      }
      await fetchProfile();
      await swalSuccess('Saved', 'Profile saved successfully.');
    } catch (err) {
      console.error('Error saving profile:', err);
      const msg = err.response?.data?.message || 'Failed to save profile';
      setError(msg);
      await swalError('Could not save profile', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-message">Loading profile...</div>;
  }

  const selectedYear = yearLevels.find(
    (yearLevel) => Number(yearLevel.year_level_id) === Number(formData.year_level_id)
  );
  const selectedYearText = (selectedYear?.year_level || '').toString().toLowerCase();
  const selectedYearId = Number(formData.year_level_id || 0);
  const shouldShowTrack =
    selectedYearId === 3 || selectedYearText.includes('3') || selectedYearText.includes('third');

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
          <label htmlFor="student_program_readonly">Program</label>
          <input
            type="text"
            id="student_program_readonly"
            value={
              profile?.program
                ? `${profile.program.program_name || '—'}${
                    profile.program.program_code ? ` (${profile.program.program_code})` : ''
                  }`
                : '—'
            }
            disabled
            readOnly
          />
          <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
            Program is assigned by administration and cannot be changed here.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="academic_status">Academic status (on record)</label>
          <select
            id="academic_status"
            name="academic_status"
            value={formData.academic_status}
            onChange={handleInputChange}
            disabled
          >
            <option value="">Select Status</option>
            <option value="Regular">Regular</option>
            <option value="Irregular">Irregular</option>
            <option value="Probationary">Probationary</option>
            <option value="On Leave">On Leave</option>
          </select>
          <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
            Official status kept by the registrar or administration. It may differ from the progress-based
            status below until your record is updated.
          </small>
        </div>

        {profile?.computed_academic_status && (
          <div className="form-group student-profile-computed-status">
            <span className="student-profile-computed-label">Progress-based status (curriculum sequence)</span>
            <div
              className={
                profile.computed_academic_status === 'Irregular'
                  ? 'student-profile-computed-value student-profile-computed-irregular'
                  : 'student-profile-computed-value student-profile-computed-regular'
              }
            >
              {profile.computed_academic_status}
            </div>
            {Array.isArray(profile.academic_status_reasons) && profile.academic_status_reasons.length > 0 && (
              <p className="student-profile-computed-note">{profile.academic_status_reasons.join(' ')}</p>
            )}
            <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.35rem' }}>
              Derived from your curriculum order and which subjects are marked passed (same logic as academic
              evaluation). Not editable here.
            </small>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="year_level_id">Year Level</label>
          <select
            id="year_level_id"
            name="year_level_id"
            value={formData.year_level_id}
            onChange={handleInputChange}
            disabled
          >
            <option value="">Select Year Level</option>
            {yearLevels.map((yearLevel) => (
              <option key={yearLevel.year_level_id} value={yearLevel.year_level_id}>
                {yearLevel.year_level}
              </option>
            ))}
          </select>
          <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
            Year level is assigned by administration and cannot be changed here.
          </small>
        </div>

        {shouldShowTrack && (
          <div className="form-group">
            <label htmlFor="track_id">Track (3rd Year)</label>
            <select
              id="track_id"
              name="track_id"
              value={formData.track_id}
              onChange={handleInputChange}
              disabled
            >
              <option value="">Select Track</option>
              {tracks.map((track) => (
                <option key={track.track_id} value={track.track_id}>
                  {track.track_name}
                  {track.track_code ? ` (${track.track_code})` : ''}
                </option>
              ))}
            </select>
            <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
              Track is assigned by administration and cannot be changed here.
            </small>
          </div>
        )}

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

