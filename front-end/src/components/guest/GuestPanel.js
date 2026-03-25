import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { swalError } from '../../utils/swal';
import './GuestPanel.css';

/**
 * Read-only curriculum catalog for Guest role (sign in required).
 */
const GuestPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [programFilter, setProgramFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [curRes, lookRes] = await Promise.all([
          api.get('/curriculum'),
          api.get('/curriculum/lookup/data'),
        ]);
        setCurriculum(Array.isArray(curRes.data) ? curRes.data : []);
        const p = lookRes.data?.programs || [];
        setPrograms(p);
        if (p.length === 1) setProgramFilter(String(p[0].program_id));
      } catch (e) {
        const msg = e.response?.data?.message || 'Could not load curriculum.';
        setError(msg);
        setCurriculum([]);
        await swalError('Could not load data', msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filtered = programFilter
    ? curriculum.filter((c) => String(c.program_id) === String(programFilter))
    : curriculum;

  return (
    <div className="guest-panel">
      <header className="guest-header">
        <div>
          <h1>Guest — Curriculum catalog</h1>
          <p className="guest-sub">
            Browse published curriculum (read-only). Sign in as a student or staff for full features.
          </p>
        </div>
        <div className="guest-header-actions">
          <span>{user?.email}</span>
          <button type="button" className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {loading ? (
        <p className="guest-loading">Loading…</p>
      ) : (
        <>
          {error && <div className="guest-error">{error}</div>}
          <div className="guest-toolbar">
            <label htmlFor="guest-program">Program</label>
            <select
              id="guest-program"
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
            >
              <option value="">All programs</option>
              {programs.map((p) => (
                <option key={p.program_id} value={p.program_id}>
                  {p.program_name} ({p.program_code})
                </option>
              ))}
            </select>
          </div>
          <div className="guest-table-wrap">
            <table className="guest-table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Year</th>
                  <th>Semester</th>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6">No rows for this filter.</td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.curriculum_id}>
                      <td>{row.program?.program_name || row.program_id || '—'}</td>
                      <td>{row.yearLevel?.year_level || row.year_level || '—'}</td>
                      <td>{row.semester?.semester_name || row.semester_id || '—'}</td>
                      <td>
                        {row.subject?.subject_code ||
                          (row.elective_slot_id ? `Elective slot #${row.elective_slot_id}` : '—')}
                      </td>
                      <td>{row.subject?.subject_name || '—'}</td>
                      <td>{row.subject_type || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default GuestPanel;
