import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/axios';
import './DeanAnalytics.css';

const LOW_PASS_RATE = 75;
const CRITICAL_PASS_RATE = 60;

const TABS = [
  { id: 'subjects', label: 'Subject performance' },
  { id: 'blockers', label: 'Prerequisite blockers' },
  { id: 'status', label: 'Regular / Irregular' },
  { id: 'progress', label: 'Student progress' },
  { id: 'byyear', label: 'Progress by year level' },
  { id: 'load', label: 'Load plans' },
];

const OUTCOME_LABELS = {
  failed: 'Failed',
  inc: 'INC',
  dropped: 'Dropped',
  not_taken: 'Not taken yet',
  ongoing: 'In progress',
};

function DualBarChart({
  items,
  leftKey,
  rightKey,
  midKey = null,
  leftLabel,
  rightLabel,
  midLabel = null,
  leftClass,
  rightClass,
  midClass = '',
  emptyText = 'No data for this chart yet.',
}) {
  const valueKeys = [leftKey, rightKey, ...(midKey ? [midKey] : [])];
  const max = Math.max(1, ...items.flatMap((i) => valueKeys.map((k) => Number(i[k]) || 0)));
  if (!items.length) {
    return <p className="dean-analytics__empty">{emptyText}</p>;
  }
  const renderPair = (item, key, fillClass) => (
    <div className="dean-dual-pair" key={key}>
      <div className="dean-dual-pair__track">
        <div
          className={`dean-dual-pair__fill ${fillClass}`}
          style={{
            width: `${Math.max(Number(item[key]) > 0 ? 6 : 0, ((Number(item[key]) || 0) / max) * 100)}%`,
          }}
        />
      </div>
      <span className="dean-dual-pair__n">{item[key] ?? 0}</span>
    </div>
  );
  return (
    <div className="dean-dual-chart">
      {items.map((item) => (
        <div key={item.year_level_id || item.label} className="dean-dual-row">
          <div className="dean-dual-row__label">{item.label}</div>
          <div className="dean-dual-row__bars">
            {renderPair(item, leftKey, leftClass)}
            {midKey ? renderPair(item, midKey, midClass) : null}
            {renderPair(item, rightKey, rightClass)}
          </div>
        </div>
      ))}
      <div className="dean-dual-legend">
        <span>
          <i className={`dean-dual-legend__swatch ${leftClass}`} /> {leftLabel}
        </span>
        {midKey && midLabel ? (
          <span>
            <i className={`dean-dual-legend__swatch ${midClass}`} /> {midLabel}
          </span>
        ) : null}
        <span>
          <i className={`dean-dual-legend__swatch ${rightClass}`} /> {rightLabel}
        </span>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, small = false, tone = '' }) {
  return (
    <div className={`dean-metric-card${tone ? ` dean-metric-card--${tone}` : ''}`}>
      <div className="dean-metric-card__icon">
        <i className={`fa-solid ${icon}`} aria-hidden />
      </div>
      <div className="dean-metric-card__body">
        <div className="dean-metric-card__label">{label}</div>
        <div className={`dean-metric-card__value${small ? ' dean-metric-card__value--sm' : ''}`}>{value}</div>
      </div>
    </div>
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

function ProgressCompare({ actual, expected }) {
  const a = Math.max(0, Math.min(100, Number(actual) || 0));
  const e = Math.max(0, Math.min(100, Number(expected) || 0));
  const tone = a + 0.05 >= e ? 'good' : e - a <= 10 ? 'warn' : 'bad';
  return (
    <div className="dean-progress">
      <div className="dean-progress__track">
        <div className={`dean-progress__fill dean-rate__fill--${tone}`} style={{ width: `${a}%` }} />
        <div className="dean-progress__marker" style={{ left: `${e}%` }} title={`Expected ${e}%`} />
      </div>
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
    const enrolled = shown.reduce((n, s) => n + s.enrolled, 0);
    const passed = shown.reduce((n, s) => n + s.passed, 0);
    const worst = shown[0] || null;
    let insight = `No subject has at least ${min} students with a final result for these filters.`;
    if (worst) {
      const notPassed = worst.enrolled - worst.passed;
      insight =
        worst.pass_rate < LOW_PASS_RATE
          ? `${worst.code} – ${worst.name} has the highest failure rate (${notPassed} of ${worst.enrolled} students, ${worst.fail_rate}%) and may require academic intervention.`
          : `All subjects shown pass at least ${LOW_PASS_RATE}% of students. Lowest: ${worst.code} at ${worst.pass_rate}%.`;
    }
    return {
      min,
      shown,
      hidden: filtered.length - shown.length,
      overallRate: enrolled > 0 ? Math.round((passed / enrolled) * 1000) / 10 : null,
      lowCount: shown.filter((s) => s.pass_rate < LOW_PASS_RATE).length,
      insight,
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

  const renderSubjects = () => (
    <>
      <div className="dean-analytics__metrics">
        <MetricCard icon="fa-book-open" label="Subjects analyzed" value={subjectView.shown.length} />
        <MetricCard
          icon="fa-percent"
          label="Overall pass rate"
          value={subjectView.overallRate != null ? `${subjectView.overallRate}%` : '—'}
        />
        <MetricCard
          icon="fa-triangle-exclamation"
          label={`Below ${LOW_PASS_RATE}% pass rate`}
          value={subjectView.lowCount}
          tone={subjectView.lowCount > 0 ? 'warn' : ''}
        />
      </div>
      <p className="dean-analytics__insight">{subjectView.insight}</p>
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
      <div className="dean-risk-table-wrap">
        {subjectView.shown.length === 0 ? (
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
              {subjectView.shown.map((s) => {
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
        {subjectView.hidden > 0 ? (
          <p className="dean-analytics__note">
            {subjectView.hidden} subject{subjectView.hidden === 1 ? '' : 's'} hidden (fewer than {subjectView.min}{' '}
            students with a final result).
          </p>
        ) : null}
        <p className="dean-analytics__note">
          Each student counts once per subject using their best attempt. Transfer credits and subjects still in
          progress are excluded.
        </p>
      </div>
    </>
  );

  const renderBlockers = () => (
    <>
      <div className="dean-analytics__metrics">
        <MetricCard icon="fa-lock" label="Blocking subjects" value={blockers.length} />
        <MetricCard
          icon="fa-user-lock"
          label="Held by top blocker"
          value={blockers[0] ? `${blockers[0].students_blocked} students` : '—'}
          small
        />
        <MetricCard icon="fa-book" label="Top blocker" value={blockers[0]?.code || '—'} small />
      </div>
      <p className="dean-analytics__insight">{data?.prerequisite_blockers?.insight}</p>
      <div className="dean-risk-table-wrap">
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
        <p className="dean-analytics__note">
          Counts students whose current or earlier curriculum subject is waiting on this unpassed prerequisite.
          Year-standing and “all subjects” rules are not counted as blockers.
        </p>
      </div>
    </>
  );

  const renderStatus = () => {
    const totals = status?.totals || {};
    const irregularPct = totals.students > 0 ? Math.round((totals.irregular / totals.students) * 1000) / 10 : 0;
    return (
      <>
        <div className="dean-analytics__metrics">
          <MetricCard icon="fa-user-check" label="Regular" value={totals.regular ?? 0} />
          <MetricCard
            icon="fa-user-clock"
            label="Irregular"
            value={`${totals.irregular ?? 0} (${irregularPct}%)`}
            tone={irregularPct >= 30 ? 'warn' : ''}
          />
          <MetricCard icon="fa-circle-xmark" label="Irregular: failed subject" value={totals.failed_subject ?? 0} />
          <MetricCard icon="fa-shuffle" label="Irregular: out of order" value={totals.sequence_gap ?? 0} />
        </div>
        <p className="dean-analytics__insight">{status?.insight}</p>
        <div className="dean-analytics__two-col">
          <div className="dean-chart-card">
            <h3 className="dean-chart-card__title">Regular vs irregular by year level</h3>
            <DualBarChart
              items={status?.by_year || []}
              leftKey="regular"
              rightKey="irregular"
              leftLabel="Regular"
              rightLabel="Irregular"
              leftClass="dean-dual-pair__fill--good"
              rightClass="dean-dual-pair__fill--bad"
            />
          </div>
          <div className="dean-chart-card">
            <h3 className="dean-chart-card__title">Why students are irregular</h3>
            <div className="dean-mini-table-wrap" style={{ marginTop: 0 }}>
              <table className="dean-mini-table">
                <thead>
                  <tr>
                    <th>Year level</th>
                    <th className="num">Irregular</th>
                    <th className="num">Failed subject</th>
                    <th className="num">Out of order / backlog</th>
                  </tr>
                </thead>
                <tbody>
                  {(status?.by_year || []).map((y) => (
                    <tr key={y.year_level_id}>
                      <td>{y.label}</td>
                      <td className="num">{y.irregular}</td>
                      <td className="num">{y.failed_subject}</td>
                      <td className="num">{y.sequence_gap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="dean-chart-card__title" style={{ marginTop: '1.25rem' }}>
              Irregular students by entry type
            </h3>
            {(status?.irregular_by_entry_type || []).length === 0 ? (
              <p className="dean-analytics__empty">No irregular students.</p>
            ) : (
              <div className="dean-chips">
                {status.irregular_by_entry_type.map((e) => (
                  <span key={e.label} className="dean-chip">
                    {e.label} <b>{e.count}</b>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderProgress = () => {
    const totals = progress?.totals || {};
    const maxUnits = progress?.slightly_behind_max_units ?? 9;
    return (
      <>
        <div className="dean-analytics__metrics">
          <MetricCard icon="fa-circle-check" label="On track" value={totals.on_track ?? 0} />
          <MetricCard
            icon="fa-hourglass-half"
            label={`Slightly behind (1–${maxUnits} units)`}
            value={totals.slightly_behind ?? 0}
          />
          <MetricCard
            icon="fa-triangle-exclamation"
            label={`Delayed (${maxUnits + 1}+ units)`}
            value={totals.delayed ?? 0}
            tone={(totals.delayed ?? 0) > 0 ? 'warn' : ''}
          />
        </div>
        <p className="dean-analytics__insight">{progress?.insight}</p>
        <div className="dean-chart-card" style={{ marginBottom: '1.25rem' }}>
          <h3 className="dean-chart-card__title">Progress status by year level</h3>
          <p className="dean-chart-card__sub">
            Backlog = units from earlier curriculum terms (before the student’s current standing) not yet passed.
          </p>
          <DualBarChart
            items={progress?.by_year || []}
            leftKey="on_track"
            midKey="slightly_behind"
            rightKey="delayed"
            leftLabel="On track"
            midLabel="Slightly behind"
            rightLabel="Delayed"
            leftClass="dean-dual-pair__fill--good"
            midClass="dean-dual-pair__fill--warn"
            rightClass="dean-dual-pair__fill--bad"
          />
        </div>
        <div className="dean-risk-table-wrap">
          <div className="dean-analytics__toolbar">
            <h3 className="dean-chart-card__title" style={{ margin: 0 }}>
              Students with backlog
            </h3>
            <div className="dean-analytics__subfilters" style={{ margin: 0 }}>
              <div>
                <select
                  value={progressBucket}
                  onChange={(e) => setProgressBucket(e.target.value)}
                  aria-label="Progress status"
                >
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
                  `${s.backlog_codes.join(', ')}${s.backlog_subjects > s.backlog_codes.length ? ` +${s.backlog_subjects - s.backlog_codes.length} more` : ''}`,
              },
              { key: 'status', label: 'Status', render: (s) => statusPill(s.status) },
            ]}
          />
        </div>
      </>
    );
  };

  const renderByYear = () => (
    <>
      <p className="dean-analytics__insight">{byYear?.insight}</p>
      <div className="dean-risk-table-wrap">
        <table className="dean-risk-table dean-pa-table">
          <thead>
            <tr>
              <th>Year level</th>
              <th className="num">Students</th>
              <th className="num">Expected by now</th>
              <th className="num">Actual average</th>
              <th className="num">Gap</th>
              <th style={{ minWidth: '12rem' }}>Actual vs expected</th>
              <th className="num">Expected by end of year</th>
            </tr>
          </thead>
          <tbody>
            {(byYear?.rows || []).map((r) => (
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
                <td>
                  {r.students > 0 ? <ProgressCompare actual={r.actual_average} expected={r.expected_by_now} /> : '—'}
                </td>
                <td className="num">{r.expected_end_of_year != null ? `${r.expected_end_of_year}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="dean-analytics__note">
          Percentages are curriculum units passed (including transfer credits) out of the full curriculum. “Expected
          by now” counts every term before the student’s current standing; the marker on each bar shows it.
        </p>
      </div>
    </>
  );

  const renderLoad = () => {
    const totals = load?.totals || {};
    return (
      <>
        <div className="dean-analytics__metrics">
          <MetricCard icon="fa-clipboard-list" label="Saved load plans" value={totals.planned ?? 0} />
          <MetricCard
            icon="fa-arrow-down"
            label="Underload"
            value={totals.underload ?? 0}
            tone={(totals.underload ?? 0) > 0 ? 'warn' : ''}
          />
          <MetricCard icon="fa-check" label="Full load" value={totals.full ?? 0} />
          <MetricCard icon="fa-arrow-up" label="Over cap" value={totals.overload ?? 0} />
          <MetricCard icon="fa-circle-question" label="No plan this term" value={totals.no_plan ?? 0} />
        </div>
        <p className="dean-analytics__insight">{load?.insight}</p>
        <div className="dean-analytics__two-col">
          <div className="dean-chart-card">
            <h3 className="dean-chart-card__title">Load status by year level</h3>
            <div className="dean-mini-table-wrap" style={{ marginTop: 0 }}>
              <table className="dean-mini-table">
                <thead>
                  <tr>
                    <th>Year level</th>
                    <th className="num">Unit cap</th>
                    <th className="num">Avg units</th>
                    <th className="num">Under</th>
                    <th className="num">Full</th>
                    <th className="num">Over</th>
                    <th className="num">No plan</th>
                  </tr>
                </thead>
                <tbody>
                  {(load?.by_year || []).map((y) => (
                    <tr key={y.year_level_id}>
                      <td>{y.label}</td>
                      <td className="num">{y.cap ?? '—'}</td>
                      <td className="num">{y.avg_units ?? '—'}</td>
                      <td className="num">{y.underload}</td>
                      <td className="num">{y.full}</td>
                      <td className="num">{y.overload}</td>
                      <td className="num">{y.no_plan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="dean-chart-card">
            <h3 className="dean-chart-card__title">Most dropped subjects this term</h3>
            <p className="dean-chart-card__sub">Current-term subjects marked DROP in saved load plans.</p>
            {(load?.most_dropped || []).length === 0 ? (
              <p className="dean-analytics__empty">No dropped subjects in saved plans.</p>
            ) : (
              <table className="dean-mini-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th className="num">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {load.most_dropped.map((d) => (
                    <tr key={d.code}>
                      <td>
                        <strong>{d.code}</strong>
                        <div className="dean-pa-sub">{d.name}</div>
                      </td>
                      <td className="num">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="dean-risk-table-wrap" style={{ marginTop: '1.25rem' }}>
          <h3 className="dean-chart-card__title">Underloaded students</h3>
          <StudentTable
            students={load?.underloaded || []}
            yearLabel={yearLabel}
            columns={[
              { key: 'units', label: 'Units planned', render: (s) => `${s.units} / ${s.cap}` },
              { key: 'short', label: 'Short by', render: (s) => <strong>{s.cap - s.units}</strong> },
              { key: 'status', label: 'Status', render: (s) => statusPill(s.status) },
            ]}
          />
        </div>
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
    <div className="dean-analytics" data-tour="page-dean-analytics">
      <div className="dean-analytics__head">
        <div>
          <h1 className="dean-analytics__title">Program analytics</h1>
          <p className="dean-analytics__lead">
            Built from each student’s current curriculum evaluation — the same pass, credit, and Regular/Irregular
            rules used on the evaluation screen.
          </p>
        </div>
        <div className="dean-analytics__filters">
          <div>
            <label htmlFor="dean-an-program">Program</label>
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
          </div>
          <div className="dean-analytics__refresh">
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
            <span>
              {generatedAt
                ? `${data?.student_count ?? 0} students · updated ${generatedAt.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : '\u00a0'}
            </span>
          </div>
        </div>
      </div>

      <div className="dean-analytics__tabs" role="tablist" aria-label="Analytics sections">
        {TABS.map((t) => (
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

      {loading && !data ? (
        <p className="dean-analytics__empty">Computing analytics for this program… this can take a few seconds.</p>
      ) : error ? (
        <p className="dean-analytics__empty">{error}</p>
      ) : !data?.student_count ? (
        <p className="dean-analytics__hint">No students with a curriculum record in this program yet.</p>
      ) : (
        <div className={loading ? 'dean-analytics__body is-loading' : 'dean-analytics__body'}>{views[tab]()}</div>
      )}
    </div>
  );
};

export default DeanAnalytics;
