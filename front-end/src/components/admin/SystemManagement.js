import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { swalConfirm, swalToast, swalError } from '../../utils/swal';
import SearchableSelect from '../common/SearchableSelect';
import './SystemManagement.css';
import CreditEvaluationManagement from './CreditEvaluationManagement';

/** Laravel JSON uses snake_case for relations: `other_school_subject` not `otherSchoolSubject`. */
function formatOtherSchoolSubjectLabel(item, lookupList = []) {
  const rel = item.otherSchoolSubject ?? item.other_school_subject;
  if (rel && typeof rel === 'object' && !Array.isArray(rel)) {
    const code = rel.subject_code;
    const name = rel.subject_name;
    if (code != null || name != null) {
      return `${code ?? '—'} — ${name ?? '—'}`;
    }
  }
  const oid = item.other_school_subject;
  if (oid != null && oid !== '' && Array.isArray(lookupList) && lookupList.length > 0) {
    const found = lookupList.find((s) => String(s.other_subject_id) === String(oid));
    if (found) {
      return `${found.subject_code ?? '—'} — ${found.subject_name ?? '—'}`;
    }
  }
  return '—';
}

function getEquivalenceOtherSchoolSubjectId(item) {
  const raw = item?.other_school_subject ?? item?.otherSchoolSubject;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw.other_subject_id != null ? raw.other_subject_id : null;
  }
  return raw;
}

function isSubjectEquivalenceActive(item) {
  const s = item?.status;
  if (s == null || s === '') return true;
  return String(s).toLowerCase() === 'active';
}

function emptyOtherSchoolSubjectRow() {
  return {
    subject_code: '',
    subject_name: '',
    units: '',
    hours: '',
    description: '',
  };
}

