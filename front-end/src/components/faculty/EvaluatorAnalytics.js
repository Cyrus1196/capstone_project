import React, { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import './evaluatorModules.css';

/**
 * @param {{ showEvalModules: boolean }} props
 */
const EvaluatorAnalytics = ({ showEvalModules }) => {
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

  const total = pending.length + evaluated.length;
  const pctEvaluated = total > 0 ? Math.round((evaluated.length / total) * 1000) / 10 : 0;
  const pctPending = total > 0 ? Math.round((pending.length / total) * 1000) / 10 : 0;

  const programCounts = useMemo(() => {
    const m = new Map();
    const add = (list) => {
      list.forEach((s) => {
        const code = s.program?.program_code || s.program_name || 'Other';
        m.set(code, (m.get(code) || 0) + 1);
      });
    };
    add(pending);
    add(evaluated);
    return [...m.entries()]
      .map(([label, n]) => ({ label, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);
  }, [pending, evaluated]);

  const maxProgram = programCounts[0]?.n || 1;

  const insight =
    total === 0
      ? 'No students in your current evaluation scope.'
      : evaluated.length >= pending.length
        ? `Insight: ${pctEvaluated}% of students in scope already have a stored evaluation record.`
        : `Insight: ${pctPending}% of students still need a stored evaluation — start from the Student module.`;

  if (!showEvalModules) {
    return (
      <div className="evaluator-dash">
        <h1 className="evaluator-dash__title">Analytics</h1>
        <p className="evaluator-dash__lead">You do not have access to evaluation analytics.</p>
      </div>
    );
  }

  return (
    <div className="evaluator-dash">
      <h1 className="evaluator-dash__title">Descriptive analytics & insights</h1>
      <p className="evaluator-dash__lead">
        Summary counts from your evaluation student lists (same data as the Dashboard).
      </p>

      <div className="evaluator-panel">
        {loading ? (
          <p className="evaluator-curr-intro">Loading…</p>
        ) : (
          <>
            <div className="evaluator-dash__cards" style={{ marginBottom: '1.25rem' }}>
              <div className="evaluator-stat-card evaluator-stat-card--blue">
                <span className="evaluator-stat-card__label">In scope</span>
                <span className="evaluator-stat-card__value">{total}</span>
              </div>
              <div className="evaluator-stat-card evaluator-stat-card--green">
                <span className="evaluator-stat-card__label">Evaluated</span>
                <span className="evaluator-stat-card__value">{evaluated.length}</span>
              </div>
              <div className="evaluator-stat-card evaluator-stat-card--purple">
                <span className="evaluator-stat-card__label">Pending</span>
                <span className="evaluator-stat-card__value">{pending.length}</span>
              </div>
            </div>

            <p className="evaluator-insight">{insight}</p>

            <h2 className="evaluator-panel__head" style={{ marginTop: '1.25rem' }}>
              <i className="fa-solid fa-chart-bar" aria-hidden />
              Students by program (in scope)
            </h2>
            <div className="evaluator-analytics__bars">
              {programCounts.length === 0 ? (
                <p className="evaluator-curr-empty">No program breakdown available.</p>
              ) : (
                programCounts.map((row) => (
                  <div key={row.label} className="evaluator-bar-row">
                    <span>{row.label}</span>
                    <div className="evaluator-bar-row__track">
                      <div
                        className="evaluator-bar-row__fill"
                        style={{ width: `${Math.max(8, (row.n / maxProgram) * 100)}%` }}
                      />
                    </div>
                    <span className="evaluator-bar-row__n">{row.n}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EvaluatorAnalytics;
