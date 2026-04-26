import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import './DeanDashboard.css';

/**
 * @param {{
 *   onNavigate: (id: string) => void,
 *   showEvalModules: boolean,
 *   canManageCurriculum?: boolean,
 *   canManageUsers?: boolean,
 * }} props
 */
const DeanDashboard = ({
  onNavigate,
  showEvalModules,
  canManageCurriculum = false,
  canManageUsers = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!showEvalModules) {
      setLoading(false);
      setData(null);
      return undefined;
    }
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/evaluation/reports/dean-dashboard');
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || 'Could not load dashboard.');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showEvalModules]);

  if (!showEvalModules) {
    return (
      <div className="dean-dash">
        <h1 className="dean-dash__title">Dashboard</h1>
        <p className="dean-dash__lead">You do not have access to evaluation insights for this portal.</p>
      </div>
    );
  }

  return (
    <div className="dean-dash">
      <h1 className="dean-dash__title">Dashboard</h1>
      <p className="dean-dash__lead">
        Snapshot of students, stored academic-record evaluations, and faculty evaluators in your scope.
      </p>

      {loading ? (
        <p className="dean-dash__empty">Loading…</p>
      ) : error ? (
        <p className="dean-dash__empty">{error}</p>
      ) : (
        <>
          <div className="dean-dash__stats">
            <div className="dean-stat-card dean-stat-card--blue">
              <i className="fa-solid fa-users dean-stat-card__icon" aria-hidden />
              <span className="dean-stat-card__label">Total students</span>
              <span className="dean-stat-card__value">{data?.total_students ?? 0}</span>
            </div>
            <div className="dean-stat-card dean-stat-card--green">
              <i className="fa-solid fa-user-check dean-stat-card__icon" aria-hidden />
              <span className="dean-stat-card__label">Evaluated (on file)</span>
              <span className="dean-stat-card__value">{data?.evaluated_students ?? 0}</span>
            </div>
            <div className="dean-stat-card dean-stat-card--purple">
              <i className="fa-solid fa-chalkboard-user dean-stat-card__icon" aria-hidden />
              <span className="dean-stat-card__label">Evaluators / advisers</span>
              <span className="dean-stat-card__value">{data?.evaluators_count ?? 0}</span>
            </div>
          </div>

          <div className="dean-dash__grid">
            <div className="dean-dash-panel">
              <div className="dean-dash-panel__head">
                <i className="fa-solid fa-bolt" aria-hidden />
                Quick actions
              </div>
              <div className="dean-quick-actions">
                <button
                  type="button"
                  className="dean-quick-btn dean-quick-btn--purple"
                  onClick={() => onNavigate('academic-record')}
                >
                  <i className="fa-solid fa-user-graduate" aria-hidden />
                  Evaluate a student
                </button>
                <button
                  type="button"
                  className="dean-quick-btn dean-quick-btn--pink"
                  disabled={!canManageCurriculum}
                  title={!canManageCurriculum ? 'No curriculum management permission' : undefined}
                  onClick={() => canManageCurriculum && onNavigate('admin-curriculum')}
                >
                  <i className="fa-solid fa-book" aria-hidden />
                  Manage curriculum
                </button>
                <button
                  type="button"
                  className="dean-quick-btn dean-quick-btn--rose"
                  onClick={() => onNavigate('dean-analytics')}
                >
                  <i className="fa-solid fa-chart-column" aria-hidden />
                  View analytics
                </button>
                <button
                  type="button"
                  className="dean-quick-btn dean-quick-btn--mint"
                  disabled={!canManageUsers}
                  title={!canManageUsers ? 'No user management permission' : undefined}
                  onClick={() => canManageUsers && onNavigate('user-management')}
                >
                  <i className="fa-solid fa-users" aria-hidden />
                  Manage users
                </button>
              </div>
            </div>

            <div className="dean-dash-panel">
              <div className="dean-dash-panel__head">
                <i className="fa-solid fa-chart-line" aria-hidden />
                Recent activity
              </div>
              {!data?.recent_activity?.length ? (
                <p className="dean-dash__empty">No recent stored evaluations yet.</p>
              ) : (
                <ul className="dean-activity-list">
                  {data.recent_activity.map((row) => (
                    <li key={row.academic_record_complete_id} className="dean-activity-item">
                      <i className="fa-solid fa-circle-check dean-activity-item__check" aria-hidden />
                      <div className="dean-activity-item__body">
                        <div className="dean-activity-item__name">{row.student_name}</div>
                        <div className="dean-activity-item__sub">{row.subtitle}</div>
                        <div className="dean-activity-item__meta">
                          <span className="dean-activity-item__time">{row.completed_at_human}</span>
                          <span className="dean-badge-approved">Approved</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DeanDashboard;
