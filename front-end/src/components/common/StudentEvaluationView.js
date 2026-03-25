import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { swalToast, swalError } from '../../utils/swal';
import './StudentEvaluationView.css';

const StudentEvaluationView = () => {
  const { user, isAdmin, isDean, isFaculty } = useAuth();
  const canEdit = !!(isAdmin || isDean || isFaculty);

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const statusOptions = useMemo(
    () => ['passed', 'failed', 'ongoing', 'dropped', 'incomplete'],
    []
  );

  // Draft grade/status per row (keyed by evaluation_id when present, else a composite key)
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [saveError, setSaveError] = useState('');

  const getRowKey = (row) =>
    row.evaluation_id
      ? `eval-${row.evaluation_id}`
      : `new-${row.subject_id}-${row.academic_year_id}-${row.semester_id}`;

  // Fetch student list
  const fetchStudentList = async (search = '') => {
    setLoadingList(true);
    try {
      const response = await api.get('/evaluation/students', {
        params: { search }
      });
      setStudents(response.data.students || []);
    } catch (err) {
      console.error('Error fetching student list:', err);
      setStudents([]);
    } finally {
      setLoadingList(false);
    }
  };

  // Load student list on component mount and when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudentList(searchTerm);
    }, searchTerm ? 300 : 0); // No delay for initial load
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Initialize drafts when student evaluation data changes
  useEffect(() => {
    if (!data?.rows) return;

    const next = {};
    data.rows.forEach((row) => {
      const key = getRowKey(row);
      next[key] = {
        grade: row.grade ?? '',
        status: row.status ?? '',
      };
    });
    setDrafts(next);
    setSaveError('');
  }, [data]);

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle student selection from list
  const handleStudentSelect = async (student) => {
    setSelectedStudent(student);
    setError('');
    setLoading(true);

    try {
      const response = await api.get(`/evaluation/student/${encodeURIComponent(student.student_id_number)}`);
      setData(response.data);
    } catch (err) {
      console.error('Error fetching student evaluation:', err);
      setData(null);
      const msg = err.response?.data?.message || 'Failed to load student evaluation';
      setError(msg);
      await swalError('Could not load evaluation', msg);
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (row, patch) => {
    const key = getRowKey(row);
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { grade: '', status: '' }),
        ...patch,
      },
    }));
  };

  const handleSaveRow = async (row) => {
    if (!canEdit) return;
    if (!selectedStudent || !data?.student?.student_id) return;

    const key = getRowKey(row);
    const draft = drafts[key] || { grade: '', status: '' };

    const gradeValue = draft.grade === '' ? null : draft.grade;
    const evaluation_status = draft.status === '' ? null : draft.status;

    setSavingKey(key);
    setSaveError('');
    try {
      if (row.evaluation_id) {
        await api.put(`/evaluation/${row.evaluation_id}`, {
          grade: gradeValue,
          evaluation_status,
        });
      } else {
        // Create a new evaluation record for this subject in this academic year/semester
        await api.post('/evaluation', {
          student_id: data.student.student_id,
          subject_id: row.subject_id,
          academic_year_id: row.academic_year_id,
          semester_id: row.semester_id,
          grade: gradeValue,
          evaluation_status,
        });
      }

      // Refresh after save so units earned & status show updated values
      await handleStudentSelect(selectedStudent);
      swalToast('success', 'Evaluation saved');
    } catch (err) {
      console.error('Error saving evaluation row:', err);
      const msg = err.response?.data?.message || 'Failed to save evaluation';
      setSaveError(msg);
      await swalError('Save failed', msg);
    } finally {
      setSavingKey(null);
    }
  };

  const renderSummary = () => {
    if (!data) return null;

    const { student, summary } = data;
    const fullName =
      student?.full_name ||
      `${student?.last_name || ''}, ${student?.first_name || ''} ${student?.middle_name || ''}`.trim();

    return (
      <div className="eval-summary">
        <div className="eval-summary-row">
          <div>
            <strong>Student:</strong> {fullName || 'N/A'}
          </div>
          <div>
            <strong>ID Number:</strong> {student?.student_id_number || 'N/A'}
          </div>
          <div>
            <strong>Program:</strong> {student?.program?.program_name || 'N/A'}
          </div>
          <div>
            <strong>Academic Status:</strong> {student?.academic_status || 'N/A'}
          </div>
        </div>
        <div className="eval-summary-row">
          <div>
            <strong>Total Curriculum Units:</strong> {summary?.total_units_in_curriculum ?? 0}
          </div>
          <div>
            <strong>Units Earned:</strong> {summary?.total_units_earned ?? 0}
          </div>
          <div>
            <strong>Lacking Units:</strong>{' '}
            <span className={summary?.lacking_units > 0 ? 'eval-lacking' : 'eval-ok'}>
              {summary?.lacking_units ?? 0}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data || !data.rows || data.rows.length === 0) {
      return (
        <div className="empty-state">
          No curriculum rows found for this student. Make sure the student has an assigned program and curriculum.
        </div>
      );
    }

    // Group rows by year level & semester similar to the spreadsheet layout
    const groups = {};
    data.rows.forEach((row) => {
      const key = `${row.year_level_name || 'Unknown'} - ${row.semester_name || 'Unknown'}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    });

    return (
      <div className="eval-table-container">
        {Object.entries(groups).map(([groupKey, rows]) => (
          <div key={groupKey} className="eval-term-block">
            <div className="eval-term-header">{groupKey}</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>PEN CODE</th>
                  <th>Courses / Subjects</th>
                  <th>No. of Units</th>
                  <th>Units Earned</th>
                  <th>Grade</th>
                  <th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={getRowKey(row)}>
                    <td>{row.subject_code || 'N/A'}</td>
                    <td>{row.subject_name || 'N/A'}</td>
                    <td>{row.units ?? 0}</td>
                    <td>{row.units_earned ?? 0}</td>
                    <td>
                      {canEdit ? (
                        <input
                          type="text"
                          className="eval-grade-input"
                          value={drafts[getRowKey(row)]?.grade ?? ''}
                          onChange={(e) => updateDraft(row, { grade: e.target.value })}
                          placeholder="Grade"
                          disabled={savingKey === getRowKey(row)}
                        />
                      ) : (
                        row.grade ?? ''
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <select
                          className="eval-status-select"
                          value={drafts[getRowKey(row)]?.status ?? ''}
                          onChange={(e) => updateDraft(row, { status: e.target.value })}
                          disabled={savingKey === getRowKey(row)}
                        >
                          <option value="">—</option>
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        row.status ?? ''
                      )}
                    </td>
                    {canEdit && (
                      <td>
                        <button
                          type="button"
                          className="eval-save-button"
                          onClick={() => handleSaveRow(row)}
                          disabled={savingKey === getRowKey(row)}
                        >
                          Save
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="student-eval-section">
      <div className="section-header">
        <h2>Student Evaluation</h2>
      </div>

      <div className="eval-container">
        {/* Student List Panel */}
        <div className="eval-list-panel">
          <div className="eval-list-header">
            <h3>Students</h3>
            <input
              type="text"
              className="eval-list-search"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={handleSearchInputChange}
            />
          </div>
          
          {loadingList ? (
            <div className="loading-message">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="empty-state">No students found</div>
          ) : (
            <div className="eval-student-list">
              <table className="eval-student-list-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Program</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.student_id}
                      className={selectedStudent?.student_id === student.student_id ? 'active' : ''}
                      onClick={() => handleStudentSelect(student)}
                    >
                      <td>{student.full_name}</td>
                      <td>{student.student_id_number || 'N/A'}</td>
                      <td>{student.program_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Evaluation Details Panel */}
        <div className="eval-details-panel">
          {error && <div className="error-message">{error}</div>}

          {loading && <div className="loading-message">Loading evaluation...</div>}

          {canEdit && saveError && <div className="error-message">{saveError}</div>}

          {!loading && renderSummary()}
          {!loading && renderTable()}
        </div>
      </div>
    </div>
  );
};

export default StudentEvaluationView;


