import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import './DeanAnalytics.css';

/**
 * @param {{ showEvalModules: boolean }} props
 */
const DeanAnalytics = ({ showEvalModules }) => {
  const [tab, setTab] = useState('overview');
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [ayId, setAyId] = useState('');
  const [semId, setSemId] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [department, setDepartment] = useState(null);
  const [insights, setInsights] = useState(null);
  const [atRisk, setAtRisk] = useState([]);
  const [riskSearch, setRiskSearch] = useState('');
  const [error, setError] = useState('');

  const queryParams = useMemo(() => {
    const p = {};
    if (ayId) p.academic_year_id = ayId;
    if (semId) p.semester_id = semId;
    return p;
  }, [ayId, semId]);

  const loadLookups = useCallback(async () => {
    try {
      const [ayRes, semRes] = await Promise.all([api.get('/academic-years'), api.get('/semesters')]);
      const ayList = Array.isArray(ayRes.data) ? ayRes.data : ayRes.data?.data || [];
      const semList = Array.isArray(semRes.data) ? semRes.data : semRes.data?.data || [];
      setAcademicYears(ayList);
      setSemesters(semList);
    } catch {
      setAcademicYears([]);
      setSemesters([]);
    }
  }, []);

  const loadCoreAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sumRes, deptRes, insRes] = await Promise.all([
        api.get('/evaluation/reports/summary', { params: queryParams }),
        api.get('/evaluation/reports/department', { params: queryParams }),
        api.get('/evaluation/reports/subject-insights', { params: queryParams }),
      ]);
      setSummary(sumRes.data);
      setDepartment(deptRes.data);
      setInsights(insRes.data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not load analytics.');
      setSummary(null);
      setDepartment(null);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  const loadAtRisk = useCallback(async () => {
    try {
      const riskRes = await api.get('/evaluation/reports/at-risk-students', {
        params: { ...queryParams, search: riskSearch || undefined },
      });
      setAtRisk(riskRes.data?.students || []);
    } catch {
      setAtRisk([]);
    }
  }, [queryParams, riskSearch]);

  useEffect(() => {
    if (!showEvalModules) return;
    loadLookups();
  }, [showEvalModules, loadLookups]);

  useEffect(() => {
    if (!showEvalModules) return;
    loadCoreAnalytics();
  }, [showEvalModules, loadCoreAnalytics]);

  useEffect(() => {
    if (!showEvalModules) return;
    const t = setTimeout(() => {
      loadAtRisk();
    }, riskSearch ? 300 : 0);
    return () => clearTimeout(t);
  }, [showEvalModules, loadAtRisk, riskSearch]);

  const programs = department?.programs || [];
  const maxProg = useMemo(
    () => Math.max(1, ...programs.map((p) => p.evaluation_count || 0)),
    [programs]
  );

  const passRate = summary?.pass_rate_percent ?? 0;
  const failRate = summary?.failure_rate_percent ?? 0;
  const donutStyle = useMemo(() => {
    const p = Number(passRate) || 0;
    const f = Number(failRate) || 0;
    const t = p + f;
    if (t <= 0) {
      return { background: '#e2e8f0' };
    }
    const pctPass = (p / t) * 100;
    return {
      background: `conic-gradient(#22c55e 0% ${pctPass}%, #ef4444 ${pctPass}% 100%)`,
    };
  }, [passRate, failRate]);

  const overviewInsight =
    programs.length > 0
      ? `${programs[0]?.program_code || 'Top program'} recorded the highest number of subject evaluations in this filter. Compare programs using the bar chart below.`
      : 'Most evaluated subjects were marked as passed when both pass and fail counts are available — adjust semester filters to narrow results.';

  const performanceFail = insights?.top_failed_subjects || [];
  const performancePass = insights?.top_passed_subjects || [];
  const avgSubjects = insights?.average_grade_by_subject || [];
  const maxFail = Math.max(1, ...performanceFail.map((x) => x.count));
  const maxPass = Math.max(1, ...performancePass.map((x) => x.count));
  const maxAvg = Math.max(1, ...avgSubjects.map((x) => x.average || 0));

  if (!showEvalModules) {
    return (
      <div className="dean-analytics">
        <h1 className="dean-analytics__title">Analytics</h1>
        <p className="dean-analytics__empty">You do not have access to evaluation analytics.</p>
      </div>
    );
  }

  return (
    <div className="dean-analytics">
      <div className="dean-analytics__head">
        <h1 className="dean-analytics__title">Descriptive analytics &amp; insights</h1>
        <div className="dean-analytics__sem-picker">
          <i className="fa-regular fa-calendar" aria-hidden />
          <div>
            <label htmlFor="dean-an-ay">Academic year</label>
            <select
              id="dean-an-ay"
              value={ayId}
              onChange={(e) => setAyId(e.target.value)}
              aria-label="Academic year"
            >
              <option value="">All years</option>
              {academicYears.map((y) => (
                <option key={y.academic_year_id ?? y.id} value={y.academic_year_id ?? y.id}>
                  {y.academic_year_name ?? y.name ?? y.year_name ?? `Year ${y.academic_year_id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dean-an-sem">Semester</label>
            <select
              id="dean-an-sem"
              value={semId}
              onChange={(e) => setSemId(e.target.value)}
              aria-label="Semester"
            >
              <option value="">All semesters</option>
              {semesters.map((s) => (
                <option key={s.semester_id ?? s.id} value={s.semester_id ?? s.id}>
                  {s.semester_name ?? s.name ?? `Semester ${s.semester_id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="dean-analytics__tabs" role="tablist" aria-label="Analytics sections">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'performance', label: 'Performance' },
          { id: 'students', label: 'Students' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`dean-analytics__tab${tab === t.id ? ' dean-analytics__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !summary ? (
        <p className="dean-analytics__empty">Loading…</p>
      ) : error ? (
        <p className="dean-analytics__empty">{error}</p>
      ) : (
        <>
          {tab === 'overview' && (
            <>
              <div className="dean-analytics__metrics">
                <div className="dean-metric-card">
                  <div className="dean-metric-card__icon">
                    <i className="fa-solid fa-user-check" aria-hidden />
                  </div>
                  <div className="dean-metric-card__body">
                    <div className="dean-metric-card__label">Evaluation records</div>
                    <div className="dean-metric-card__value">{summary?.total_evaluations ?? 0}</div>
                  </div>
                </div>
                <div className="dean-metric-card">
                  <div className="dean-metric-card__icon">
                    <i className="fa-solid fa-book-open" aria-hidden />
                  </div>
                  <div className="dean-metric-card__body">
                    <div className="dean-metric-card__label">Passed + failed (classified)</div>
                    <div className="dean-metric-card__value">
                      {(summary?.passed ?? 0) + (summary?.failed ?? 0)}
                    </div>
                  </div>
                </div>
                <div className="dean-metric-card">
                  <div className="dean-metric-card__icon">
                    <i className="fa-solid fa-chart-simple" aria-hidden />
                  </div>
                  <div className="dean-metric-card__body">
                    <div className="dean-metric-card__label">Pass rate</div>
                    <div className="dean-metric-card__value">
                      {summary?.pass_rate_percent != null ? `${summary.pass_rate_percent}%` : '—'}
                    </div>
                  </div>
                </div>
                <div className="dean-metric-card">
                  <div className="dean-metric-card__icon">
                    <i className="fa-solid fa-arrow-trend-down" aria-hidden />
                  </div>
                  <div className="dean-metric-card__body">
                    <div className="dean-metric-card__label">Failure rate</div>
                    <div className="dean-metric-card__value">
                      {summary?.failure_rate_percent != null ? `${summary.failure_rate_percent}%` : '—'}
                    </div>
                  </div>
                </div>
              </div>

              <p className="dean-analytics__insight">{overviewInsight}</p>

              <div className="dean-analytics__two-col">
                <div className="dean-chart-card">
                  <h3 className="dean-chart-card__title">Pass vs fail distribution</h3>
                  <div className="dean-donut-wrap">
                    <div className="dean-donut" style={donutStyle}>
                      <div className="dean-donut__hole">
                        Passed
                        <strong>{summary?.pass_rate_percent != null ? `${summary.pass_rate_percent}%` : '—'}</strong>
                      </div>
                    </div>
                    <div className="dean-donut-legend">
                      <div className="dean-donut-legend__row">
                        <span className="dean-donut-legend__dot dean-donut-legend__dot--pass" />
                        <span>
                          Passed: <strong>{summary?.passed ?? 0}</strong>
                        </span>
                      </div>
                      <div className="dean-donut-legend__row">
                        <span className="dean-donut-legend__dot dean-donut-legend__dot--fail" />
                        <span>
                          Failed: <strong>{summary?.failed ?? 0}</strong>
                        </span>
                      </div>
                      <div className="dean-donut-legend__row" style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        Other / incomplete: {summary?.other ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dean-chart-card">
                  <h3 className="dean-chart-card__title">Subject evaluations per program</h3>
                  {programs.length === 0 ? (
                    <p className="dean-analytics__empty">No program breakdown for this filter.</p>
                  ) : (
                    programs.map((p) => (
                      <div key={p.program_id ?? p.program_code} className="dean-bar-row">
                        <span className="dean-bar-row__label">{p.program_code}</span>
                        <div className="dean-bar-row__track">
                          <div
                            className="dean-bar-row__fill"
                            style={{
                              width: `${Math.max(6, ((p.evaluation_count || 0) / maxProg) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="dean-bar-row__n">{p.evaluation_count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'performance' && (
            <>
              <p className="dean-analytics__insight">
                Top subjects by failure and pass counts use stored evaluation rows in your scope (same rules as the
                student evaluation grid: status and numeric grade).
              </p>
              <div className="dean-analytics__two-col">
                <div className="dean-chart-card">
                  <h3 className="dean-chart-card__title">Top subjects by failures</h3>
                  {performanceFail.length === 0 ? (
                    <p className="dean-analytics__empty">No failure aggregates for this filter.</p>
                  ) : (
                    performanceFail.map((row) => (
                      <div key={row.subject_id} className="dean-bar-row">
                        <span className="dean-bar-row__label">{row.subject_code}</span>
                        <div className="dean-bar-row__track">
                          <div
                            className="dean-bar-row__fill dean-bar-row__fill--fail"
                            style={{ width: `${Math.max(8, (row.count / maxFail) * 100)}%` }}
                          />
                        </div>
                        <span className="dean-bar-row__n">{row.count}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="dean-chart-card">
                  <h3 className="dean-chart-card__title">Top subjects by passes</h3>
                  {performancePass.length === 0 ? (
                    <p className="dean-analytics__empty">No pass aggregates for this filter.</p>
                  ) : (
                    performancePass.map((row) => (
                      <div key={row.subject_id} className="dean-bar-row">
                        <span className="dean-bar-row__label">{row.subject_code}</span>
                        <div className="dean-bar-row__track">
                          <div
                            className="dean-bar-row__fill"
                            style={{ width: `${Math.max(8, (row.count / maxPass) * 100)}%` }}
                          />
                        </div>
                        <span className="dean-bar-row__n">{row.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="dean-chart-card" style={{ marginTop: '1.25rem' }}>
                <h3 className="dean-chart-card__title">Average grade (1.00–5.00 scale) by subject</h3>
                {avgSubjects.length === 0 ? (
                  <p className="dean-analytics__empty">No numeric grades in range for this filter.</p>
                ) : (
                  <div className="dean-avg-grid">
                    {avgSubjects.map((row) => (
                      <div key={row.subject_id} className="dean-bar-row">
                        <span className="dean-bar-row__label">{row.subject_code}</span>
                        <div className="dean-bar-row__track">
                          <div
                            className="dean-bar-row__fill"
                            style={{ width: `${Math.max(8, ((row.average || 0) / maxAvg) * 100)}%` }}
                          />
                        </div>
                        <span className="dean-bar-row__n">{row.average}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'students' && (
            <div className="dean-risk-table-wrap">
              <h3 className="dean-chart-card__title" style={{ marginBottom: '0.75rem' }}>
                At-risk students (multiple failed subject evaluations)
              </h3>
              <div className="dean-analytics__toolbar">
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Students with two or more failed rows in scope.
                </span>
                <div className="dean-analytics__search">
                  <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8' }} aria-hidden />
                  <input
                    type="search"
                    placeholder="Search name or ID…"
                    value={riskSearch}
                    onChange={(e) => setRiskSearch(e.target.value)}
                    aria-label="Search at-risk students"
                  />
                </div>
              </div>
              {atRisk.length === 0 ? (
                <p className="dean-analytics__empty">No at-risk students match this filter.</p>
              ) : (
                <table className="dean-risk-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Program</th>
                      <th>Failed subjects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRisk.map((r) => (
                      <tr key={r.student_id}>
                        <td>{r.student_id_number || '—'}</td>
                        <td>{r.full_name}</td>
                        <td>{r.program_code}</td>
                        <td>
                          <span className="dean-risk-pill">{r.failed_subject_evaluations}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeanAnalytics;
