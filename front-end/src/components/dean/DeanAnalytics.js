import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/axios';
import {
  COLORS,
  DonutChart,
  EnrollmentTrendChart,
  GradeDistributionChart,
  GroupedYearChart,
  PassRateBarChart,
  StackedYearChart,
  YearPopulationChart,
  yearColor,
} from './DeanAnalyticsCharts';
import './DeanAnalytics.css';

const LOW_PASS_RATE = 75;

const OUTCOME_LABELS = { failed: 'Failed', inc: 'INC', dropped: 'Dropped' };

function KpiCard({ icon, label, value, sub, tone = 'green', progress = null }) {
  return (
    <div className={`dean-kpi dean-kpi--${tone}`}>
      <div className="dean-kpi__icon">
        <i className={`fa-solid ${icon}`} aria-hidden />
      </div>
      <div className="dean-kpi__body">
        <div className="dean-kpi__label">{label}</div>
        <div className="dean-kpi__value">{value}</div>
        {sub ? <div className="dean-kpi__sub">{sub}</div> : null}
        {progress != null ? (
          <div className="dean-kpi__bar">
            <span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section({ icon, title, subtitle, insight, alert = false, wide = false, chips = null, children }) {
  return (
    <section className={`dean-viz-card${wide ? ' dean-viz-card--wide' : ''}`}>
      <header className="dean-viz-card__head dean-viz-card__head--icon">
        <span className="dean-viz-card__icon">
          <i className={`fa-solid ${icon}`} aria-hidden />
        </span>
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </header>
      {chips ? <div className="dean-stat-chips">{chips}</div> : null}
      <div className="dean-viz-card__body">{children}</div>
      {insight ? (
        <div className={`dean-insight dean-insight--inline${alert ? ' dean-insight--alert' : ''}`}>
          <i className={`fa-solid ${alert ? 'fa-bolt' : 'fa-lightbulb'}`} aria-hidden />
          <p>{insight}</p>
        </div>
      ) : null}
    </section>
  );
}

function StatChip({ tone, label, value, sub }) {
  return (
    <div className={`dean-stat-chip dean-stat-chip--${tone}`}>
      <span className="dean-stat-chip__label">{label}</span>
      <strong className="dean-stat-chip__value">{value}</strong>
      {sub ? <span className="dean-stat-chip__sub">{sub}</span> : null}
    </div>
  );
}

function StudentTable({ students, yearLabel, columns }) {
  if (!students?.length) {
    return <p className="dean-analytics__empty">No students to list.</p>;
  }
  return (
    <div className="dean-mini-table-wrap">
      <table className="dean-mini-table">
        <thead>
          <tr>
            <th>Student no.</th>
            <th>Name</th>
            <th>Year</th>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.student_id}>
              <td>{s.student_id_number || '—'}</td>
              <td>{s.name}</td>
              <td>{yearLabel(s.year)}</td>
              {columns.map((c) => (
                <td key={c.key}>{c.render(s)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

/**
 * @param {{ showEvalModules: boolean, lockedProgramId?: string|number|null }} props
 */
const DeanAnalytics = ({ showEvalModules, lockedProgramId = null }) => {
  const programLocked = lockedProgramId != null && String(lockedProgramId).trim() !== '';
  const lockedProgramIdStr = programLocked ? String(lockedProgramId) : '';

  const [filters, setFilters] = useState(() => ({
    programId: programLocked ? lockedProgramIdStr : '',
    ayId: '',
    semId: '',
    yearId: '',
  }));
  const [reloadNonce, setReloadNonce] = useState(0);
  const forceRefresh = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [minStudents, setMinStudents] = useState(10);
  const [openSubject, setOpenSubject] = useState(null);

  useEffect(() => {
    if (programLocked) setFilters((f) => ({ ...f, programId: lockedProgramIdStr }));
  }, [programLocked, lockedProgramIdStr]);

  useEffect(() => {
    if (!showEvalModules) return undefined;
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (filters.programId) params.program_id = filters.programId;
        if (filters.ayId) params.academic_year_id = filters.ayId;
        if (filters.semId !== '') params.semester_id = filters.semId;
        if (filters.yearId) params.year_level_id = filters.yearId;
        if (forceRefresh.current) params.refresh = 1;
        forceRefresh.current = false;
        const res = await api.get('/evaluation/reports/dean-program-analytics', {
          params,
          skipLoading: true,
          signal: controller.signal,
          timeout: 180000,
        });
        if (cancelled) return;
        setData(res.data);
        setOpenSubject(null);
      } catch (e) {
        if (cancelled || e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return;
        setError(e?.response?.data?.message || 'Could not load analytics.');
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [showEvalModules, filters, reloadNonce]);

  const f = data?.filters;
  const selected = f?.selected || {};
  const yearLevels = useMemo(() => f?.year_levels || [], [f?.year_levels]);
  const yearLabel = useMemo(() => {
    const map = new Map(yearLevels.map((y) => [Number(y.year_level_id), y.label]));
    return (id) => map.get(Number(id)) || (id ? `Year ${id}` : '—');
  }, [yearLevels]);

  const subjectsShown = useMemo(() => {
    const min = Math.max(1, Number(minStudents) || 1);
    return (data?.subject_performance || []).filter((s) => s.enrolled >= min);
  }, [data?.subject_performance, minStudents]);

  const evaluationRows = useMemo(
    () =>
      (data?.evaluation_by_year || []).map((y) => ({
        ...y,
        evaluated: (y.evaluated_manual || 0) + (y.evaluated_auto || 0),
      })),
    [data?.evaluation_by_year]
  );

  if (!showEvalModules) {
    return (
      <div className="dean-analytics" data-tour="page-dean-analytics">
        <h1 className="dean-analytics__title">Analytics</h1>
        <p className="dean-analytics__empty">You do not have access to evaluation analytics.</p>
      </div>
    );
  }

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const k = data?.kpis || {};
  const ins = data?.insights || {};
  const programs = data?.programs || [];
  const population = data?.population_by_year || [];
  const status = data?.status_by_year || [];
  const prev = k.previous_year;
  const delta = prev && prev.students > 0 ? k.students - prev.students : null;

  return (
    <div className="dean-analytics dean-analytics--viz" data-tour="page-dean-analytics">
      <div className="dean-hero">
        <div>
          <span className="dean-hero__eyebrow">
            <i className="fa-solid fa-chart-simple" aria-hidden /> Student academic analytics
          </span>
          <h1 className="dean-hero__title">
            {data?.selected_program?.program_code || 'Program'}
            {data?.selected_program?.program_name ? <small> {data.selected_program.program_name}</small> : null}
          </h1>
          <p className="dean-hero__lead">
            {f?.term_label || 'Loading…'}
            {f?.is_current_term ? <span className="dean-hero__badge">Current term</span> : null}
          </p>
        </div>
        <div className="dean-hero__controls dean-hero__controls--labeled">
          {!programLocked ? (
            <label>
              <span>Program</span>
              <select
                value={filters.programId || (data?.selected_program_id ? String(data.selected_program_id) : '')}
                onChange={(e) => setFilter('programId', e.target.value)}
              >
                {programs.length === 0 ? <option value="">No programs</option> : null}
                {programs.map((p) => (
                  <option key={p.program_id} value={p.program_id}>
                    {p.program_code}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span>Academic year</span>
            <select
              value={filters.ayId || (selected.academic_year_id ? String(selected.academic_year_id) : '')}
              onChange={(e) => setFilters((prevF) => ({ ...prevF, ayId: e.target.value, semId: '' }))}
            >
              {(f?.academic_years || []).map((y) => (
                <option key={y.academic_year_id} value={y.academic_year_id}>
                  {y.academic_year_name}
                  {y.is_active ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Semester</span>
            <select
              value={filters.semId !== '' ? filters.semId : String(selected.semester_id ?? '')}
              onChange={(e) => setFilter('semId', e.target.value)}
            >
              <option value="0">All semesters</option>
              {(f?.semesters || []).map((s) => (
                <option key={s.semester_id} value={s.semester_id}>
                  {s.semester_name}
                  {s.is_active ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Year level</span>
            <select value={filters.yearId} onChange={(e) => setFilter('yearId', e.target.value)}>
              <option value="">All year levels</option>
              {yearLevels.map((y) => (
                <option key={y.year_level_id} value={y.year_level_id}>
                  {y.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              forceRefresh.current = true;
              setReloadNonce((n) => n + 1);
            }}
            disabled={loading}
            title="Recalculate now"
          >
            <i className={`fa-solid fa-rotate${loading ? ' fa-spin' : ''}`} aria-hidden />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="dean-viz-loading">
          <i className="fa-solid fa-circle-notch fa-spin" aria-hidden />
          Crunching this program’s records…
        </div>
      ) : error ? (
        <p className="dean-analytics__empty">{error}</p>
      ) : !f ? (
        <p className="dean-analytics__hint">No program available for analytics.</p>
      ) : (
        <div className={loading ? 'dean-analytics__body is-loading' : 'dean-analytics__body'}>
          <div className="dean-kpis">
            <KpiCard
              icon="fa-users"
              label="Students"
              value={k.students ?? 0}
              sub={
                delta != null
                  ? `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)} vs ${prev.label}`
                  : f.term_label
              }
              tone="blue"
            />
            <KpiCard
              icon="fa-clipboard-check"
              label="Evaluated"
              value={`${k.evaluated_pct ?? 0}%`}
              sub={`${k.evaluated ?? 0} done · ${k.unevaluated ?? 0} pending`}
              tone={(k.evaluated_pct ?? 0) >= 80 ? 'green' : 'amber'}
              progress={k.evaluated_pct ?? 0}
            />
            <KpiCard
              icon="fa-user-clock"
              label="Irregular"
              value={`${k.irregular_pct ?? 0}%`}
              sub={`${k.irregular ?? 0} of ${k.students ?? 0} students`}
              tone={(k.irregular_pct ?? 0) >= 30 ? 'red' : 'violet'}
            />
            <KpiCard
              icon="fa-percent"
              label="Pass rate"
              value={k.pass_rate != null ? `${k.pass_rate}%` : '—'}
              sub={`${k.graded_results ?? 0} graded results · ${k.subjects_graded ?? 0} subjects`}
              tone={k.pass_rate != null && k.pass_rate < LOW_PASS_RATE ? 'red' : 'green'}
            />
          </div>

          <div className="dean-viz-grid dean-viz-grid--split">
            <Section
              icon="fa-people-group"
              title="Student Population by Year Level"
              subtitle={`Number of students per year level · ${f.term_label}`}
              insight={ins.population}
            >
              <YearPopulationChart data={population} />
            </Section>
            <Section icon="fa-chart-pie" title="Share by Year Level" subtitle="Percent of the program">
              <DonutChart
                data={population.map((y) => ({ name: y.label, value: y.count, color: yearColor(y.year_level_id) }))}
                centerValue={k.students ?? 0}
                centerLabel="students"
                height={320}
              />
            </Section>
          </div>

          <div className="dean-viz-grid">
            <Section
              icon="fa-clipboard-list"
              title="Evaluation Progress by Year Level"
              subtitle="Evaluated and unevaluated students per year level. Shows which year level needs attention."
              insight={ins.evaluation}
              alert={(k.unevaluated ?? 0) > 0}
              chips={
                <>
                  <StatChip
                    tone="green"
                    label="Evaluated"
                    value={k.evaluated ?? 0}
                    sub={`${k.evaluated_manual ?? 0} by staff · ${k.evaluated_auto ?? 0} auto-promoted`}
                  />
                  <StatChip
                    tone="red"
                    label="Unevaluated"
                    value={k.unevaluated ?? 0}
                    sub={`${pct(k.unevaluated ?? 0, k.students ?? 0)}% of students`}
                  />
                </>
              }
            >
              <GroupedYearChart
                data={evaluationRows}
                series={[
                  { key: 'evaluated', label: 'Evaluated', color: COLORS.good, labelColor: '#166534' },
                  { key: 'unevaluated', label: 'Unevaluated', color: '#f87171', labelColor: '#b91c1c' },
                ]}
              />
            </Section>
            <Section
              icon="fa-graduation-cap"
              title="Academic Status Distribution"
              subtitle="Regular and irregular students per year level. Shows groups that may need academic guidance."
              insight={ins.status}
              alert={(k.irregular_pct ?? 0) >= 30}
              chips={
                <>
                  <StatChip tone="blue" label="Regular" value={k.regular ?? 0} sub={`${pct(k.regular ?? 0, k.students ?? 0)}%`} />
                  <StatChip tone="amber" label="Irregular" value={k.irregular ?? 0} sub={`${k.irregular_pct ?? 0}%`} />
                </>
              }
            >
              <GroupedYearChart
                data={status}
                series={[
                  { key: 'regular', label: 'Regular', color: COLORS.info, labelColor: '#1e3a8a' },
                  { key: 'irregular', label: 'Irregular', color: '#fbbf24', labelColor: '#92400e' },
                ]}
              />
            </Section>
          </div>

          <div className="dean-viz-grid">
            <Section
              icon="fa-circle-question"
              title="Why Students Are Irregular"
              subtitle="Failed subject vs. subjects taken out of curriculum order"
              chips={
                <>
                  <StatChip tone="red" label="Failed subject" value={k.failed_subject ?? 0} />
                  <StatChip tone="amber" label="Out of order" value={k.sequence_gap ?? 0} />
                </>
              }
            >
              <StackedYearChart
                data={status}
                series={[
                  { key: 'failed_subject', label: 'Failed subject', color: COLORS.bad },
                  { key: 'sequence_gap', label: 'Out of order / backlog', color: COLORS.warn },
                ]}
              />
            </Section>
            <Section
              icon="fa-ranking-star"
              title="Grade Distribution"
              subtitle="All final grades recorded in this term"
              insight={ins.grades}
            >
              <GradeDistributionChart data={data.grade_distribution || []} />
            </Section>
          </div>

          <div className="dean-viz-grid">
            <Section
              icon="fa-book-open-reader"
              title="Subject Performance"
              subtitle={`Lowest pass rates this term · dashed line = ${LOW_PASS_RATE}% intervention threshold`}
              insight={ins.subjects}
              alert={subjectsShown[0] != null && subjectsShown[0].pass_rate < LOW_PASS_RATE}
              wide
            >
              <div className="dean-inline-filter">
                <label htmlFor="dean-min-students">Only subjects with at least</label>
                <input
                  id="dean-min-students"
                  type="number"
                  min={1}
                  value={minStudents}
                  onChange={(e) => setMinStudents(e.target.value)}
                />
                <span>graded students</span>
              </div>
              <PassRateBarChart subjects={subjectsShown.slice(0, 10)} threshold={LOW_PASS_RATE} />
              {subjectsShown.length > 0 ? (
                <details className="dean-report">
                  <summary>
                    <i className="fa-solid fa-table-list" aria-hidden /> All {subjectsShown.length} subjects
                  </summary>
                  <div className="dean-report__body">
                    <table className="dean-risk-table dean-pa-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th className="num">Enrolled</th>
                          <th className="num">Passed</th>
                          <th className="num">Failed</th>
                          <th className="num">INC</th>
                          <th className="num">Dropped</th>
                          <th className="num">Pass rate</th>
                          <th className="num">Avg grade</th>
                          <th aria-label="Students" />
                        </tr>
                      </thead>
                      <tbody>
                        {subjectsShown.map((s) => {
                          const open = openSubject === s.subject_id;
                          const flagged = s.enrolled - s.passed;
                          return (
                            <React.Fragment key={s.subject_id}>
                              <tr className={s.pass_rate < LOW_PASS_RATE ? 'dean-pa-row--warn' : undefined}>
                                <td>
                                  <strong>{s.code}</strong>
                                  <div className="dean-pa-sub">{s.name}</div>
                                </td>
                                <td className="num">{s.enrolled}</td>
                                <td className="num">{s.passed}</td>
                                <td className="num">{s.failed}</td>
                                <td className="num">{s.inc}</td>
                                <td className="num">{s.dropped}</td>
                                <td className="num">
                                  <strong>{s.pass_rate}%</strong>
                                </td>
                                <td className="num">{s.avg_grade != null ? s.avg_grade.toFixed(2) : '—'}</td>
                                <td>
                                  {flagged > 0 ? (
                                    <button
                                      type="button"
                                      className="dean-link-btn"
                                      onClick={() => setOpenSubject(open ? null : s.subject_id)}
                                      aria-expanded={open}
                                    >
                                      {open ? 'Hide' : `${flagged} student${flagged === 1 ? '' : 's'}`}
                                    </button>
                                  ) : null}
                                </td>
                              </tr>
                              {open ? (
                                <tr className="dean-pa-detail">
                                  <td colSpan={9}>
                                    <StudentTable
                                      students={s.students}
                                      yearLabel={yearLabel}
                                      columns={[
                                        {
                                          key: 'outcome',
                                          label: 'Result',
                                          render: (st) => (
                                            <span className={`dean-outcome dean-outcome--${st.outcome}`}>
                                              {OUTCOME_LABELS[st.outcome] || st.outcome}
                                              {st.grade ? ` (${st.grade})` : ''}
                                            </span>
                                          ),
                                        },
                                      ]}
                                    />
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              ) : null}
            </Section>

            <Section
              icon="fa-chart-line"
              title="Enrollment Trend by School Year"
              subtitle="Students per school year, stacked by year level (selected year in bold)"
              insight={ins.trend}
              wide
            >
              <EnrollmentTrendChart data={data.trend || []} years={yearLevels.filter((y) => !selected.year_level_id || y.year_level_id === selected.year_level_id)} selectedId={selected.academic_year_id} />
            </Section>

            <Section
              icon="fa-user-shield"
              title="Students Needing Attention"
              subtitle="Students with a failed, INC or dropped subject in this term"
              wide
            >
              <StudentTable
                students={data.students_not_passing || []}
                yearLabel={yearLabel}
                columns={[
                  { key: 'n', label: 'Subjects not passed', render: (s) => <strong>{s.not_passed}</strong> },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (s) => (
                      <span
                        className={`dean-status-pill dean-status-pill--${
                          String(s.status).toLowerCase() === 'irregular' ? 'irregular' : 'regular'
                        }`}
                      >
                        {s.status}
                      </span>
                    ),
                  },
                ]}
              />
            </Section>
          </div>
          <p className="dean-analytics__note">
            A past term counts students who have grades recorded in it; the current term also counts every current
            student by standing. Evaluated = marked evaluated (or auto-promoted) during that term. Regular / Irregular is
            computed from the records up to the end of the selected term.
          </p>
        </div>
      )}
    </div>
  );
};

export default DeanAnalytics;
