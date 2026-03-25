import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { swalConfirm, swalToast, swalError } from '../../utils/swal';
import './SystemManagement.css';

const SystemManagement = () => {
  const [activeTab, setActiveTab] = useState('schools');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [data, setData] = useState({
    schools: [],
    otherSchoolSubjects: [],
    subjectEquivalences: [],
  });
  const [lookupData, setLookupData] = useState({
    schools: [],
    subjects: [],
  });

  useEffect(() => {
    fetchLookupData();
    fetchData();
  }, [activeTab]);

  const fetchLookupData = async () => {
    try {
      const [schoolsResp, subjectsResp] = await Promise.allSettled([
        api.get('/schools'),
        api.get('/lookup/subjects'),
      ]);

      setLookupData({
        schools: schoolsResp.status === 'fulfilled' ? (schoolsResp.value.data || []) : [],
        subjects: subjectsResp.status === 'fulfilled' ? (subjectsResp.value.data || []) : [],
      });
    } catch (err) {
      console.error('Error fetching lookup data:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      let endpoint = '';
      switch (activeTab) {
        case 'schools':
          endpoint = '/schools';
          break;
        case 'other-school-subjects':
          endpoint = '/other-school-subjects';
          break;
        case 'subject-equivalences':
          endpoint = '/subject-equivalences';
          break;
        default:
          return;
      }

      const response = await api.get(endpoint);
      const responseData = response.data?.data || response.data || [];
      
      const dataKey = activeTab.replace(/-/g, '_');
      setData(prev => ({
        ...prev,
        [dataKey]: Array.isArray(responseData) ? responseData : [],
      }));
    } catch (err) {
      console.error(`Error fetching ${activeTab}:`, err);
      setError(err.response?.data?.message || `Failed to load ${activeTab}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData(getDefaultFormData());
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const ok = await swalConfirm({
      title: `Delete ${getTabTitle()}?`,
      text: `Are you sure you want to delete this ${getTabTitle()}?`,
      confirmButtonText: 'Delete',
    });
    if (!ok) return;

    try {
      let endpoint = '';
      switch (activeTab) {
        case 'schools':
          endpoint = `/schools/${id}`;
          break;
        case 'other-school-subjects':
          endpoint = `/other-school-subjects/${id}`;
          break;
        case 'subject-equivalences':
          endpoint = `/subject-equivalences/${id}`;
          break;
        case 'permissions':
          endpoint = `/permissions/${id}`;
          break;
        default:
          return;
      }

      await api.delete(endpoint);
      fetchData();
      swalToast('success', `${getTabTitle()} deleted`);
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to delete ${getTabTitle()}`;
      setError(msg);
      await swalError('Delete failed', msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      let endpoint = '';
      switch (activeTab) {
        case 'schools':
          endpoint = editingItem ? `/schools/${editingItem.school_id}` : '/schools';
          break;
        case 'other-school-subjects':
          endpoint = editingItem ? `/other-school-subjects/${editingItem.other_subject_id}` : '/other-school-subjects';
          break;
        case 'subject-equivalences':
          endpoint = editingItem ? `/subject-equivalences/${editingItem.equivalence_id}` : '/subject-equivalences';
          break;
        case 'permissions':
          endpoint = editingItem ? `/permissions/${editingItem.permission_id}` : '/permissions';
          break;
        default:
          return;
      }

      if (editingItem) {
        await api.put(endpoint, formData);
      } else {
        await api.post(endpoint, formData);
      }

      setShowModal(false);
      fetchData();
      swalToast('success', editingItem ? `${getTabTitle()} updated` : `${getTabTitle()} created`);
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${editingItem ? 'update' : 'create'} ${getTabTitle()}`;
      setError(msg);
      await swalError('Save failed', msg);
    }
  };

  const getDefaultFormData = () => {
    switch (activeTab) {
      case 'schools':
        return { school_name: '', school_program: '', school_curriculum: '' };
      case 'other-school-subjects':
        return { school_id: '', subject_code: '', subject_name: '', units: '', hours: '', description: '' };
      case 'subject-equivalences':
        return { other_school_subject: '', subject_id: '', credited_units: '', credit_basis: '', status: 'active', remarks: '' };
      case 'permissions':
        return { permission_name: '', description: '' };
      default:
        return {};
    }
  };

  const getTabTitle = () => {
    const titles = {
      'schools': 'School',
      'other-school-subjects': 'Other School Subject',
      'subject-equivalences': 'Subject Equivalence',
      'permissions': 'Permission',
      'audit-logs': 'Audit Log',
    };
    return titles[activeTab] || '';
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'schools':
        return (
          <>
            <div className="form-group">
              <label>School Name <span className="required">*</span></label>
              <input
                type="text"
                value={formData.school_name || ''}
                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>School Program</label>
              <input
                type="text"
                value={formData.school_program || ''}
                onChange={(e) => setFormData({ ...formData, school_program: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>School Curriculum</label>
              <textarea
                value={formData.school_curriculum || ''}
                onChange={(e) => setFormData({ ...formData, school_curriculum: e.target.value })}
                rows="3"
              />
            </div>
          </>
        );
      case 'other-school-subjects':
        return (
          <>
            <div className="form-group">
              <label>School <span className="required">*</span></label>
              <select
                value={formData.school_id || ''}
                onChange={(e) => setFormData({ ...formData, school_id: e.target.value ? parseInt(e.target.value) : '' })}
                required
              >
                <option value="">Select School</option>
                {lookupData.schools.map((school) => (
                  <option key={school.school_id} value={school.school_id}>
                    {school.school_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Subject Code <span className="required">*</span></label>
              <input
                type="text"
                value={formData.subject_code || ''}
                onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Subject Name <span className="required">*</span></label>
              <input
                type="text"
                value={formData.subject_name || ''}
                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Units</label>
              <input
                type="number"
                value={formData.units || ''}
                onChange={(e) => setFormData({ ...formData, units: e.target.value ? parseInt(e.target.value) : '' })}
              />
            </div>
            <div className="form-group">
              <label>Hours</label>
              <input
                type="number"
                value={formData.hours || ''}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value ? parseInt(e.target.value) : '' })}
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
          </>
        );
      case 'subject-equivalences':
        return (
          <>
            <div className="form-group">
              <label>Other School Subject <span className="required">*</span></label>
              <select
                value={formData.other_school_subject || ''}
                onChange={(e) => setFormData({ ...formData, other_school_subject: e.target.value ? parseInt(e.target.value) : '' })}
                required
              >
                <option value="">Select Other School Subject</option>
                {data.other_school_subjects?.map((subj) => (
                  <option key={subj.other_subject_id} value={subj.other_subject_id}>
                    {subj.subject_code} - {subj.subject_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Equivalent Subject <span className="required">*</span></label>
              <select
                value={formData.subject_id || ''}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value ? parseInt(e.target.value) : '' })}
                required
              >
                <option value="">Select Subject</option>
                {lookupData.subjects.map((subj) => (
                  <option key={subj.subject_id} value={subj.subject_id}>
                    {subj.subject_code} - {subj.subject_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Credited Units</label>
              <input
                type="number"
                value={formData.credited_units || ''}
                onChange={(e) => setFormData({ ...formData, credited_units: e.target.value ? parseInt(e.target.value) : '' })}
              />
            </div>
            <div className="form-group">
              <label>Credit Basis</label>
              <input
                type="text"
                value={formData.credit_basis || ''}
                onChange={(e) => setFormData({ ...formData, credit_basis: e.target.value })}
                placeholder="e.g., TOR, Syllabus"
              />
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
            <div className="form-group">
              <label>Remarks</label>
              <textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows="3"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const renderTable = () => {
    const dataKey = activeTab.replace(/-/g, '_');
    const currentData = data[dataKey] || [];

    switch (activeTab) {
      case 'schools':
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>School Name</th>
                <th>School Program</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan="3" className="no-data">No schools found</td>
                </tr>
              ) : (
                currentData.map((item) => (
                  <tr key={item.school_id}>
                    <td>{item.school_name}</td>
                    <td>{item.school_program || '-'}</td>
                    <td className="actions">
                      <button className="edit-button" onClick={() => handleEdit(item)}>Edit</button>
                      <button className="delete-button" onClick={() => handleDelete(item.school_id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        );
      case 'other-school-subjects':
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>School</th>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Units</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">No other school subjects found</td>
                </tr>
              ) : (
                currentData.map((item) => (
                  <tr key={item.other_subject_id}>
                    <td>{item.school?.school_name || '-'}</td>
                    <td>{item.subject_code}</td>
                    <td>{item.subject_name}</td>
                    <td>{item.units || '-'}</td>
                    <td className="actions">
                      <button className="edit-button" onClick={() => handleEdit(item)}>Edit</button>
                      <button className="delete-button" onClick={() => handleDelete(item.other_subject_id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        );
      case 'subject-equivalences':
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>Other School Subject</th>
                <th>Equivalent Subject</th>
                <th>Credited Units</th>
                <th>Credit Basis</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">No subject equivalences found</td>
                </tr>
              ) : (
                currentData.map((item) => (
                  <tr key={item.equivalence_id}>
                    <td>{item.otherSchoolSubject?.subject_code} - {item.otherSchoolSubject?.subject_name}</td>
                    <td>{item.subject?.subject_code} - {item.subject?.subject_name}</td>
                    <td>{item.credited_units || '-'}</td>
                    <td>{item.credit_basis || '-'}</td>
                    <td>
                      <span className={`status-badge status-${item.status?.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="edit-button" onClick={() => handleEdit(item)}>Edit</button>
                      <button className="delete-button" onClick={() => handleDelete(item.equivalence_id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  return (
    <div className="system-management">
      <div className="management-header">
        <h2>System Management</h2>
        <button className="add-button" onClick={handleAdd}>
          Add {getTabTitle()}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="system-tabs">
        <button
          className={activeTab === 'schools' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('schools')}
        >
          Schools
        </button>
        <button
          className={activeTab === 'other-school-subjects' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('other-school-subjects')}
        >
          Other School Subjects
        </button>
        <button
          className={activeTab === 'subject-equivalences' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('subject-equivalences')}
        >
          Subject Equivalences
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading {getTabTitle()}...</div>
      ) : (
        <div className="table-container">
          {renderTable()}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? 'Edit' : 'Add'} {getTabTitle()}</h3>
              <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              {error && <div className="error-message">{error}</div>}
              {renderForm()}
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

export default SystemManagement;

