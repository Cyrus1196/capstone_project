import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/axios';
import {
  AvgUnitsChart,
  BlockerBarChart,
  BlockerFlow,
  ChartCard,
  COLORS,
  CompletionHeatmap,
  DonutChart,
  ExpectedVsActualChart,
  GapChart,
  HistogramChart,
  OutcomeStackChart,
  PassRateBarChart,
  RankedBarChart,
  StackedYearChart,
  SubjectRiskMap,
  TermPassRateChart,
} from './DeanAnalyticsCharts';
import './DeanAnalytics.css';

const LOW_PASS_RATE = 75;
const CRITICAL_PASS_RATE = 60;

const TABS = [
  { id: 'subjects', label: 'Subject performance', icon: 'fa-chart-column' },
  { id: 'blockers', label: 'Prerequisite blockers', icon: 'fa-diagram-project' },
  { id: 'status', label: 'Regular / Irregular', icon: 'fa-chart-pie' },
  { id: 'progress', label: 'Student progress', icon: 'fa-person-running' },
  { id: 'byyear', label: 'Progress by year level', icon: 'fa-chart-line' },
  { id: 'load', label: 'Load plans', icon: 'fa-weight-hanging' },
];

const OUTCOME_LABELS = {
  failed: 'Failed',
  inc: 'INC',
  dropped: 'Dropped',
  not_taken: 'Not taken yet',
  ongoing: 'In progress',
};

function KpiCard({ icon, label, value, sub, tone = 'green' }) {
  return (
    <div className={`dean-kpi dean-kpi--${tone}`}>
      <div className="dean-kpi__icon">
        <i className={`fa-solid ${icon}`} aria-hidden />
      </div>
      <div className="dean-kpi__body">
        <div className="dean-kpi__label">{label}</div>
        <div className="dean-kpi__value">{value}</div>
        {sub ? <div className="dean-kpi__sub">{sub}</div> : null}
      </div>
    </div>
  );
}

function Insight({ children, tone = 'info' }) {
  if (!children) return null;
  return (
    <div className={`dean-insight dean-insight--${tone}`}>
      <i className={`fa-solid ${tone === 'alert' ? 'fa-bolt' : 'fa-lightbulb'}`} aria-hidden />
      <p>{children}</p>
    </div>
  );
}

function ReportDetails({ title = 'Detailed report', children }) {
  return (
    <details className="dean-report">
      <summary>
        <i className="fa-solid fa-table-list" aria-hidden /> {title}
      </summary>
      <div className="dean-report__body">{children}</div>
    </details>
  );
}

function rateTone(rate) {
  if (rate < CRITICAL_PASS_RATE) return 'bad';
  if (rate < LOW_PASS_RATE) return 'warn';
  return 'good';
}

