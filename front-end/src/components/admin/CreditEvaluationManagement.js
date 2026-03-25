import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { swalConfirm, swalToast, swalError } from '../../utils/swal';
import './CreditEvaluationManagement.css';

/** When true (faculty/adviser portal), only list + approve/reject (status & remarks). */
const CreditEvaluationManagement = ({ approvalMode = false }) => {
  const { isAdmin } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    student_id: '',
    school_id: '',
    credit_type: '',
    evaluated_by: '',
    evaluation_date: '',
    status: 'pending',
    remarks: '',
    credit_details: [{ other_subject_id: '', subject_id: '', credited_units: '', credit_basis: '', remarks: '' }],
  });
  const [lookupData, setLookupData] = useState({
    students: [],
    schools: [],
    users: [],
    subjects: [],
    otherSchoolSubjects: [],
  });

  useEffect(() => {
    fetchData();
    fetchLookupData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/credit-evaluations');
      setEvaluations(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching credit evaluations:', err);
      setError(err.response?.data?.message || 'Failed to load credit evaluations');
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupData = async () => {
    try {
      const [studentsResp, schoolsResp, usersResp, subjectsResp, otherSubjectsResp] = await Promise.allSettled([
        api.get('/evaluation/students').catch(() => ({ data: [] })),
        api.get('/schools'),
        api.get('/users'),
        api.get('/lookup/subjects'),
        api.get('/other-school-subjects'),
      ]);

      setLookupData({
        students: studentsResp.status === 'fulfilled' ? (studentsResp.value.data?.students || studentsResp.value.data || []) : [],
        schools: schoolsResp.status === 'fulfilled' ? (schoolsResp.value.data || []) : [],
        users: usersResp.status === 'fulfilled' ? (usersResp.value.data || []) : [],
        subjects: subjectsResp.status === 'fulfilled' ? (subjectsResp.value.data || []) : [],
        otherSchoolSubjects: otherSubjectsResp.status === 'fulfilled' ? (otherSubjectsResp.value.data || []) : [],
      });
    } catch (err) {
      console.error('Error fetching lookup data:', err);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      student_id: '',
      school_id: '',
      credit_type: '',
      evaluated_by: '',
      evaluation_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      remarks: '',
      credit_details: [{ other_subject_id: '', subject_id: '', credited_units: '', credit_basis: '', remarks: '' }],
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      student_id: item.student_id || '',
      school_id: item.school_id || '',
      credit_type: item.credit_type || '',
      evaluated_by: item.evaluated_by || '',
      evaluation_date: item.evaluation_date || new Date().toISOString().split('T')[0],
      status: item.status || 'pending',
      remarks: item.remarks || '',
      credit_details: item.credit_details && item.credit_details.length > 0
        ? item.credit_details.map(detail => ({
            other_subject_id: detail.other_subject_id || '',
            subject_id: detail.subject_id || '',
            credited_units: detail.credited_units || '',
            credit_basis: detail.credit_basis || '',
            remarks: detail.remarks || '',
          }))
        : [{ other_subject_id: '', subject_id: '', credited_units: '', credit_basis: '', remarks: '' }],
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const ok = await swalConfirm({
      title: 'Delete credit evaluation?',
      text: 'Are you sure you want to delete this credit evaluation?',
      confirmButtonText: 'Delete',
    });
    if (!ok) return;

    try {
      await api.delete(`/credit-evaluations/${id}`);
      fetchData();
      swalToast('success', 'Credit evaluation deleted');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete credit evaluation';
      setError(msg);
      await swalError('Delete failed', msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (approvalMode && editingItem) {
        await api.put(`/credit-evaluations/${editingItem.credit_eval_id}`, {
          status: formData.status,
          remarks: formData.remarks || '',
        });
      } else {
        const data = { ...formData };
        if (editingItem) {
          await api.put(`/credit-evaluations/${editingItem.credit_eval_id}`, data);
        } else {
          await api.post('/credit-evaluations', data);
        }
      }

      setShowModal(false);
      fetchData();
      swalToast('success', editingItem ? 'Credit evaluation updated' : 'Credit evaluation created');
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${editingItem ? 'update' : 'create'} credit evaluation`;
      setError(msg);
      await swalError('Save failed', msg);
    }
  };

  const addCreditDetail = () => {
    setFormData({
      ...formData,
      credit_details: [...formData.credit_details, { other_subject_id: '', subject_id: '', credited_units: '', credit_basis: '', remarks: '' }],
    });
  };

  const removeCreditDetail = (index) => {
    const newDetails = formData.credit_details.filter((_, i) => i !== index);
    setFormData({ ...formData, credit_details: newDetails.length > 0 ? newDetails : [{ other_subject_id: '', subject_id: '', credited_units: '', credit_basis: '', remarks: '' }] });
  };

  const updateCreditDetail = (index, field, value) => {
    const newDetails = [...formData.credit_details];
    newDetails[index][field] = value;
    setFormData({ ...formData, credit_details: newDetails });
  };

  if (loading) {
    return <div className="loading">Loading credit evaluations...</div>;
  }

  return (
    <div className="credit-evaluation-management">
      <div className="management-header">
        <h2>{approvalMode ? 'Credit evaluation (review)' : 'Credit Evaluation Management'}</h2>
        {!approvalMode && isAdmin && (
          <button className="add-button" onClick={handleAdd}>
            Add Credit Evaluation
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>School</th>
              <th>Credit Type</th>
              <th>Evaluation Date</th>
              <th>Status</th>
              <th>Evaluated By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">No credit evaluations found</td>
              </tr>
            ) : (
              evaluations.map((evaluation) => (
                <tr key={evaluation.credit_eval_id}>
                  <td>
                    {evaluation.student?.first_name || evaluation.student?.full_name || '-'} 
                    {evaluation.student?.last_name ? ` ${evaluation.student.last_name}` : ''} 
                    {evaluation.student?.student_number ? ` (${evaluation.student.student_number})` : ''}
                  </td>
                  <td>{evaluation.school?.school_name || '-'}</td>
                  <td>{evaluation.credit_type || '-'}</td>
                  <td>{evaluation.evaluation_date || '-'}</td>
                  <td>
                    <span className={`status-badge status-${(evaluation.status || 'pending')?.toLowerCase()}`}>
                      {evaluation.status || 'Pending'}
                    </span>
                  </td>
                  <td>{evaluation.evaluator?.email || evaluation.evaluator?.Email || '-'}</td>
                  <td className="actions">
                    <button className="view-button" onClick={() => {
                      setSelectedEvaluation(evaluation);
                      setShowDetailsModal(true);
                    }}>
                      View Details
                    </button>
                    <button className="edit-button" onClick={() => handleEdit(evaluation)}>
                      {approvalMode ? 'Update status' : 'Edit'}
                    </button>
                    {!approvalMode && isAdmin && (
                      <button className="delete-button" onClick={() => handleDelete(evaluation.credit_eval_id)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {approvalMode && editingItem
                  ? 'Review credit request'
                  : `${editingItem ? 'Edit' : 'Add'} Credit Evaluation`}
              </h3>
              <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              {error && <div className="error-message">{error}</div>}

              {approvalMode && editingItem ? (
                <>
                  <p className="help-text" style={{ marginBottom: '1rem', color: '#555' }}>
                    Set the decision for this credit request. Only status and remarks are saved.
                  </p>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      rows="4"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="cancel-button" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-button">
                      Save decision
                    </button>
                  </div>
                </>
              ) : (
                <>
              <div className="form-group">
                <label>Student <span className="required">*</span></label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  required
                >
                  <option value="">Select Student</option>
                  {lookupData.students.map((student) => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.first_name || student.full_name || ''} {student.last_name || ''} {student.student_number ? `(${student.student_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>School <span className="required">*</span></label>
                <select
                  value={formData.school_id}
                  onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
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
                <label>Credit Type <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.credit_type}
                  onChange={(e) => setFormData({ ...formData, credit_type: e.target.value })}
                  required
                  placeholder="e.g., Transfer Credit, Advanced Placement"
                />
              </div>

              <div className="form-group">
                <label>Evaluated By <span className="required">*</span></label>
                <select
                  value={formData.evaluated_by}
                  onChange={(e) => setFormData({ ...formData, evaluated_by: e.target.value })}
                  required
                >
                  <option value="">Select Evaluator</option>
                  {lookupData.users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Evaluation Date <span className="required">*</span></label>
                <input
                  type="date"
                  value={formData.evaluation_date}
                  onChange={(e) => setFormData({ ...formData, evaluation_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="form-group">
                <label>Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Credit Details <span className="required">*</span></label>
                {formData.credit_details.map((detail, index) => (
                  <div key={index} className="credit-detail-row">
                    <div className="detail-fields">
                      <select
                        value={detail.other_subject_id}
                        onChange={(e) => updateCreditDetail(index, 'other_subject_id', e.target.value)}
                        required
                        placeholder="Other School Subject"
                      >
                        <option value="">Select Other School Subject</option>
                        {lookupData.otherSchoolSubjects.map((subj) => (
                          <option key={subj.other_subject_id} value={subj.other_subject_id}>
                            {subj.subject_code} - {subj.subject_name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={detail.subject_id}
                        onChange={(e) => updateCreditDetail(index, 'subject_id', e.target.value)}
                        required
                        placeholder="Equivalent Subject"
                      >
                        <option value="">Select Equivalent Subject</option>
                        {lookupData.subjects.map((subj) => (
                          <option key={subj.subject_id} value={subj.subject_id}>
                            {subj.subject_code} - {subj.subject_name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={detail.credited_units}
                        onChange={(e) => updateCreditDetail(index, 'credited_units', e.target.value)}
                        placeholder="Credited Units"
                      />
                      <input
                        type="text"
                        value={detail.credit_basis}
                        onChange={(e) => updateCreditDetail(index, 'credit_basis', e.target.value)}
                        placeholder="Credit Basis (TOR, Syllabus)"
                      />
                      <input
                        type="text"
                        value={detail.remarks}
                        onChange={(e) => updateCreditDetail(index, 'remarks', e.target.value)}
                        placeholder="Remarks"
                      />
                    </div>
                    {formData.credit_details.length > 1 && (
                      <button type="button" className="remove-detail-button" onClick={() => removeCreditDetail(index)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="add-detail-button" onClick={addCreditDetail}>
                  + Add Credit Detail
                </button>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedEvaluation && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Credit Evaluation Details</h3>
              <button className="close-button" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="details-section">
                <h4>Evaluation Information</h4>
                <div className="detail-row">
                  <strong>Student:</strong> 
                  <span>
                    {selectedEvaluation.student?.first_name || selectedEvaluation.student?.full_name || '-'} 
                    {selectedEvaluation.student?.last_name ? ` ${selectedEvaluation.student.last_name}` : ''} 
                    {selectedEvaluation.student?.student_number ? ` (${selectedEvaluation.student.student_number})` : ''}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>School:</strong> 
                  <span>{selectedEvaluation.school?.school_name || '-'}</span>
                </div>
                <div className="detail-row">
                  <strong>Credit Type:</strong> 
                  <span>{selectedEvaluation.credit_type || '-'}</span>
                </div>
                <div className="detail-row">
                  <strong>Evaluation Date:</strong> 
                  <span>{selectedEvaluation.evaluation_date || '-'}</span>
                </div>
                <div className="detail-row">
                  <strong>Status:</strong> 
                  <span className={`status-badge status-${(selectedEvaluation.status || 'pending')?.toLowerCase()}`}>
                    {selectedEvaluation.status || 'Pending'}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Evaluated By:</strong> 
                  <span>{selectedEvaluation.evaluator?.email || selectedEvaluation.evaluator?.Email || '-'}</span>
                </div>
                {selectedEvaluation.remarks && (
                  <div className="detail-row">
                    <strong>Remarks:</strong> 
                    <span>{selectedEvaluation.remarks}</span>
                  </div>
                )}
              </div>

              <div className="details-section">
                <h4>Credit Details ({selectedEvaluation.creditDetails?.length || selectedEvaluation.credit_details?.length || 0})</h4>
                {selectedEvaluation.creditDetails && selectedEvaluation.creditDetails.length > 0 ? (
                  <table className="details-table">
                    <thead>
                      <tr>
                        <th>Other School Subject</th>
                        <th>Equivalent Subject</th>
                        <th>Credited Units</th>
                        <th>Credit Basis</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEvaluation.creditDetails.map((detail, index) => (
                        <tr key={detail.credit_detail_id || index}>
                          <td>
                            {detail.otherSchoolSubject?.subject_code || '-'} - {detail.otherSchoolSubject?.subject_name || '-'}
                          </td>
                          <td>
                            {detail.subject?.subject_code || '-'} - {detail.subject?.subject_name || '-'}
                          </td>
                          <td>{detail.credited_units || '-'}</td>
                          <td>{detail.credit_basis || '-'}</td>
                          <td>{detail.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : selectedEvaluation.credit_details && selectedEvaluation.credit_details.length > 0 ? (
                  <table className="details-table">
                    <thead>
                      <tr>
                        <th>Other School Subject</th>
                        <th>Equivalent Subject</th>
                        <th>Credited Units</th>
                        <th>Credit Basis</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEvaluation.credit_details.map((detail, index) => (
                        <tr key={index}>
                          <td>
                            {detail.otherSchoolSubject?.subject_code || detail.other_subject_id || '-'} - {detail.otherSchoolSubject?.subject_name || '-'}
                          </td>
                          <td>
                            {detail.subject?.subject_code || detail.subject_id || '-'} - {detail.subject?.subject_name || '-'}
                          </td>
                          <td>{detail.credited_units || '-'}</td>
                          <td>{detail.credit_basis || '-'}</td>
                          <td>{detail.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-data">No credit details found</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="close-button" onClick={() => setShowDetailsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditEvaluationManagement;

