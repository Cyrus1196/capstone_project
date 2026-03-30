import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { swalConfirm, swalToast, swalError } from '../../utils/swal';
import './CreditEvaluationManagement.css';

/** Normalize API relation key (Laravel uses snake_case in JSON). */
function getCreditDetailsList(item) {
  const raw = item.credit_details || item.creditDetails;
  return Array.isArray(raw) ? raw : [];
}

/** Credit detail row: external subject (Laravel uses `other_school_subject` in JSON). */
function formatDetailOtherSchoolSubject(detail, otherSchoolSubjectsLookup = []) {
  const oss = detail?.other_school_subject ?? detail?.otherSchoolSubject;
  if (oss && typeof oss === 'object') {
    const c = oss.subject_code;
    const n = oss.subject_name;
    if (c != null || n != null) {
      return `${c ?? '—'} - ${n ?? '—'}`;
    }
  }
  const oid = detail?.other_subject_id;
  if (oid != null && oid !== '' && Array.isArray(otherSchoolSubjectsLookup) && otherSchoolSubjectsLookup.length > 0) {
    const row = otherSchoolSubjectsLookup.find((x) => String(x.other_subject_id) === String(oid));
    if (row) {
      return `${row.subject_code ?? '—'} - ${row.subject_name ?? '—'}`;
    }
  }
  return '—';
}

/** Credit detail row: local equivalent subject. */
function formatDetailEquivalentSubject(detail, subjectsLookup = []) {
  const s = detail?.subject ?? detail?.Subject;
  if (s && typeof s === 'object') {
    const c = s.subject_code;
    const n = s.subject_name;
    if (c != null || n != null) {
      return `${c ?? '—'} - ${n ?? '—'}`;
    }
  }
  const sid = detail?.subject_id;
  if (sid != null && sid !== '' && Array.isArray(subjectsLookup) && subjectsLookup.length > 0) {
    const row = subjectsLookup.find((x) => String(x.subject_id) === String(sid));
    if (row) {
      return `${row.subject_code ?? '—'} - ${row.subject_name ?? '—'}`;
    }
  }
  return '—';
}

/**
 * Laravel loads `otherSchoolSubject`; JSON then has `other_school_subject` as a nested object,
 * not the FK scalar — so we must read `other_subject_id` from the object when present.
 */
function getEquivalenceOtherSchoolSubjectId(eq) {
  const raw = eq?.other_school_subject ?? eq?.otherSchoolSubject;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const id = raw.other_subject_id;
    return id != null && id !== '' ? String(id) : null;
  }
  return String(raw);
}

/** Local subject id from equivalence row (scalar or nested `subject`). */
function getEquivalenceSubjectId(eq) {
  if (!eq) return '';
  const nested = eq.subject ?? eq.Subject;
  if (nested && typeof nested === 'object' && nested.subject_id != null) {
    return String(nested.subject_id);
  }
  if (eq.subject_id != null && eq.subject_id !== '') return String(eq.subject_id);
  return '';
}

