import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Icon from '../layout/Icon';

/**
 * Landing screen for the faculty portal — built from /faculty/classes
 * and /faculty/enrollments, which already exist.
 */

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const FacultyDashboard = ({ facultyProfile, onNavigate }) => {
  const [classes, setClasses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [classRes, enrollmentRes] = await Promise.allSettled([
        api.get('/faculty/classes', { silent: true }),
        api.get('/faculty/enrollments', { silent: true }),
      ]);

      if (cancelled) return;

      if (classRes.status === 'fulfilled') {
        const data = classRes.value.data;
        setClasses(data.classes || data || []);
      }
      if (enrollmentRes.status === 'fulfilled') {
        const data = enrollmentRes.value.data;
        setEnrollments(data.enrollments || data || []);
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

  const graded = enrollments.filter((row) => row.grade !== null && row.grade !== '');
  const pending = enrollments.length - graded.length;
  const gradedPercent = enrollments.length
    ? Math.round((graded.length / enrollments.length) * 100)
    : 0;

  /* One student may appear in several subjects — count each only once. */
  const uniqueStudents = new Set(
    enrollments.map((row) => row.student_id || row.student?.student_id).filter(Boolean)
  ).size;

  const facultyName = [facultyProfile?.first_name, facultyProfile?.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="faculty-dashboard">
      <section className="welcome-banner">
        <div className="welcome-text">
          <h2 className="welcome-greeting">
            {greeting()}
            {facultyProfile?.first_name ? `, ${facultyProfile.first_name}` : ''}!
          </h2>
          <p className="welcome-sub">
            Your classes, students and outstanding grade encoding at a glance.
          </p>
        </div>

        <div className="welcome-meta">
          <div className="welcome-meta-item">
            <span className="welcome-meta-label">Department</span>
            <span className="welcome-meta-value">
              {facultyProfile?.department?.department_name ||
                facultyProfile?.department_name ||
                'Not set'}
            </span>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Assigned Classes</span>
          <span className="stat-value">{classes.length}</span>
          <span className="stat-meta">This academic term</span>
        </article>

        <article className="stat-card is-info">
          <span className="stat-label">Students Handled</span>
          <span className="stat-value">{uniqueStudents}</span>
          <span className="stat-meta">{enrollments.length} total enrollments</span>
        </article>

        <article className="stat-card is-success">
          <span className="stat-label">Grades Encoded</span>
          <span className="stat-value">{graded.length}</span>
          <span className="stat-meta">{gradedPercent}% complete</span>
        </article>

        <article className={`stat-card ${pending > 0 ? 'is-warning' : 'is-success'}`}>
          <span className="stat-label">Pending Grades</span>
          <span className="stat-value">{pending > 0 ? pending : 0}</span>
          <span className="stat-meta">
            {pending > 0 ? 'Still awaiting encoding' : 'Everything is encoded'}
          </span>
        </article>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col">
          <section className="panel">
            <div className="panel-head">
              <h3>My Classes</h3>
              <button
                type="button"
                className="btn btn-link"
                onClick={() => onNavigate('classes')}
              >
                View all
              </button>
            </div>

            {classes.length === 0 ? (
              <div className="panel-body">
                <div className="empty-state">
                  <span className="empty-state-icon">
                    <Icon name="graduation" size={24} />
                  </span>
                  <span className="empty-state-title">No classes assigned</span>
                  <p>Classes assigned to you for this term will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Section</th>
                      <th>Term</th>
                      <th className="num">Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.slice(0, 6).map((row, index) => (
                      <tr key={row.offered_subject_id || row.section_id || index}>
                        <td>
                          <strong>
                            {row.subject_code || row.subject?.subject_code || '-'}
                          </strong>
                          <div className="stat-meta">
                            {row.subject_name || row.subject?.subject_name || ''}
                          </div>
                        </td>
                        <td>{row.section_name || row.section?.section_name || '-'}</td>
                        <td>{row.semester_name || row.semester?.semester_name || '-'}</td>
                        <td className="num">
                          {row.student_count ?? row.students_count ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="dashboard-col">
          <section className="panel">
            <div className="panel-head">
              <h3>Grade Encoding</h3>
            </div>
            <div className="panel-body">
              <div className="progress-row">
                <div className="progress-head">
                  <span className="progress-label">Encoded</span>
                  <span className="progress-value">
                    {graded.length} / {enrollments.length || '--'}
                  </span>
                </div>
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-valuenow={gradedPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={`progress-fill ${pending === 0 ? 'is-success' : ''}`}
                    style={{ width: `${gradedPercent}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block"
                style={{ marginTop: 'var(--sp-4)' }}
                onClick={() => onNavigate('grades')}
              >
                <Icon name="clipboard" size={18} />
                Encode Grades
              </button>
            </div>
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
                  onClick={() => onNavigate('evaluation')}
                >
                  <span className="quick-action-icon">
                    <Icon name="checkCircle" />
                  </span>
                  <span className="quick-action-title">Student Evaluation</span>
                  <span className="quick-action-desc">Review evaluation records</span>
                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => onNavigate('profile')}
                >
                  <span className="quick-action-icon">
                    <Icon name="user" />
                  </span>
                  <span className="quick-action-title">My Profile</span>
                  <span className="quick-action-desc">Update your details</span>
                </button>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>My Details</h3>
            </div>
            <div className="panel-body">
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value">{facultyName || 'Not set'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Employee No.</span>
                  <span className="info-value">
                    {facultyProfile?.employee_number || 'Not set'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Contact</span>
                  <span className="info-value">
                    {facultyProfile?.contact_number || 'Not set'}
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

export default FacultyDashboard;
