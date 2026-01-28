import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import './StudentEvaluationView.css';

const StudentEvaluationView = () => {
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

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
      setError(err.response?.data?.message || 'Failed to load student evaluation');
    } finally {
      setLoading(false);
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
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Units Earned</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.subject_id}>
                    <td>{row.subject_code || 'N/A'}</td>
                    <td>{row.subject_name || 'N/A'}</td>
                    <td>{row.units ?? 0}</td>
                    <td>{row.grade ?? ''}</td>
                    <td>{row.status ?? ''}</td>
                    <td>{row.units_earned ?? 0}</td>
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
              {students.map((student) => (
                <div
                  key={student.student_id}
                  className={`eval-student-item ${selectedStudent?.student_id === student.student_id ? 'active' : ''}`}
                  onClick={() => handleStudentSelect(student)}
                >
                  <div className="eval-student-name">{student.full_name}</div>
                  <div className="eval-student-id">{student.student_id_number}</div>
                  <div className="eval-student-program">{student.program_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evaluation Details Panel */}
        <div className="eval-details-panel">
          {error && <div className="error-message">{error}</div>}

          {loading && <div className="loading-message">Loading evaluation...</div>}

          {!loading && renderSummary()}
          {!loading && renderTable()}
        </div>
      </div>
    </div>
  );
};

export default StudentEvaluationView;


