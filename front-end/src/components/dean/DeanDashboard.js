import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Icon from '../layout/Icon';

/**
 * Landing screen for the dean portal — summarises the department from
 * endpoints that already exist (/departments, /evaluation/students,
 * /curriculum).
 */

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const DeanDashboard = ({ deanProfile, onNavigate }) => {
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [deptRes, studentRes, curriculumRes] = await Promise.allSettled([
        api.get('/departments', { silent: true }),
        api.get('/evaluation/students', { silent: true }),
        api.get('/curriculum', { silent: true }),
      ]);

      if (cancelled) return;

      if (deptRes.status === 'fulfilled') {
        const data = deptRes.value.data;
        setDepartments(data.departments || data || []);
      }
      if (studentRes.status === 'fulfilled') {
        const data = studentRes.value.data;
        setStudents(data.students || data || []);
      }
      if (curriculumRes.status === 'fulfilled') {
        const data = curriculumRes.value.data;
        setCurriculum(data.curriculum || data || []);
      }

      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="loading">Loading your dashboard...</div>;
  }

  const deanName = [deanProfile?.first_name, deanProfile?.last_name]
    .filter(Boolean)
    .join(' ');

  const departmentName =
    deanProfile?.department?.department_name || deanProfile?.department_name || 'Not assigned';

  const evaluated = students.filter((row) => {
    const status = (row.evaluation_status || row.status || '').toLowerCase();
    return status === 'completed' || status === 'evaluated' || status === 'passed';
  }).length;

  const evaluatedPercent = students.length
    ? Math.round((evaluated / students.length) * 100)
    : 0;

  return (
    <div className="dean-dashboard">
      <section className="welcome-banner">
        <div className="welcome-text">
          <h2 className="welcome-greeting">
            {greeting()}
            {deanProfile?.first_name ? `, Dean ${deanProfile.last_name || deanProfile.first_name}` : ''}!
          </h2>
          <p className="welcome-sub">
            Curriculum, department and evaluation activity in one place.
          </p>
        </div>

        <div className="welcome-meta">
          <div className="welcome-meta-item">
            <span className="welcome-meta-label">Department</span>
            <span className="welcome-meta-value">{departmentName}</span>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Departments</span>
          <span className="stat-value">{departments.length}</span>
          <span className="stat-meta">Under the college</span>
        </article>

        <article className="stat-card is-info">
          <span className="stat-label">Students</span>
          <span className="stat-value">{students.length}</span>
          <span className="stat-meta">In the evaluation list</span>
        </article>

        <article className="stat-card is-success">
          <span className="stat-label">Evaluated</span>
          <span className="stat-value">{evaluated}</span>
          <span className="stat-meta">{evaluatedPercent}% of students</span>
        </article>

        <article className="stat-card is-warning">
          <span className="stat-label">Curriculum Entries</span>
          <span className="stat-value">{curriculum.length}</span>
          <span className="stat-meta">Subjects mapped</span>
        </article>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col">
          <section className="panel">
            <div className="panel-head">
              <h3>Departments</h3>
              <button
                type="button"
                className="btn btn-link"
                onClick={() => onNavigate('departments')}
              >
                Manage
              </button>
            </div>

            {departments.length === 0 ? (
              <div className="panel-body">
                <div className="empty-state">
                  <span className="empty-state-icon">
                    <Icon name="building" size={24} />
                  </span>
                  <span className="empty-state-title">No departments yet</span>
                  <p>Departments you manage will be listed here.</p>
                </div>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Department</th>
                      <th>Campus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.slice(0, 8).map((row, index) => (
                      <tr key={row.department_id || index}>
                        <td>
                          <strong>{row.department_code || '-'}</strong>
                        </td>
                        <td>{row.department_name || '-'}</td>
                        <td>{row.campus?.campus_name || row.campus_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Quick Actions</h3>
            </div>
            <div className="panel-body">
              <div className="quick-actions">
                <button
                  type="button"
                  className="quick-action"
                  onClick={() => onNavigate('curriculum')}
                >
                  <span className="quick-action-icon">
                    <Icon name="book" />
                  </span>
                  <span className="quick-action-title">Curriculum Review</span>
                  <span className="quick-action-desc">Review and approve curricula</span>
                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => onNavigate('evaluation')}
                >
                  <span className="quick-action-icon">
                    <Icon name="checkCircle" />
                  </span>
                  <span className="quick-action-title">Student Evaluation</span>
                  <span className="quick-action-desc">Track evaluation records</span>
                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => onNavigate('reports')}
                >
                  <span className="quick-action-icon">
                    <Icon name="chart" />
                  </span>
                  <span className="quick-action-title">Academic Reports</span>
                  <span className="quick-action-desc">Department-level analytics</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="dashboard-col">
          <section className="panel">
            <div className="panel-head">
              <h3>Evaluation Progress</h3>
            </div>
            <div className="panel-body">
              <div className="progress-row">
                <div className="progress-head">
                  <span className="progress-label">Students evaluated</span>
                  <span className="progress-value">
                    {evaluated} / {students.length || '--'}
                  </span>
                </div>
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-valuenow={evaluatedPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${evaluatedPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>My Details</h3>
              <button
                type="button"
                className="btn btn-link"
                onClick={() => onNavigate('profile')}
              >
                Edit
              </button>
            </div>
            <div className="panel-body">
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value">{deanName || 'Not set'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Department</span>
                  <span className="info-value">{departmentName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Contact</span>
                  <span className="info-value">
                    {deanProfile?.contact_number || 'Not set'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DeanDashboard;
