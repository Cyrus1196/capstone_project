import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Icon from '../layout/Icon';

/**
 * Landing screen for the student portal.
 *
 * Built entirely from endpoints that already exist (/students/profile,
 * /students/enrollments, /students/curriculum) — no backend changes — and
 * derives its numbers client-side.
 */

const unitsOf = (row) =>
  parseFloat(row.units || row.subject?.number_of_units || row.number_of_units || 0) || 0;

const gradeOf = (row) => {
  const value = parseFloat(row.grade);
  return Number.isFinite(value) ? value : null;
};

const isPassed = (row) => {
  const grade = gradeOf(row);
  const status = (row.status || '').toLowerCase();
  return status === 'completed' || status === 'passed' || (grade !== null && grade >= 75);
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const StudentDashboard = ({ onNavigate }) => {
  const [profile, setProfile] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      /* Each request is independent — one failing shouldn't blank the page. */
      const [profileRes, enrollmentRes, curriculumRes] = await Promise.allSettled([
        api.get('/students/profile', { silent: true }),
        api.get('/students/enrollments', { silent: true }),
        api.get('/students/curriculum', { silent: true }),
      ]);

      if (cancelled) return;

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data.profile || profileRes.value.data || null);
      }
      if (enrollmentRes.status === 'fulfilled') {
        const data = enrollmentRes.value.data;
        setEnrollments(data.enrollments || data || []);
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

  const active = enrollments.filter((row) => {
    const status = (row.status || 'enrolled').toLowerCase();
    return status === 'enrolled' || status === 'ongoing';
  });

  const passed = enrollments.filter(isPassed);
  const currentUnits = active.reduce((sum, row) => sum + unitsOf(row), 0);
  const earnedUnits = passed.reduce((sum, row) => sum + unitsOf(row), 0);

  const graded = enrollments.map(gradeOf).filter((grade) => grade !== null);
  const average = graded.length
    ? (graded.reduce((sum, grade) => sum + grade, 0) / graded.length).toFixed(2)
    : null;

  const totalCurriculumUnits = curriculum.reduce((sum, row) => sum + unitsOf(row), 0);
  const progress = totalCurriculumUnits
    ? Math.min(100, Math.round((earnedUnits / totalCurriculumUnits) * 100))
    : 0;

  /* Most recent first, so the table shows what the student just did. */
  const recent = [...enrollments]
    .sort((a, b) => new Date(b.enrolled_date || 0) - new Date(a.enrolled_date || 0))
    .slice(0, 5);

  const studentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');

  return (
    <div className="student-dashboard">
      <section className="welcome-banner">
        <div className="welcome-text">
          <h2 className="welcome-greeting">
            {greeting()}
            {studentName ? `, ${profile.first_name}` : ''}!
          </h2>
          <p className="welcome-sub">
            Here is where your enrollment and academic progress stand today.
          </p>
        </div>

        <div className="welcome-meta">
          <div className="welcome-meta-item">
            <span className="welcome-meta-label">Student ID</span>
            <span className="welcome-meta-value">
              {profile?.student_id_number || 'Not set'}
            </span>
          </div>
          <div className="welcome-meta-item">
            <span className="welcome-meta-label">Status</span>
            <span className="welcome-meta-value">
              {profile?.academic_status || 'Regular'}
            </span>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Current Subjects</span>
          <span className="stat-value">{active.length}</span>
          <span className="stat-meta">{currentUnits} units this term</span>
        </article>

        <article className="stat-card is-success">
          <span className="stat-label">Subjects Passed</span>
          <span className="stat-value">{passed.length}</span>
          <span className="stat-meta">{earnedUnits} units earned</span>
        </article>

        <article className="stat-card is-info">
          <span className="stat-label">General Average</span>
          <span className="stat-value">{average || '--'}</span>
          <span className="stat-meta">
            {graded.length ? `Across ${graded.length} graded subjects` : 'No grades yet'}
          </span>
        </article>

        <article className="stat-card is-warning">
          <span className="stat-label">Curriculum Progress</span>
          <span className="stat-value">{progress}%</span>
          <span className="stat-meta">
            {totalCurriculumUnits ? `${earnedUnits} of ${totalCurriculumUnits} units` : 'Curriculum not loaded'}
          </span>
        </article>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col">
          <section className="panel">
            <div className="panel-head">
              <h3>Recent Enrollments</h3>
              <button
                type="button"
                className="btn btn-link"
                onClick={() => onNavigate('enrollments')}
              >
                View all
              </button>
            </div>

            {recent.length === 0 ? (
              <div className="panel-body">
                <div className="empty-state">
                  <span className="empty-state-icon">
                    <Icon name="inbox" size={24} />
                  </span>
                  <span className="empty-state-title">No enrollments yet</span>
                  <p>Once you are enrolled in subjects they will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Term</th>
                      <th className="num">Units</th>
                      <th className="num">Grade</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((row) => (
                      <tr key={row.enrollment_id}>
                        <td>
                          <strong>
                            {row.subject_code || row.subject?.subject_code || '-'}
                          </strong>
                          <div className="stat-meta">
                            {row.subject_name || row.subject?.subject_name || ''}
                          </div>
                        </td>
                        <td>
                          {row.semester_name || row.semester?.semester_name || '-'}
                          <div className="stat-meta">
                            {row.academic_year_name || row.academic_year?.academic_year_name || ''}
                          </div>
                        </td>
                        <td className="num">{unitsOf(row) || '-'}</td>
                        <td className="num">{row.grade || '-'}</td>
                        <td>
                          <span
                            className={`status-badge status-${(row.status || 'enrolled').toLowerCase()}`}
                          >
                            {row.status || 'Enrolled'}
                          </span>
                        </td>
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
                  onClick={() => onNavigate('enrollments')}
                >
                  <span className="quick-action-icon">
                    <Icon name="clipboard" />
                  </span>
                  <span className="quick-action-title">My Enrollments</span>
                  <span className="quick-action-desc">
                    Review subjects, grades and status per term
                  </span>
                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => onNavigate('curriculum')}
                >
                  <span className="quick-action-icon">
                    <Icon name="book" />
                  </span>
                  <span className="quick-action-title">My Curriculum</span>
                  <span className="quick-action-desc">
                    See the full program checklist year by year
                  </span>
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
                  <span className="quick-action-desc">
                    Keep your personal details up to date
                  </span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="dashboard-col">
          <section className="panel">
            <div className="panel-head">
              <h3>Progress Towards Graduation</h3>
            </div>
            <div className="panel-body">
              <div className="progress-row">
                <div className="progress-head">
                  <span className="progress-label">Units completed</span>
                  <span className="progress-value">
                    {earnedUnits} / {totalCurriculumUnits || '--'}
                  </span>
                </div>
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <p className="stat-meta" style={{ marginTop: 'var(--sp-2)' }}>
                {totalCurriculumUnits
                  ? `You have completed ${progress}% of your program.`
                  : 'Your curriculum has not been loaded yet.'}
              </p>
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
                  <span className="info-value">{studentName || 'Not set'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Student ID</span>
                  <span className="info-value">
                    {profile?.student_id_number || 'Not set'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Program</span>
                  <span className="info-value">
                    {profile?.program?.program_name || profile?.program_name || 'Not set'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Year Level</span>
                  <span className="info-value">
                    {profile?.year_level?.year_level_name || profile?.year_level_name || 'Not set'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Contact</span>
                  <span className="info-value">{profile?.contact_number || 'Not set'}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
