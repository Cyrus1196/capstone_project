import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Icon from '../layout/Icon';

/**
 * Landing screen for the admin panel — a system overview built from the
 * existing /users, /lookup/* and /curriculum endpoints.
 */

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const countOf = (result, ...keys) => {
  if (result.status !== 'fulfilled') return 0;

  const data = result.value.data;
  if (Array.isArray(data)) return data.length;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key].length;
  }

  return 0;
};

const AdminDashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const results = await Promise.allSettled([
        api.get('/users', { silent: true }),
        api.get('/lookup/subjects', { silent: true }),
        api.get('/lookup/programs', { silent: true }),
        api.get('/lookup/departments', { silent: true }),
        api.get('/curriculum', { silent: true }),
      ]);

      if (cancelled) return;

      const [userRes, subjectRes, programRes, deptRes, curriculumRes] = results;

      if (userRes.status === 'fulfilled') {
        const data = userRes.value.data;
        setUsers(data.users || (Array.isArray(data) ? data : []));
      }

      setCounts({
        users: countOf(userRes, 'users'),
        subjects: countOf(subjectRes, 'subjects'),
        programs: countOf(programRes, 'programs'),
        departments: countOf(deptRes, 'departments'),
        curriculum: countOf(curriculumRes, 'curriculum'),
      });

      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="loading">Loading system overview...</div>;
  }

  /* Group users by role so the admin sees the account mix at a glance. */
  const byRole = users.reduce((acc, row) => {
    const role = row.role?.role_name || row.role || (row.is_admin ? 'Admin' : 'Unassigned');
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const roleRows = Object.entries(byRole).sort((a, b) => b[1] - a[1]);

  return (
    <div className="admin-dashboard">
      <section className="welcome-banner">
        <div className="welcome-text">
          <h2 className="welcome-greeting">{greeting()}, Administrator!</h2>
          <p className="welcome-sub">
            System overview for the curriculum and evaluation platform.
          </p>
        </div>

        <div className="welcome-meta">
          <div className="welcome-meta-item">
            <span className="welcome-meta-label">Signed in as</span>
            <span className="welcome-meta-value">{user?.email}</span>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">User Accounts</span>
          <span className="stat-value">{counts.users}</span>
          <span className="stat-meta">Across all roles</span>
        </article>

        <article className="stat-card is-info">
          <span className="stat-label">Subjects</span>
          <span className="stat-value">{counts.subjects}</span>
          <span className="stat-meta">In the subject catalogue</span>
        </article>

        <article className="stat-card is-success">
          <span className="stat-label">Programs</span>
          <span className="stat-value">{counts.programs}</span>
          <span className="stat-meta">{counts.departments} departments</span>
        </article>

        <article className="stat-card is-warning">
          <span className="stat-label">Curriculum Entries</span>
          <span className="stat-value">{counts.curriculum}</span>
          <span className="stat-meta">Subject-to-program mappings</span>
        </article>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col">
          <section className="panel">
            <div className="panel-head">
              <h3>Quick Actions</h3>
            </div>
            <div className="panel-body">
              <div className="quick-actions">
                <button
                  type="button"
                  className="quick-action"
                  onClick={() => onNavigate('users')}
                >
                  <span className="quick-action-icon">
                    <Icon name="users" />
                  </span>
                  <span className="quick-action-title">User Management</span>
                  <span className="quick-action-desc">
                    Create accounts and assign roles
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
                  <span className="quick-action-title">Curriculum</span>
                  <span className="quick-action-desc">
                    Map subjects to programs and terms
                  </span>
                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => onNavigate('lookup')}
                >
                  <span className="quick-action-icon">
                    <Icon name="database" />
                  </span>
                  <span className="quick-action-title">Lookup Data</span>
                  <span className="quick-action-desc">
                    Campuses, programs, subjects, terms
                  </span>
                </button>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Recent Accounts</h3>
              <button
                type="button"
                className="btn btn-link"
                onClick={() => onNavigate('users')}
              >
                View all
              </button>
            </div>

            {users.length === 0 ? (
              <div className="panel-body">
                <div className="empty-state">
                  <span className="empty-state-icon">
                    <Icon name="users" size={24} />
                  </span>
                  <span className="empty-state-title">No user accounts</span>
                  <p>Accounts you create will be listed here.</p>
                </div>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 6).map((row, index) => (
                      <tr key={row.user_id || row.id || index}>
                        <td>{row.email || '-'}</td>
                        <td>
                          <span className="badge badge-brand">
                            {row.role?.role_name || row.role || (row.is_admin ? 'Admin' : '-')}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge status-${(row.status || 'active').toLowerCase()}`}
                          >
                            {row.status || 'Active'}
                          </span>
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
              <h3>Accounts by Role</h3>
            </div>
            <div className="panel-body">
              {roleRows.length === 0 ? (
                <p className="stat-meta">No accounts to summarise yet.</p>
              ) : (
                roleRows.map(([role, count]) => {
                  const percent = counts.users
                    ? Math.round((count / counts.users) * 100)
                    : 0;

                  return (
                    <div className="progress-row" key={role}>
                      <div className="progress-head">
                        <span className="progress-label">{role}</span>
                        <span className="progress-value">{count}</span>
                      </div>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div className="progress-fill" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Reference Data</h3>
            </div>
            <div className="panel-body">
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Departments</span>
                  <span className="info-value">{counts.departments}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Programs</span>
                  <span className="info-value">{counts.programs}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Subjects</span>
                  <span className="info-value">{counts.subjects}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Curriculum entries</span>
                  <span className="info-value">{counts.curriculum}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