const SystemManagement = () => {
  const [activeTab, setActiveTab] = useState('schools');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [ossBulkSchoolId, setOssBulkSchoolId] = useState('');
  const [ossBulkRows, setOssBulkRows] = useState([emptyOtherSchoolSubjectRow()]);
  const [ossBulkSubmitting, setOssBulkSubmitting] = useState(false);
  const [data, setData] = useState({
    schools: [],
    otherSchoolSubjects: [],
    subjectEquivalences: [],
  });
  const [lookupData, setLookupData] = useState({
    schools: [],
    subjects: [],
    otherSchoolSubjects: [],
  });

  useEffect(() => {
    if (activeTab === 'credit-evaluation') return; // Credit evaluation has its own component/state
    fetchLookupData();
    fetchData();
  }, [activeTab]);

  const fetchLookupData = async () => {
    try {
      const [schoolsResp, subjectsResp, ossResp] = await Promise.allSettled([
        api.get('/schools'),
        api.get('/lookup/subjects'),
        api.get('/other-school-subjects'),
      ]);

      setLookupData({
        schools: schoolsResp.status === 'fulfilled' ? (schoolsResp.value.data || []) : [],
        subjects: subjectsResp.status === 'fulfilled' ? (subjectsResp.value.data || []) : [],
        otherSchoolSubjects: ossResp.status === 'fulfilled' ? (ossResp.value.data || []) : [],
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

  const handleToggleSubjectEquivalenceStatus = async (item) => {
    const active = isSubjectEquivalenceActive(item);
    const ok = await swalConfirm({
      title: active ? 'Deactivate this subject equivalence?' : 'Activate this subject equivalence?',
      text: active
        ? 'It will not be used for automatic credit-evaluation mapping until reactivated.'
        : 'This mapping will be available again for credit evaluation.',
      confirmButtonText: active ? 'Deactivate' : 'Activate',
    });
    if (!ok) return;

    const otherId = getEquivalenceOtherSchoolSubjectId(item);
    const subjectId = item.subject_id ?? item.subject?.subject_id;
    if (otherId == null || subjectId == null) {
      await swalError('Cannot update', 'Missing subject data for this row. Open Edit to fix it.');
      return;
    }

    try {
      await api.put(`/subject-equivalences/${item.equivalence_id}`, {
        other_school_subject: Number(otherId),
        subject_id: Number(subjectId),
        credited_units: item.credited_units != null && item.credited_units !== '' ? Number(item.credited_units) : null,
        credit_basis: item.credit_basis ?? null,
        remarks: item.remarks ?? null,
        status: active ? 'inactive' : 'active',
      });
      await fetchData();
      swalToast('success', active ? 'Subject equivalence deactivated' : 'Subject equivalence activated');
    } catch (err) {
      const msg = err.response?.data?.message || 'Update failed';
      setError(msg);
      await swalError('Update failed', msg);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setOssBulkSchoolId('');
    setOssBulkRows([emptyOtherSchoolSubjectRow()]);
  };

  const updateOssBulkRow = (index, field, value) => {
    setOssBulkRows((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeOssBulkRow = (index) => {
    setOssBulkRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData(getDefaultFormData());
    if (activeTab === 'other-school-subjects') {
      setOssBulkSchoolId('');
      setOssBulkRows([emptyOtherSchoolSubjectRow()]);
    }
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    if (activeTab === 'other-school-subjects') {
      setOssBulkSchoolId('');
      setOssBulkRows([emptyOtherSchoolSubjectRow()]);
    }
    if (activeTab === 'subject-equivalences') {
      let oss = item.other_school_subject;
      if (oss && typeof oss === 'object') {
        oss = oss.other_subject_id ?? '';
      }
      setFormData({ ...item, other_school_subject: oss });
    } else {
      setFormData(item);
    }
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

    if (activeTab === 'other-school-subjects' && !editingItem) {
      if (ossBulkSubmitting) return;
      const schoolId = ossBulkSchoolId ? Number(ossBulkSchoolId) : NaN;
      if (!Number.isInteger(schoolId) || schoolId < 1) {
        await swalError('School required', 'Please select a school.');
        return;
      }

      const numOrNull = (v) => {
        if (v === '' || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const normalized = ossBulkRows.map((r) => {
        const code = (r.subject_code || '').trim();
        const name = (r.subject_name || '').trim();
        return {
          code,
          name,
          units: numOrNull(r.units),
          hours: numOrNull(r.hours),
          description: (r.description || '').trim() || null,
        };
      });

      for (const r of normalized) {
        const hasAny =
          r.code ||
          r.name ||
          r.units != null ||
          r.hours != null ||
          (r.description != null && r.description !== '');
        const complete = r.code && r.name;
        if (hasAny && !complete) {
          await swalError(
            'Incomplete row',
            'Each row that has any data must include both Subject Code and Subject Name. Clear extra rows or fill them in.'
          );
          return;
        }
      }

      const toSave = normalized.filter((r) => r.code && r.name);
      if (toSave.length === 0) {
        await swalError('Add at least one subject', 'Enter Subject Code and Subject Name in at least one row.');
        return;
      }

      setOssBulkSubmitting(true);
      try {
        const results = await Promise.allSettled(
          toSave.map((r) =>
            api.post('/other-school-subjects', {
              school_id: schoolId,
              subject_code: r.code,
              subject_name: r.name,
              units: r.units,
              hours: r.hours,
              description: r.description,
            })
          )
        );

        const failed = results
          .map((res, i) => ({ res, row: toSave[i] }))
          .filter(({ res }) => res.status === 'rejected');

        closeModal();
        await fetchData();
        fetchLookupData();

        if (failed.length === 0) {
          swalToast('success', `Saved ${toSave.length} subject${toSave.length === 1 ? '' : 's'}`);
        } else {
          const ok = toSave.length - failed.length;
          const lines = failed.slice(0, 5).map(({ row, res }) => {
            const msg =
              res.reason?.response?.data?.message ||
              res.reason?.message ||
              'Request failed';
            return `${row.code}: ${msg}`;
          });
          const more = failed.length > 5 ? `\n… and ${failed.length - 5} more` : '';
          await swalError(
            'Some subjects could not be saved',
            `${ok} saved, ${failed.length} failed.\n\n${lines.join('\n')}${more}`
          );
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Save failed';
        setError(msg);
        await swalError('Save failed', msg);
      } finally {
        setOssBulkSubmitting(false);
      }
      return;
    }

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

      closeModal();
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
      'credit-evaluation': 'Credit Evaluation',
      'permissions': 'Permission',
      'audit-logs': 'Audit Log',
    };
    return titles[activeTab] || '';
  };

  const schoolSelectOptions = useMemo(
    () =>
      (lookupData.schools || []).map((school) => ({
        value: String(school.school_id),
        label: school.school_name || `School ${school.school_id}`,
      })),
    [lookupData.schools],
  );

  const subjectEquivalenceOssOptions = useMemo(
    () =>
      (lookupData.otherSchoolSubjects || []).map((subj) => ({
        value: String(subj.other_subject_id),
        label: `${subj.subject_code} - ${subj.subject_name}`,
      })),
    [lookupData.otherSchoolSubjects],
  );

  const subjectEquivalenceLocalOptions = useMemo(
    () =>
      (lookupData.subjects || []).map((subj) => ({
        value: String(subj.subject_id),
        label: `${subj.subject_code} - ${subj.subject_name}`,
      })),
    [lookupData.subjects],
  );

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
        if (editingItem) {
          return (
            <>
              <div className="form-group">
                <label htmlFor="sm-oss-edit-school">School <span className="required">*</span></label>
                <SearchableSelect
                  id="sm-oss-edit-school"
                  value={formData.school_id === '' || formData.school_id == null ? '' : String(formData.school_id)}
                  onChange={(v) =>
                    setFormData({ ...formData, school_id: v ? parseInt(v, 10) : '' })
                  }
                  options={schoolSelectOptions}
                  emptyLabel="Select School"
                  placeholder="Search school…"
                  required
                  aria-label="School"
                />
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
        }
        return (
          <>
            <p className="oss-bulk-hint">
              Choose one school, then add as many subjects as you need. Blank rows are ignored. Each filled row is saved as its own record.
            </p>
            <div className="form-group">
              <label htmlFor="sm-oss-bulk-school">School <span className="required">*</span></label>
              <SearchableSelect
                id="sm-oss-bulk-school"
                value={ossBulkSchoolId}
                onChange={(v) => setOssBulkSchoolId(v)}
                options={schoolSelectOptions}
                emptyLabel="Select School"
                placeholder="Search school…"
                required
                aria-label="School for bulk add"
              />
            </div>
            <div className="oss-bulk-table-wrap">
              <table className="oss-bulk-table">
                <thead>
                  <tr>
                    <th>Subject code <span className="required">*</span></th>
                    <th>Subject name <span className="required">*</span></th>
                    <th>Units</th>
                    <th>Hours</th>
                    <th>Description</th>
                    <th aria-label="Remove row" />
                  </tr>
                </thead>
                <tbody>
                  {ossBulkRows.map((row, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          value={row.subject_code}
                          onChange={(e) => updateOssBulkRow(index, 'subject_code', e.target.value)}
                          placeholder="e.g. MATH101"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.subject_name}
                          onChange={(e) => updateOssBulkRow(index, 'subject_name', e.target.value)}
                          placeholder="Course title"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.units}
                          onChange={(e) => updateOssBulkRow(index, 'units', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.hours}
                          onChange={(e) => updateOssBulkRow(index, 'hours', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => updateOssBulkRow(index, 'description', e.target.value)}
                          placeholder="Optional"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="oss-bulk-remove"
                          onClick={() => removeOssBulkRow(index)}
                          disabled={ossBulkRows.length <= 1}
                          title="Remove row"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="oss-bulk-add-row"
              onClick={() => setOssBulkRows((rows) => [...rows, emptyOtherSchoolSubjectRow()])}
            >
              + Add row
            </button>
          </>
        );
      case 'subject-equivalences':
        return (
          <>
            <div className="form-group">
              <label htmlFor="sm-subj-equiv-oss">Other School Subject <span className="required">*</span></label>
              <SearchableSelect
                id="sm-subj-equiv-oss"
                value={
                  formData.other_school_subject === '' || formData.other_school_subject == null
                    ? ''
                    : String(formData.other_school_subject)
                }
                onChange={(v) =>
                  setFormData({
                    ...formData,
                    other_school_subject: v ? parseInt(v, 10) : '',
                  })
                }
                options={subjectEquivalenceOssOptions}
                emptyLabel="Select Other School Subject"
                placeholder="Search external subject…"
                required
                aria-label="Other school subject"
              />
            </div>
            <div className="form-group">
              <label htmlFor="sm-subj-equiv-local">Equivalent Subject <span className="required">*</span></label>
              <SearchableSelect
                id="sm-subj-equiv-local"
                value={formData.subject_id === '' || formData.subject_id == null ? '' : String(formData.subject_id)}
                onChange={(v) =>
                  setFormData({ ...formData, subject_id: v ? parseInt(v, 10) : '' })
                }
                options={subjectEquivalenceLocalOptions}
                emptyLabel="Select Subject"
                placeholder="Search local subject…"
                required
                aria-label="Equivalent local subject"
              />
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
                currentData.map((item) => {
                  const eqActive = isSubjectEquivalenceActive(item);
                  return (
                    <tr key={item.equivalence_id} className={!eqActive ? 'subject-equiv-row-inactive' : undefined}>
                      <td>{formatOtherSchoolSubjectLabel(item, lookupData.otherSchoolSubjects)}</td>
                      <td>
                        {item.subject
                          ? `${item.subject.subject_code ?? '—'} — ${item.subject.subject_name ?? '—'}`
                          : '—'}
                      </td>
                      <td>{item.credited_units || '-'}</td>
                      <td>{item.credit_basis || '-'}</td>
                      <td>
                        <span
                          className={`status-badge status-${(item.status || 'active').toLowerCase()}`}
                        >
                          {item.status || 'Active'}
                        </span>
                      </td>
                      <td className="actions">
                        <button type="button" className="edit-button" onClick={() => handleEdit(item)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={eqActive ? 'toggle-equiv-btn deactivate' : 'toggle-equiv-btn activate'}
                          onClick={() => handleToggleSubjectEquivalenceStatus(item)}
                        >
                          {eqActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
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
        <h2>Academic Management</h2>
        {activeTab !== 'credit-evaluation' && (
          <button className="add-button" onClick={handleAdd}>
            Add {getTabTitle()}
          </button>
        )}
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
          className={activeTab === 'credit-evaluation' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('credit-evaluation')}
        >
          Credit Evaluation
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

      {activeTab === 'credit-evaluation' ? (
        <div className="table-container">
          <CreditEvaluationManagement />
        </div>
      ) : loading ? (
        <div className="loading">Loading {getTabTitle()}...</div>
      ) : (
        <div className="table-container">
          {renderTable()}
        </div>
      )}

      {activeTab !== 'credit-evaluation' && showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={
              activeTab === 'other-school-subjects' && !editingItem
                ? 'modal-content modal-content--wide'
                : 'modal-content'
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                {editingItem
                  ? `Edit ${getTabTitle()}`
                  : activeTab === 'other-school-subjects'
                    ? 'Add Other School Subjects'
                    : `Add ${getTabTitle()}`}
              </h3>
              <button type="button" className="close-button" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              {error && <div className="error-message">{error}</div>}
              {renderForm()}
              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={activeTab === 'other-school-subjects' && !editingItem && ossBulkSubmitting}
                >
                  {editingItem
                    ? 'Update'
                    : activeTab === 'other-school-subjects'
                      ? ossBulkSubmitting
                        ? 'Saving…'
                        : 'Save all subjects'
                      : 'Create'}
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