function RateBar({ value, tone }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="dean-rate">
      <div className="dean-rate__track">
        <div className={`dean-rate__fill dean-rate__fill--${tone}`} style={{ width: `${v}%` }} />
      </div>
      <span className="dean-rate__n">{v.toFixed(1)}%</span>
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

function outcomeCell(s) {
  const label = OUTCOME_LABELS[s.outcome] || s.outcome || '—';
  return (
    <span className={`dean-outcome dean-outcome--${s.outcome || 'none'}`}>
      {label}
      {s.grade && s.outcome !== 'not_taken' ? ` (${s.grade})` : ''}
    </span>
  );
}

function statusPill(status) {
  const irregular = String(status || '').toLowerCase() === 'irregular';
  return (
    <span className={`dean-status-pill dean-status-pill--${irregular ? 'irregular' : 'regular'}`}>
      {status || '—'}
    </span>
  );
}

function matchesSearch(text, query) {
  const q = query.trim().toLowerCase();
  return !q || String(text || '').toLowerCase().includes(q);
}

function pct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

function semShort(semName, semId) {
  const s = String(semName || '').toLowerCase();
  if (Number(semId) === 3 || s.includes('summer') || s.includes('mid')) return 'Summer';
  if (Number(semId) === 1 || /\b(1st|first)\b/.test(s)) return '1st Sem';
  if (Number(semId) === 2 || /\b(2nd|second)\b/.test(s)) return '2nd Sem';
  return semName || `Sem ${semId}`;
}

/**
 * @param {{ showEvalModules: boolean, lockedProgramId?: string|number|null }} props
 */
const DeanAnalytics = ({ showEvalModules, lockedProgramId = null }) => {
  const programLocked = lockedProgramId != null && String(lockedProgramId).trim() !== '';
  const lockedProgramIdStr = programLocked ? String(lockedProgramId) : '';

  const [tab, setTab] = useState('subjects');
  const [programId, setProgramId] = useState(() => (programLocked ? lockedProgramIdStr : ''));
  const [reloadNonce, setReloadNonce] = useState(0);
  const forceRefresh = useRef(false);
  const loadedProgramRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const [subjYear, setSubjYear] = useState('');
  const [subjSem, setSubjSem] = useState('');
  const [subjType, setSubjType] = useState('');
  const [minStudents, setMinStudents] = useState(10);
  const [subjSearch, setSubjSearch] = useState('');
  const [openSubject, setOpenSubject] = useState(null);
  const [openBlocker, setOpenBlocker] = useState(null);
  const [progressSearch, setProgressSearch] = useState('');
  const [progressBucket, setProgressBucket] = useState('');

  useEffect(() => {
    if (programLocked) setProgramId(lockedProgramIdStr);
  }, [programLocked, lockedProgramIdStr]);

  useEffect(() => {
    if (!showEvalModules) return undefined;
    if (!forceRefresh.current && programId && loadedProgramRef.current === programId) return undefined;
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (programId) params.program_id = programId;
        if (forceRefresh.current) params.refresh = 1;
        forceRefresh.current = false;
        const res = await api.get('/evaluation/reports/dean-program-analytics', {
          params,
          skipLoading: true,
          signal: controller.signal,
          timeout: 180000,
        });
        if (cancelled) return;
        const loadedId = res.data?.selected_program_id ? String(res.data.selected_program_id) : '';
        loadedProgramRef.current = loadedId;
        setData(res.data);
        setOpenSubject(null);
        setOpenBlocker(null);
        if (!programLocked && !programId && loadedId) {
          setProgramId(loadedId);
        }
      } catch (e) {
        if (cancelled || e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return;
        setError(e?.response?.data?.message || 'Could not load program analytics.');
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [showEvalModules, programLocked, reloadNonce, programId]);

  const programs = data?.programs || [];
  const yearLevels = useMemo(() => data?.year_levels || [], [data?.year_levels]);
  const yearLabel = useMemo(() => {
    const map = new Map(yearLevels.map((y) => [Number(y.year_level_id), y.label]));
    return (id) => map.get(Number(id)) || (id ? `Year ${id}` : '—');
  }, [yearLevels]);

  const subjects = useMemo(() => data?.subject_performance?.subjects || [], [data?.subject_performance?.subjects]);
  const semOptions = useMemo(
    () => [...new Set(subjects.map((s) => s.sem_name).filter(Boolean))],
    [subjects]
  );

  const subjectView = useMemo(() => {
    const min = Math.max(1, Number(minStudents) || 1);
    const filtered = subjects.filter(
      (s) =>
        (!subjYear || String(s.year) === subjYear) &&
        (!subjSem || s.sem_name === subjSem) &&
        (!subjType || s.type === subjType) &&
        (matchesSearch(s.code, subjSearch) || matchesSearch(s.name, subjSearch))
    );
    const shown = filtered.filter((s) => s.enrolled >= min);
    const sum = (k) => shown.reduce((n, s) => n + (s[k] || 0), 0);
    const enrolled = sum('enrolled');
    const passed = sum('passed');
    const worst = shown[0] || null;
    let insight = `No subject has at least ${min} students with a final result for these filters.`;
    if (worst) {
      insight =
        worst.pass_rate < LOW_PASS_RATE
          ? `${worst.code} – ${worst.name} has the highest failure rate (${worst.enrolled - worst.passed} of ${worst.enrolled} students, ${worst.fail_rate}%) and may require academic intervention.`
          : `All subjects shown pass at least ${LOW_PASS_RATE}% of students. Lowest: ${worst.code} at ${worst.pass_rate}%.`;
    }

    const termMap = new Map();
    shown.forEach((s) => {
      const key = `${s.year}-${s.sem}`;
      const t = termMap.get(key) || {
        key,
        order: s.year * 10 + (Number(s.sem) === 3 ? 0 : Number(s.sem) || 0),
        label: `Y${s.year} ${semShort(s.sem_name, s.sem)}`,
        enrolled: 0,
        passed: 0,
      };
      t.enrolled += s.enrolled;
      t.passed += s.passed;
      termMap.set(key, t);
    });
    const terms = [...termMap.values()]
      .sort((a, b) => a.order - b.order)
      .map((t) => ({ ...t, pass_rate: pct(t.passed, t.enrolled), not_passed: t.enrolled - t.passed }));

    return {
      min,
      shown,
      hidden: filtered.length - shown.length,
      enrolled,
      passed,
      notPassed: enrolled - passed,
      outcomes: { passed, failed: sum('failed'), inc: sum('inc'), dropped: sum('dropped') },
      overallRate: enrolled > 0 ? pct(passed, enrolled) : null,
      lowCount: shown.filter((s) => s.pass_rate < LOW_PASS_RATE).length,
      lowest: shown.slice(0, 12),
      mostNotPassed: [...shown].sort((a, b) => b.enrolled - b.passed - (a.enrolled - a.passed)).slice(0, 12),
      terms,
      insight,
      alert: !!worst && worst.pass_rate < LOW_PASS_RATE,
    };
  }, [subjects, subjYear, subjSem, subjType, subjSearch, minStudents]);

  const progressList = useMemo(
    () =>
      (data?.student_progress?.most_behind || []).filter(
        (s) =>
          (!progressBucket || s.bucket === progressBucket) &&
          (matchesSearch(s.name, progressSearch) || matchesSearch(s.student_id_number, progressSearch))
      ),
    [data?.student_progress?.most_behind, progressBucket, progressSearch]
  );

  if (!showEvalModules) {
    return (
      <div className="dean-analytics" data-tour="page-dean-analytics">
        <h1 className="dean-analytics__title">Analytics</h1>
        <p className="dean-analytics__empty">You do not have access to evaluation analytics.</p>
      </div>
    );
  }

  const generatedAt = data?.generated_at ? new Date(data.generated_at) : null;
  const blockers = data?.prerequisite_blockers?.items || [];
  const status = data?.academic_status;
  const progress = data?.student_progress;
  const byYear = data?.progress_by_year;
  const load = data?.load_plans;

  const renderSubjects = () => {
    const v = subjectView;
    return (
      <>
        <div className="dean-analytics__subfilters">
          <div>
            <label htmlFor="dean-pa-year">Year level</label>
            <select id="dean-pa-year" value={subjYear} onChange={(e) => setSubjYear(e.target.value)}>
              <option value="">All</option>
              {yearLevels.map((y) => (
                <option key={y.year_level_id} value={y.year_level_id}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dean-pa-sem">Semester</label>
            <select id="dean-pa-sem" value={subjSem} onChange={(e) => setSubjSem(e.target.value)}>
              <option value="">All</option>
              {semOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dean-pa-type">Type</label>
            <select id="dean-pa-type" value={subjType} onChange={(e) => setSubjType(e.target.value)}>
              <option value="">All</option>
              <option value="major">Major</option>
              <option value="ge">GE / minor</option>
            </select>
          </div>
          <div>
            <label htmlFor="dean-pa-min">Min. students</label>
            <input
              id="dean-pa-min"
              type="number"
              min={1}
              value={minStudents}
              onChange={(e) => setMinStudents(e.target.value)}
            />
          </div>
          <div className="dean-analytics__search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input
              type="search"
              placeholder="Search subject"
              value={subjSearch}
              onChange={(e) => setSubjSearch(e.target.value)}
              aria-label="Search subject"
            />
          </div>
        </div>

        <div className="dean-kpis">
          <KpiCard icon="fa-book-open" label="Subjects analyzed" value={v.shown.length} sub={`${v.enrolled} student results`} />
          <KpiCard
            icon="fa-percent"
            label="Overall pass rate"
            value={v.overallRate != null ? `${v.overallRate}%` : '—'}
            tone={v.overallRate != null && v.overallRate < LOW_PASS_RATE ? 'amber' : 'green'}
          />
          <KpiCard
            icon="fa-triangle-exclamation"
            label={`Below ${LOW_PASS_RATE}% pass rate`}
            value={v.lowCount}
            sub="subjects needing attention"
            tone={v.lowCount > 0 ? 'red' : 'green'}
          />
          <KpiCard icon="fa-user-xmark" label="Did not pass" value={v.notPassed} sub="failed, INC or dropped" tone="violet" />
        </div>

        <Insight tone={v.alert ? 'alert' : 'info'}>{v.insight}</Insight>

        <div className="dean-viz-grid">
          <ChartCard title="Subject risk map" subtitle="Bigger bubble = more students who did not pass. Red zone = many students and a low pass rate." wide>
            <SubjectRiskMap subjects={v.shown} threshold={LOW_PASS_RATE} />
          </ChartCard>
          <ChartCard title="Lowest pass rates" subtitle={`Dashed line = ${LOW_PASS_RATE}% intervention threshold`}>
            <PassRateBarChart subjects={v.lowest} threshold={LOW_PASS_RATE} />
          </ChartCard>
          <ChartCard title="Overall outcomes" subtitle="Every subject result in the current filters">
            <DonutChart
              data={[
                { name: 'Passed', value: v.outcomes.passed, color: COLORS.good },
                { name: 'Failed', value: v.outcomes.failed, color: COLORS.bad },
                { name: 'INC', value: v.outcomes.inc, color: COLORS.warn },
                { name: 'Dropped', value: v.outcomes.dropped, color: COLORS.muted },
              ]}
              centerValue={v.overallRate != null ? `${v.overallRate}%` : '—'}
              centerLabel="pass rate"
              height={300}
            />
          </ChartCard>
          <ChartCard title="Pass rate by curriculum term" subtitle="Weighted by students; red line counts students who did not pass">
            <TermPassRateChart terms={v.terms} threshold={LOW_PASS_RATE} />
          </ChartCard>
          <ChartCard title="Where students struggle most" subtitle="Outcome mix for subjects with the most students not passing">
            <OutcomeStackChart subjects={v.mostNotPassed} />
          </ChartCard>
        </div>

        <ReportDetails title={`Detailed report · ${v.shown.length} subjects`}>
          {v.shown.length === 0 ? (
            <p className="dean-analytics__empty">No subjects match these filters.</p>
          ) : (
            <table className="dean-risk-table dean-pa-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Curriculum term</th>
                  <th className="num">Enrolled</th>
                  <th className="num">Passed</th>
                  <th className="num">Failed</th>
                  <th className="num">INC</th>
                  <th className="num">Dropped</th>
                  <th>Pass rate</th>
                  <th className="num">Avg grade</th>
                  <th aria-label="Details" />
                </tr>
              </thead>
              <tbody>
                {v.shown.map((s) => {
                  const tone = rateTone(s.pass_rate);
                  const open = openSubject === s.subject_id;
                  const flagged = s.enrolled - s.passed;
                  return (
                    <React.Fragment key={s.subject_id}>
                      <tr className={tone !== 'good' ? `dean-pa-row--${tone}` : undefined}>
                        <td>
                          <strong>{s.code}</strong>
                          <div className="dean-pa-sub">{s.name}</div>
                        </td>
                        <td>
                          {yearLabel(s.year)}
                          <div className="dean-pa-sub">{s.sem_name}</div>
                        </td>
                        <td className="num">{s.enrolled}</td>
                        <td className="num">{s.passed}</td>
                        <td className="num">{s.failed}</td>
                        <td className="num">{s.inc}</td>
                        <td className="num">{s.dropped}</td>
                        <td>
                          <RateBar value={s.pass_rate} tone={tone} />
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
                          <td colSpan={10}>
                            <StudentTable
                              students={s.students}
                              yearLabel={yearLabel}
                              columns={[{ key: 'outcome', label: 'Result', render: outcomeCell }]}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
          {v.hidden > 0 ? (
            <p className="dean-analytics__note">
              {v.hidden} subject{v.hidden === 1 ? '' : 's'} hidden (fewer than {v.min} students with a final result).
            </p>
          ) : null}
        </ReportDetails>
        <p className="dean-analytics__note">
          Each student counts once per subject using their best attempt. Transfer credits and subjects still in progress
          are excluded.
        </p>
      </>
    );
  };

  const renderBlockers = () => {
    const top = blockers[0];
    const totalLinks = blockers.reduce((n, b) => n + b.students_blocked, 0);
    return (
      <>
        <div className="dean-kpis">
          <KpiCard icon="fa-lock" label="Blocking prerequisites" value={blockers.length} tone="red" />
          <KpiCard
            icon="fa-user-lock"
            label="Top blocker"
            value={top ? top.code : '—'}
            sub={top ? `${top.students_blocked} students held back` : 'nothing blocked'}
            tone="amber"
          />
          <KpiCard
            icon="fa-link-slash"
            label="Blocked student-subject pairs"
            value={totalLinks}
            sub="a student can be blocked by several"
            tone="violet"
          />
        </div>
        <Insight tone={top ? 'alert' : 'info'}>{data?.prerequisite_blockers?.insight}</Insight>
        <div className="dean-viz-grid">
          <ChartCard
            title="Blocking flow"
            subtitle="Left: unpassed prerequisite · Right: subject students cannot take yet · Band width = students"
            wide
          >
            <BlockerFlow blockers={blockers} />
          </ChartCard>
          <ChartCard title="Students blocked per prerequisite" subtitle="Split by why the prerequisite is not passed" wide>
            <BlockerBarChart blockers={blockers} />
          </ChartCard>
        </div>
        <ReportDetails title={`Detailed report · ${blockers.length} prerequisites`}>
          {blockers.length === 0 ? (
            <p className="dean-analytics__empty">No prerequisite is blocking any student right now.</p>
          ) : (
            <table className="dean-risk-table dean-pa-table">
              <thead>
                <tr>
                  <th>Prerequisite</th>
                  <th>Curriculum term</th>
                  <th className="num">Students blocked</th>
                  <th className="num">Failed / INC</th>
                  <th className="num">Not yet taken</th>
                  <th>Blocks</th>
                  <th aria-label="Details" />
                </tr>
              </thead>
              <tbody>
                {blockers.map((b) => {
                  const open = openBlocker === b.code;
                  return (
                    <React.Fragment key={b.code}>
                      <tr>
                        <td>
                          <strong>{b.code}</strong>
                          <div className="dean-pa-sub">{b.name}</div>
                        </td>
                        <td>
                          {yearLabel(b.year)}
                          <div className="dean-pa-sub">{b.sem_name}</div>
                        </td>
                        <td className="num">
                          <span className="dean-risk-pill">{b.students_blocked}</span>
                        </td>
                        <td className="num">{b.failed_or_inc}</td>
                        <td className="num">{b.not_yet_passed}</td>
                        <td>
                          <div className="dean-chips">
                            {b.dependents.map((d) => (
                              <span key={d.code} className="dean-chip" title={d.name}>
                                {d.code} <b>{d.students}</b>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="dean-link-btn"
                            onClick={() => setOpenBlocker(open ? null : b.code)}
                            aria-expanded={open}
                          >
                            {open ? 'Hide' : 'Students'}
                          </button>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="dean-pa-detail">
                          <td colSpan={7}>
                            <StudentTable
                              students={b.students}
                              yearLabel={yearLabel}
                              columns={[{ key: 'outcome', label: `${b.code} result`, render: outcomeCell }]}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </ReportDetails>
        <p className="dean-analytics__note">
          Counts students whose current or earlier curriculum subject is waiting on an unpassed prerequisite. Year-standing
          and “all subjects” rules are not counted as blockers.
        </p>
      </>
    );
  };

  const renderStatus = () => {
    const totals = status?.totals || {};
    const irregularPct = pct(totals.irregular || 0, totals.students || 0);
    return (
      <>
        <div className="dean-kpis">
          <KpiCard icon="fa-users" label="Students" value={totals.students ?? 0} tone="blue" />
          <KpiCard icon="fa-user-check" label="Regular" value={totals.regular ?? 0} sub={`${pct(totals.regular || 0, totals.students || 0)}%`} />
          <KpiCard
            icon="fa-user-clock"
            label="Irregular"
            value={totals.irregular ?? 0}
            sub={`${irregularPct}% of the program`}
            tone={irregularPct >= 30 ? 'red' : 'amber'}
          />
          <KpiCard
            icon="fa-circle-xmark"
            label="Due to a failed subject"
            value={totals.failed_subject ?? 0}
            sub={`${totals.sequence_gap ?? 0} due to out-of-order subjects`}
            tone="violet"
          />
        </div>
        <Insight tone={irregularPct >= 30 ? 'alert' : 'info'}>{status?.insight}</Insight>
        <div className="dean-viz-grid dean-viz-grid--3">
          <ChartCard title="Program standing">
            <DonutChart
              data={[
                { name: 'Regular', value: totals.regular || 0, color: COLORS.good },
                { name: 'Irregular', value: totals.irregular || 0, color: COLORS.bad },
              ]}
              centerValue={`${irregularPct}%`}
              centerLabel="irregular"
            />
          </ChartCard>
          <ChartCard title="Why students are irregular">
            <DonutChart
              data={[
                { name: 'Failed subject', value: totals.failed_subject || 0, color: COLORS.bad },
                { name: 'Out of order / backlog', value: totals.sequence_gap || 0, color: COLORS.warn },
              ]}
              centerValue={totals.irregular ?? 0}
              centerLabel="irregular"
            />
          </ChartCard>
          <ChartCard title="Irregular by entry type" subtitle="Shiftee, transferee, returnee…">
            <RankedBarChart
              data={status?.irregular_by_entry_type || []}
              labelKey="label"
              color={COLORS.violet}
            />
          </ChartCard>
          <ChartCard title="Regular vs irregular by year level" wide>
            <StackedYearChart
              data={status?.by_year || []}
              series={[
                { key: 'regular', label: 'Regular', color: COLORS.good },
                { key: 'irregular', label: 'Irregular', color: COLORS.bad },
              ]}
            />
          </ChartCard>
          <ChartCard title="Irregular reasons by year level" wide>
            <StackedYearChart
              data={status?.by_year || []}
              series={[
                { key: 'failed_subject', label: 'Failed subject', color: COLORS.bad },
                { key: 'sequence_gap', label: 'Out of order / backlog', color: COLORS.warn },
              ]}
            />
          </ChartCard>
        </div>
      </>
    );
  };

  const renderProgress = () => {
    const totals = progress?.totals || {};
    const maxUnits = progress?.slightly_behind_max_units ?? 9;
    return (
      <>
        <div className="dean-kpis">
          <KpiCard
            icon="fa-circle-check"
            label="On track"
            value={totals.on_track ?? 0}
            sub={`${pct(totals.on_track || 0, totals.students || 0)}% of students`}
          />
          <KpiCard
            icon="fa-hourglass-half"
            label="Slightly behind"
            value={totals.slightly_behind ?? 0}
            sub={`1–${maxUnits} backlog units`}
            tone="amber"
          />
          <KpiCard
            icon="fa-triangle-exclamation"
            label="Delayed"
            value={totals.delayed ?? 0}
            sub={`${maxUnits + 1}+ backlog units`}
            tone="red"
          />
        </div>
        <Insight tone={(totals.delayed || 0) > 0 ? 'alert' : 'info'}>{progress?.insight}</Insight>
        <div className="dean-viz-grid">
          <ChartCard title="Progress status" subtitle="All students with a recorded standing">
            <DonutChart
              data={[
                { name: 'On track', value: totals.on_track || 0, color: COLORS.good },
                { name: 'Slightly behind', value: totals.slightly_behind || 0, color: COLORS.warn },
                { name: 'Delayed', value: totals.delayed || 0, color: COLORS.bad },
              ]}
              centerValue={`${pct(totals.on_track || 0, totals.students || 0)}%`}
              centerLabel="on track"
              height={300}
            />
          </ChartCard>
          <ChartCard title="Backlog distribution" subtitle="Units from earlier terms not yet passed">
            <HistogramChart
              data={progress?.backlog_histogram || []}
              xLabel="Backlog units"
              colorFor={(d, i) => (i === 0 ? COLORS.good : i <= 3 ? COLORS.warn : COLORS.bad)}
              height={300}
            />
          </ChartCard>
          <ChartCard title="Progress mix by year level" subtitle="Share of each year level (hover for counts)" wide>
            <StackedYearChart
              percent
              data={progress?.by_year || []}
              series={[
                { key: 'on_track', label: 'On track', color: COLORS.good },
                { key: 'slightly_behind', label: 'Slightly behind', color: COLORS.warn },
                { key: 'delayed', label: 'Delayed', color: COLORS.bad },
              ]}
            />
          </ChartCard>
        </div>
        <ReportDetails title={`Students with backlog · ${progress?.most_behind?.length ?? 0}`}>
          <div className="dean-analytics__subfilters">
            <div>
              <select value={progressBucket} onChange={(e) => setProgressBucket(e.target.value)} aria-label="Progress status">
                <option value="">All behind</option>
                <option value="slightly_behind">Slightly behind</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
            <div className="dean-analytics__search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden />
              <input
                type="search"
                placeholder="Search student"
                value={progressSearch}
                onChange={(e) => setProgressSearch(e.target.value)}
                aria-label="Search student"
              />
            </div>
          </div>
          <StudentTable
            students={progressList}
            yearLabel={yearLabel}
            columns={[
              {
                key: 'bucket',
                label: 'Progress',
                render: (s) => (
                  <span className={`dean-outcome dean-outcome--${s.bucket === 'delayed' ? 'failed' : 'inc'}`}>
                    {s.bucket === 'delayed' ? 'Delayed' : 'Slightly behind'}
                  </span>
                ),
              },
              { key: 'units', label: 'Backlog units', render: (s) => <strong>{s.backlog_units}</strong> },
              {
                key: 'codes',
                label: 'Backlog subjects',
                render: (s) =>
                  `${s.backlog_codes.join(', ')}${
                    s.backlog_subjects > s.backlog_codes.length
                      ? ` +${s.backlog_subjects - s.backlog_codes.length} more`
                      : ''
                  }`,
              },
              { key: 'status', label: 'Status', render: (s) => statusPill(s.status) },
            ]}
          />
        </ReportDetails>
      </>
    );
  };

  const renderByYear = () => {
    const rows = byYear?.rows || [];
    const withData = rows.filter((r) => r.students > 0);
    const worst = [...withData].sort((a, b) => a.gap - b.gap)[0];
    return (
      <>
        <div className="dean-kpis">
          {withData.map((r) => (
            <KpiCard
              key={r.year_level_id}
              icon="fa-graduation-cap"
              label={r.label}
              value={`${r.actual_average}%`}
              sub={`expected ${r.expected_by_now}% · ${r.gap > 0 ? '+' : ''}${r.gap} pts`}
              tone={r.gap < -10 ? 'red' : r.gap < 0 ? 'amber' : 'green'}
            />
          ))}
        </div>
        <Insight tone={worst && worst.gap < 0 ? 'alert' : 'info'}>{byYear?.insight}</Insight>
        <div className="dean-viz-grid">
          <ChartCard
            title="Expected vs actual curriculum completion"
            subtitle="Bars = average units completed · dashed line = expected by now · purple = expected by end of year"
            wide
          >
            <ExpectedVsActualChart rows={rows} />
          </ChartCard>
          <ChartCard title="Gap vs expected" subtitle="Percentage points ahead (+) or behind (−)">
            <GapChart rows={rows} />
          </ChartCard>
          <ChartCard title="Completion heatmap" subtitle="How many students sit at each completion level">
            <CompletionHeatmap rows={rows} />
          </ChartCard>
        </div>
        <ReportDetails>
          <table className="dean-risk-table dean-pa-table">
            <thead>
              <tr>
                <th>Year level</th>
                <th className="num">Students</th>
                <th className="num">Expected by now</th>
                <th className="num">Actual average</th>
                <th className="num">Gap</th>
                <th className="num">Expected by end of year</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year_level_id}>
                  <td>
                    <strong>{r.label}</strong>
                  </td>
                  <td className="num">{r.students}</td>
                  <td className="num">{r.expected_by_now != null ? `${r.expected_by_now}%` : '—'}</td>
                  <td className="num">{r.actual_average != null ? `${r.actual_average}%` : '—'}</td>
                  <td className="num">
                    {r.gap != null ? (
                      <span className={`dean-gap dean-gap--${r.gap < -10 ? 'bad' : r.gap < 0 ? 'warn' : 'good'}`}>
                        {r.gap > 0 ? '+' : ''}
                        {r.gap}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="num">{r.expected_end_of_year != null ? `${r.expected_end_of_year}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportDetails>
        <p className="dean-analytics__note">
          Completion = curriculum units passed (including transfer credits) out of the full curriculum. “Expected by now”
          counts every term before the student’s current standing.
        </p>
      </>
    );
  };

  const renderLoad = () => {
    const totals = load?.totals || {};
    return (
      <>
        <div className="dean-kpis">
          <KpiCard icon="fa-clipboard-list" label="Saved load plans" value={totals.planned ?? 0} tone="blue" />
          <KpiCard
            icon="fa-arrow-down"
            label="Underload"
            value={totals.underload ?? 0}
            sub={`${pct(totals.underload || 0, totals.planned || 0)}% of plans`}
            tone="amber"
          />
          <KpiCard icon="fa-check" label="Full load" value={totals.full ?? 0} />
          <KpiCard icon="fa-arrow-up" label="Over cap" value={totals.overload ?? 0} tone="red" />
          <KpiCard icon="fa-circle-question" label="No plan this term" value={totals.no_plan ?? 0} tone="violet" />
        </div>
        <Insight tone={(totals.underload || 0) > 0 ? 'alert' : 'info'}>{load?.insight}</Insight>
        <div className="dean-viz-grid">
          <ChartCard title="Load status" subtitle="Current-term plans vs the year unit cap">
            <DonutChart
              data={[
                { name: 'Underload', value: totals.underload || 0, color: COLORS.warn },
                { name: 'Full', value: totals.full || 0, color: COLORS.good },
                { name: 'Over cap', value: totals.overload || 0, color: COLORS.bad },
                { name: 'No plan', value: totals.no_plan || 0, color: COLORS.muted },
              ]}
              centerValue={totals.planned ?? 0}
              centerLabel="plans saved"
              height={300}
            />
          </ChartCard>
          <ChartCard title="How far from the cap" subtitle="Planned units minus the year’s unit cap">
            <HistogramChart
              data={load?.gap_histogram || []}
              colorFor={(d) =>
                d.label === 'Full load' ? COLORS.good : d.label === 'Over cap' ? COLORS.bad : COLORS.warn
              }
              height={300}
            />
          </ChartCard>
          <ChartCard title="Average planned units vs cap" subtitle="By year level">
            <AvgUnitsChart rows={load?.by_year || []} />
          </ChartCard>
          <ChartCard title="Load status by year level">
            <StackedYearChart
              data={load?.by_year || []}
              series={[
                { key: 'underload', label: 'Underload', color: COLORS.warn },
                { key: 'full', label: 'Full', color: COLORS.good },
                { key: 'overload', label: 'Over cap', color: COLORS.bad },
                { key: 'no_plan', label: 'No plan', color: COLORS.muted },
              ]}
            />
          </ChartCard>
          <ChartCard title="Most dropped subjects this term" subtitle="Current-term subjects marked DROP in saved plans" wide>
            <RankedBarChart data={(load?.most_dropped || []).slice(0, 10)} color={COLORS.violet} />
          </ChartCard>
        </div>
        <ReportDetails title={`Underloaded students · ${load?.underloaded?.length ?? 0}`}>
          <StudentTable
            students={load?.underloaded || []}
            yearLabel={yearLabel}
            columns={[
              { key: 'units', label: 'Units planned', render: (s) => `${s.units} / ${s.cap}` },
              { key: 'short', label: 'Short by', render: (s) => <strong>{s.cap - s.units}</strong> },
              { key: 'status', label: 'Status', render: (s) => statusPill(s.status) },
            ]}
          />
        </ReportDetails>
      </>
    );
  };

  const views = {
    subjects: renderSubjects,
    blockers: renderBlockers,
    status: renderStatus,
    progress: renderProgress,
    byyear: renderByYear,
    load: renderLoad,
  };

  return (
    <div className="dean-analytics dean-analytics--viz" data-tour="page-dean-analytics">
      <div className="dean-hero">
        <div>
          <span className="dean-hero__eyebrow">
            <i className="fa-solid fa-chart-simple" aria-hidden /> Program analytics
          </span>
          <h1 className="dean-hero__title">
            {data?.selected_program?.program_code || 'Program'}
            {data?.selected_program?.program_name ? (
              <small> {data.selected_program.program_name}</small>
            ) : null}
          </h1>
          <p className="dean-hero__lead">
            {generatedAt
              ? `${data?.student_count ?? 0} students · updated ${generatedAt.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Loading program data…'}
          </p>
        </div>
        <div className="dean-hero__controls">
          <select
            id="dean-an-program"
            value={programId}
            onChange={(e) => {
              if (!programLocked) setProgramId(e.target.value);
            }}
            disabled={programLocked}
            aria-label="Program"
            title={programLocked ? 'Program is fixed to your assigned program' : undefined}
          >
            {programs.length === 0 ? <option value="">No programs</option> : null}
            {programs.map((p) => (
              <option key={p.program_id} value={p.program_id}>
                {p.program_code}
                {p.program_name ? ` — ${p.program_name}` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              forceRefresh.current = true;
              setReloadNonce((n) => n + 1);
            }}
            disabled={loading}
          >
            <i className={`fa-solid fa-rotate${loading ? ' fa-spin' : ''}`} aria-hidden /> Refresh
          </button>
        </div>
      </div>

      <div className="dean-viz-tabs" role="tablist" aria-label="Analytics sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`dean-viz-tab${tab === t.id ? ' dean-viz-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`fa-solid ${t.icon}`} aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="dean-viz-loading">
          <i className="fa-solid fa-circle-notch fa-spin" aria-hidden />
          Crunching this program’s curriculum records…
        </div>
      ) : error ? (
        <p className="dean-analytics__empty">{error}</p>
      ) : !data?.student_count ? (
        <p className="dean-analytics__hint">No students with a curriculum record in this program yet.</p>
      ) : (
        <div className={loading ? 'dean-analytics__body is-loading' : 'dean-analytics__body'} key={tab}>
          {views[tab]()}
        </div>
      )}
    </div>
  );
};

export default DeanAnalytics;
