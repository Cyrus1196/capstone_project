import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { swalError } from '../../utils/swal';
import './StudentAcademicEvaluation.css';

/**
 * Student-facing academic record: progress vs curriculum (same data faculty uses, scoped to self).
 */
const StudentAcademicEvaluation = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const prof = await api.get('/students/profile');
        const idNum =
          prof.data?.student_id_number ||
          prof.data?.student_number ||
          prof.data?.Student_Id_Number;
        if (!idNum) {
          throw new Error('Your profile has no student ID number.');
        }
        const res = await api.get(`/evaluation/student/${encodeURIComponent(String(idNum))}`);
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) {
          const msg = e.response?.data?.message || e.message || 'Failed to load evaluation';
          setError(msg);
          setData(null);
          await swalError('Could not load evaluation', msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w || !printRef.current) return;
    w.document.write(
      `<html><head><title>Academic evaluation</title></head><body>${printRef.current.innerHTML}</body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  if (loading) {
    return <div className="stu-eval-loading">Loading your academic record…</div>;
  }

  if (error) {
    return <div className="stu-eval-error">{error}</div>;
  }

  const student = data?.student;
  const summary = data?.summary || {};
  const rows = data?.rows || [];
  const name =
    student?.full_name ||
    [student?.last_name, student?.first_name].filter(Boolean).join(', ') ||
    '—';

  return (
    <div className="stu-academic-eval">
      <div className="stu-eval-toolbar">
        <h2>Academic evaluation</h2>
        <button type="button" className="stu-eval-print" onClick={handlePrint}>
          Print / Save as PDF
        </button>
      </div>
      <p className="stu-eval-hint">
        Subjects taken, grades, and progress against your program curriculum. Use this for advising or
        graduation checking.
      </p>

      <div ref={printRef} className="stu-eval-print-area">
        <div className="stu-eval-header-block">
          <div>
            <strong>Student:</strong> {name}
          </div>
          <div>
            <strong>ID:</strong> {student?.student_id_number || student?.student_number || '—'}
          </div>
          <div>
            <strong>Program:</strong> {student?.program?.program_name || '—'}
          </div>
        </div>
        <div className="stu-eval-summary-grid">
          <div>
            Curriculum units: <strong>{summary.total_units_in_curriculum ?? '—'}</strong>
          </div>
          <div>
            Earned units: <strong>{summary.total_units_earned ?? '—'}</strong>
          </div>
          <div>
            Remaining (units): <strong>{summary.lacking_units ?? '—'}</strong>
          </div>
        </div>

        <table className="stu-eval-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Semester</th>
              <th>Code</th>
              <th>Subject</th>
              <th>Units</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="7">No curriculum rows loaded.</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.year_level_name || r.year_level_id || '—'}</td>
                  <td>{r.semester_name || r.semester_id || '—'}</td>
                  <td>{r.subject_code || '—'}</td>
                  <td>{r.subject_name || '—'}</td>
                  <td>{r.units ?? '—'}</td>
                  <td>{r.grade ?? '—'}</td>
                  <td>{r.status || (r.units_earned > 0 ? 'Completed' : '—')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentAcademicEvaluation;
