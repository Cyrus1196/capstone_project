import React, { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import './evaluatorModules.css';

/**
 * @param {{
 *   onNavigate: (tabId: string) => void,
 *   showEvalModules: boolean,
 * }} props
 */
const EvaluatorDashboard = ({ onNavigate, showEvalModules }) => {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);
  const [evaluated, setEvaluated] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!showEvalModules) {
      setPending([]);
      setEvaluated([]);
      setLoading(false);
      return undefined;
    }
    (async () => {
      setLoading(true);
      try {
        const [pRes, eRes] = await Promise.all([
          api.get('/evaluation/students', { params: { academic_record: 'pending' } }),
          api.get('/evaluation/students', { params: { academic_record: 'completed' } }),
        ]);
        if (cancelled) return;
        setPending(pRes.data?.students || []);
        setEvaluated(eRes.data?.students || []);
      } catch {
        if (!cancelled) {
          setPending([]);
          setEvaluated([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showEvalModules]);

  const totalInScope = pending.length + evaluated.length;

  const recentActivity = useMemo(() => {
    const withDates = evaluated
      .filter((s) => s.academic_record_completed_at)
      .map((s) => ({
        ...s,
        ts: new Date(s.academic_record_completed_at).getTime(),
      }))
      .filter((s) => !Number.isNaN(s.ts))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8);
    return withDates;
  }, [evaluated]);

  const formatRelative = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 48) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="evaluator-dash">
      <h1 className="evaluator-dash__title">Dashboard</h1>
      <p className="evaluator-dash__lead">
        Overview of students in your evaluation scope. Use Quick actions to open the Student or
        Analytics modules.
      </p>

      <div className="evaluator-dash__cards">
        <div className="evaluator-stat-card evaluator-stat-card--blue">
          <i className="fa-solid fa-users evaluator-stat-card__icon" aria-hidden />
          <span className="evaluator-stat-card__label">Students in scope</span>
          <span className="evaluator-stat-card__value">
            {loading || !showEvalModules ? '—' : totalInScope}
          </span>
        </div>
        <div className="evaluator-stat-card evaluator-stat-card--green">
          <i className="fa-solid fa-user-check evaluator-stat-card__icon" aria-hidden />
          <span className="evaluator-stat-card__label">Evaluated (on file)</span>
          <span className="evaluator-stat-card__value">
            {loading || !showEvalModules ? '—' : evaluated.length}
          </span>
        </div>
        <div className="evaluator-stat-card evaluator-stat-card--purple">
          <i className="fa-solid fa-clipboard-list evaluator-stat-card__icon" aria-hidden />
          <span className="evaluator-stat-card__label">Pending evaluation</span>
          <span className="evaluator-stat-card__value">
            {loading || !showEvalModules ? '—' : pending.length}
          </span>
        </div>
      </div>

      {!showEvalModules ? (
        <div className="evaluator-panel">
          <p className="evaluator-curr-intro" style={{ marginBottom: 0 }}>
            You do not have student evaluation permissions. Use <strong>My Profile</strong> or
            contact an administrator to update your role.
          </p>
        </div>
      ) : (
        <div className="evaluator-dash__grid">
          <div className="evaluator-panel">
            <div className="evaluator-panel__head">
              <i className="fa-solid fa-chart-line" aria-hidden />
              Recent activity
            </div>
            {recentActivity.length === 0 ? (
              <p className="evaluator-curr-empty" style={{ color: '#64748b' }}>
                No stored evaluation records yet, or none with a completion date.
              </p>
            ) : (
              <ul className="evaluator-activity-list">
                {recentActivity.map((s) => (
                  <li key={`${s.student_id}-${s.ts}`} className="evaluator-activity-item">
                    <i className="fa-solid fa-circle-check evaluator-activity-item__check" aria-hidden />
                    <div className="evaluator-activity-item__body">
                      <div className="evaluator-activity-item__name">{s.full_name}</div>
                      <div className="evaluator-activity-item__sub">
                        Academic record evaluation stored
                      </div>
                      <div className="evaluator-activity-item__meta">
                        <span className="evaluator-activity-item__time">
                          {formatRelative(s.academic_record_completed_at)}
                        </span>
                        <span className="evaluator-badge-approved">Approved</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="evaluator-panel">
            <div className="evaluator-panel__head">
              <i className="fa-solid fa-bolt" aria-hidden />
              Quick actions
            </div>
            <div className="evaluator-quick-actions">
              <button
                type="button"
                className="evaluator-quick-btn evaluator-quick-btn--purple"
                onClick={() => onNavigate('academic-record')}
              >
                <i className="fa-solid fa-user-graduate" aria-hidden />
                Evaluate a student
              </button>
              <button
                type="button"
                className="evaluator-quick-btn evaluator-quick-btn--rose"
                onClick={() => onNavigate('analytics')}
              >
                <i className="fa-solid fa-chart-column" aria-hidden />
                View analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluatorDashboard;