/** When true (e.g. dean portal), list-focused UI; approve/reject matches backend credit_eval.approve. */
const CreditEvaluationManagement = ({ approvalMode = false }) => {
  const { isAdmin, hasAnyPermission } = useAuth();
  const canApprove =
    !approvalMode ||
    isAdmin ||
    hasAnyPermission(['credit_eval.approve', 'Credit Evaluation']);
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
  /** From Academic Management → Subject Equivalences (used to auto-fill local subject). */
  const [subjectEquivalences, setSubjectEquivalences] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const isActiveEquivalence = (eq) => !eq.status || String(eq.status).toLowerCase() === 'active';

  /** Single source of truth: Laravel nests `other_school_subject` as an object — never key a Map with String(object). */
  const getActiveEquivalencesForOtherId = useCallback(
    (otherId) => {
      const oid = String(otherId || '');
      if (!oid) return [];
      return subjectEquivalences.filter(
        (eq) => isActiveEquivalence(eq) && getEquivalenceOtherSchoolSubjectId(eq) === oid
      );
    },
    [subjectEquivalences]
  );

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
      const [studentsResp, schoolsResp, usersResp, subjectsResp, otherSubjectsResp, equivResp] = await Promise.allSettled([
        api.get('/evaluation/students').catch(() => ({ data: [] })),
        api.get('/schools'),
        api.get('/users'),
        api.get('/lookup/subjects'),
        api.get('/other-school-subjects'),
        api.get('/subject-equivalences').catch(() => ({ data: [] })),
      ]);

      setLookupData({
        students: studentsResp.status === 'fulfilled' ? (studentsResp.value.data?.students || studentsResp.value.data || []) : [],
        schools: schoolsResp.status === 'fulfilled' ? (schoolsResp.value.data || []) : [],
        users: usersResp.status === 'fulfilled' ? (usersResp.value.data || []) : [],
        subjects: subjectsResp.status === 'fulfilled' ? (subjectsResp.value.data || []) : [],
        otherSchoolSubjects: otherSubjectsResp.status === 'fulfilled' ? (otherSubjectsResp.value.data || []) : [],
      });

      let equivData = equivResp.status === 'fulfilled' ? equivResp.value.data : [];
      if (!Array.isArray(equivData) && equivData && Array.isArray(equivData.data)) {
        equivData = equivData.data;
      }
      setSubjectEquivalences(Array.isArray(equivData) ? equivData : []);
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
    const details = getCreditDetailsList(item);
    setFormData({
      student_id: item.student_id || '',
      school_id: item.school_id || '',
      credit_type: item.credit_type || '',
      evaluated_by: item.evaluated_by || '',
      evaluation_date: item.evaluation_date || new Date().toISOString().split('T')[0],
      status: item.status || 'pending',
      remarks: item.remarks || '',
      credit_details: details.length > 0
        ? details.map((detail) => ({
            other_subject_id: detail.other_subject_id || '',
            subject_id: detail.subject_id || '',
            credited_units: detail.credited_units ?? '',
            credit_basis: detail.credit_basis || '',
            remarks: detail.remarks || '',
          }))
        : [{ other_subject_id: '', subject_id: '', credited_units: '', credit_basis: '', remarks: '' }],
    });
    setShowModal(true);
  };

  const quickSetStatus = async (evaluation, status, { onSuccess } = {}) => {
    if (!canApprove) return;
    try {
      await api.put(`/credit-evaluations/${evaluation.credit_eval_id}`, {
        status,
        remarks: evaluation.remarks || '',
      });
      await fetchData();
      onSuccess?.();
      swalToast('success', status === 'approved' ? 'Marked approved' : 'Marked rejected');
    } catch (err) {
      const msg = err.response?.data?.message || 'Update failed';
      await swalError('Could not update', msg);
    }
  };

  const visibleEvaluations = useMemo(() => {
    if (statusFilter === 'all') return evaluations;
    return evaluations.filter((ev) => {
      const s = (ev.status || 'pending').toLowerCase();
      return s === statusFilter.toLowerCase();
    });
  }, [evaluations, statusFilter]);

  const isCreditEvalActive = (record) => record?.is_active !== false;

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
        delete data.status;
        if (editingItem) {
          await api.put(`/credit-evaluations/${editingItem.credit_eval_id}`, data);
        } else {
          data.status = 'pending';
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

  /** When external subject changes, apply saved Subject Equivalence (local subject, units, basis). */
  const handleOtherSubjectChange = (index, rawValue) => {
    const otherId = rawValue === '' || rawValue == null ? '' : String(rawValue);
    const newDetails = formData.credit_details.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, other_subject_id: otherId };
      if (!otherId) {
        next.subject_id = '';
        return next;
      }
      const active = getActiveEquivalencesForOtherId(otherId);
      if (active.length >= 1) {
        const eq = active[0];
        next.subject_id = getEquivalenceSubjectId(eq);
        next.credited_units = eq.credited_units != null && eq.credited_units !== '' ? eq.credited_units : '';
        next.credit_basis = eq.credit_basis || '';
      } else {
        next.subject_id = '';
      }
      return next;
    });
    setFormData({ ...formData, credit_details: newDetails });
  };

  const getEquivalentSubjectOptions = (detail) => {
    const oid = detail.other_subject_id;
    let opts;
    if (!oid) {
      opts = lookupData.subjects;
    } else {
      const active = getActiveEquivalencesForOtherId(oid);
      if (active.length === 0) {
        opts = lookupData.subjects;
      } else {
        const allowed = new Set(active.map((e) => getEquivalenceSubjectId(e)).filter(Boolean));
        const filtered = lookupData.subjects.filter((s) => allowed.has(String(s.subject_id)));
        opts = filtered.length > 0 ? filtered : lookupData.subjects;
      }
    }
    const sid = detail.subject_id;
    if (!sid || opts.some((s) => String(s.subject_id) === String(sid))) return opts;
    const extra = lookupData.subjects.find((s) => String(s.subject_id) === String(sid));
    return extra ? [...opts, extra] : opts;
  };

  const hasEquivalenceForOther = (detail) => {
    const oid = detail.other_subject_id;
    if (!oid) return false;
    return getActiveEquivalencesForOtherId(oid).length > 0;
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

      {approvalMode && (
        <div className="credit-eval-filters" role="tablist" aria-label="Filter by status">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={statusFilter === f}
              className={`credit-eval-filter-chip ${statusFilter === f ? 'active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

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
            {visibleEvaluations.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">No credit evaluations found</td>
              </tr>
            ) : (
              visibleEvaluations.map((evaluation) => {
                const st = (evaluation.status || 'pending').toLowerCase();
                const rowActive = isCreditEvalActive(evaluation);
                return (
                  <tr
                    key={evaluation.credit_eval_id}
                    className={!rowActive ? 'credit-eval-row-inactive' : undefined}
                  >
                    <td>
                      {evaluation.student?.first_name || evaluation.student?.full_name || '-'}
                      {evaluation.student?.last_name ? ` ${evaluation.student.last_name}` : ''}
                      {evaluation.student?.student_number ? ` (${evaluation.student.student_number})` : ''}
                    </td>
                    <td>{evaluation.school?.school_name || '-'}</td>
                    <td>{evaluation.credit_type || '-'}</td>
                    <td>{evaluation.evaluation_date || '-'}</td>
                    <td className="credit-eval-status-cell">
                      <div className="credit-eval-status-inline">
                        <span className={`status-badge status-${st}`}>
                          {evaluation.status || 'Pending'}
                        </span>
                        {!rowActive && (
                          <span
                            className="status-badge status-record-inactive"
                            title="Deactivated — not applied to transfer credits"
                          >
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{evaluation.evaluator?.email || evaluation.evaluator?.Email || '-'}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="view-button"
                        onClick={() => {
                          setSelectedEvaluation(evaluation);
                          setShowDetailsModal(true);
                        }}
                      >
                        View Details
                      </button>
                      {(!approvalMode || canApprove) && (
                        <button type="button" className="edit-button" onClick={() => handleEdit(evaluation)}>
                          {approvalMode ? 'Update status' : 'Edit'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
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
                <label>Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Credit Details <span className="required">*</span></label>
                <p className="credit-equiv-hint">
                  Pick the external course first. If a row exists in <strong>Subject Equivalences</strong>, the local
                  subject, units, and basis are filled automatically; the local subject list shows only mapped courses.
                </p>
                {formData.credit_details.map((detail, index) => (
                  <div key={index} className="credit-detail-row">
                    <div className="detail-fields">
                      <select
                        value={detail.other_subject_id}
                        onChange={(e) => handleOtherSubjectChange(index, e.target.value)}
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
                        aria-label="Equivalent local subject"
                      >
                        <option value="">Select Equivalent Subject</option>
                        {getEquivalentSubjectOptions(detail).map((subj) => (
                          <option key={subj.subject_id} value={subj.subject_id}>
                            {subj.subject_code} - {subj.subject_name}
                          </option>
                        ))}
                      </select>
                      {detail.other_subject_id && !hasEquivalenceForOther(detail) && (
                        <span className="credit-equiv-warning">No active equivalence for this external subject — choose a local subject manually or add one in Subject Equivalences.</span>
                      )}
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
                <h4>Credit Details ({getCreditDetailsList(selectedEvaluation).length})</h4>
                <div className="detail-row credit-detail-status-row">
                  <strong>Status:</strong>
                  <span className={`status-badge status-${(selectedEvaluation.status || 'pending')?.toLowerCase()}`}>
                    {selectedEvaluation.status || 'Pending'}
                  </span>
                  {selectedEvaluation.is_active === false && (
                    <span className="status-badge status-record-inactive">Inactive</span>
                  )}
                </div>
                {selectedEvaluation.is_active === false && (
                  <p className="credit-eval-inactive-notice">
                    This evaluation is <strong>inactive</strong> and does not apply toward transfer credits on the student record.
                  </p>
                )}
                {getCreditDetailsList(selectedEvaluation).length > 0 ? (
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
                      {getCreditDetailsList(selectedEvaluation).map((detail, index) => (
                        <tr key={detail.credit_detail_id || index}>
                          <td>{formatDetailOtherSchoolSubject(detail, lookupData.otherSchoolSubjects)}</td>
                          <td>{formatDetailEquivalentSubject(detail, lookupData.subjects)}</td>
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
            <div className="modal-footer credit-details-modal-footer">
              {(selectedEvaluation.status || 'pending').toLowerCase() === 'pending' &&
                canApprove &&
                (approvalMode || isAdmin) && (
                  <>
                    <button
                      type="button"
                      className="approve-quick-btn"
                      onClick={() =>
                        quickSetStatus(selectedEvaluation, 'approved', {
                          onSuccess: () => setShowDetailsModal(false),
                        })
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="reject-quick-btn"
                      onClick={() =>
                        quickSetStatus(selectedEvaluation, 'rejected', {
                          onSuccess: () => setShowDetailsModal(false),
                        })
                      }
                    >
                      Reject
                    </button>
                  </>
                )}
              <button
                type="button"
                className="modal-footer-close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditEvaluationManagement;

