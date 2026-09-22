import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import './DeanAnalytics.css';

function BarChart({
  items,
  valueKey = 'count',
  labelKey = 'label',
  colorClass = '',
  selectedKey = null,
  onSelect = null,
}) {
  const max = Math.max(1, ...items.map((i) => Number(i[valueKey]) || 0));
  if (!items.length) {
    return <p className="dean-analytics__empty">No data for this chart yet.</p>;
  }
  const selectable = typeof onSelect === 'function';
  return (
    <div
      className="dean-vbar-chart"
      role="group"
      aria-label={`Bar chart showing ${items
        .map((item) => `${item[labelKey]}: ${Number(item[valueKey]) || 0}`)
        .join(', ')}`}
    >
      {items.map((item) => {
        const value = Number(item[valueKey]) || 0;
        const height = Math.max(value > 0 ? 8 : 2, (value / max) * 100);
        const itemKey = item.key || item[labelKey];
        const selected = selectedKey != null && String(selectedKey) === String(itemKey);
        const fillClass = `dean-vbar__fill ${colorClass}`.trim();
        const fillStyle = { height: `${height}%` };
        return (
          <div
            key={itemKey}
            className={`dean-vbar${selectable ? ' dean-vbar--clickable' : ''}${
              selected ? ' dean-vbar--selected' : ''
            }`}
          >
            <span className="dean-vbar__value">{value}</span>
            <div className="dean-vbar__track">
              {selectable ? (
                <button
                  type="button"
                  className={fillClass}
                  style={fillStyle}
                  title={`Show weekday detail for ${item[labelKey]} (${value})`}
                  aria-label={`Show weekday breakdown for ${item[labelKey]}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(selected ? null : itemKey, item)}
                />
              ) : (
                <div
                  className={fillClass}
                  style={fillStyle}
                  title={`${item[labelKey]}: ${value}`}
                />
              )}
            </div>
            <span className="dean-vbar__label">{item[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

function DualBarChart({
  items,
  leftKey = 'last_year',
  rightKey = 'this_year',
  leftLabel = 'Last / previous',
  rightLabel = 'This / current',
  leftClass = 'dean-dual-pair__fill--last',
  rightClass = 'dean-dual-pair__fill--this',
  emptyText = 'No enrollment totals for this program.',
}) {
  const max = Math.max(
    1,
    ...items.flatMap((i) => [Number(i[leftKey]) || 0, Number(i[rightKey]) || 0])
  );
  if (!items.length) {
    return <p className="dean-analytics__empty">{emptyText}</p>;
  }
  return (
    <div className="dean-dual-chart">
      {items.map((item) => (
        <div key={item.year_level_id || item.label} className="dean-dual-row">
          <div className="dean-dual-row__label">{item.label}</div>
          <div className="dean-dual-row__bars">
            <div className="dean-dual-pair">
              <div className="dean-dual-pair__track">
                <div
                  className={`dean-dual-pair__fill ${leftClass}`}
                  style={{
                    width: `${Math.max(
                      Number(item[leftKey]) > 0 ? 6 : 0,
                      ((Number(item[leftKey]) || 0) / max) * 100
                    )}%`,
                  }}
                />
              </div>
              <span className="dean-dual-pair__n">{item[leftKey] ?? 0}</span>
            </div>
            <div className="dean-dual-pair">
              <div className="dean-dual-pair__track">
                <div
                  className={`dean-dual-pair__fill ${rightClass}`}
                  style={{
                    width: `${Math.max(
                      Number(item[rightKey]) > 0 ? 6 : 0,
                      ((Number(item[rightKey]) || 0) / max) * 100
                    )}%`,
                  }}
                />
              </div>
              <span className="dean-dual-pair__n">{item[rightKey] ?? 0}</span>
            </div>
          </div>
        </div>
      ))}
      <div className="dean-dual-legend">
        <span>
          <i className={`dean-dual-legend__swatch ${leftClass}`} /> {leftLabel}
        </span>
        <span>
          <i className={`dean-dual-legend__swatch ${rightClass}`} /> {rightLabel}
        </span>
      </div>
    </div>
  );
}

/**
 * @param {{ showEvalModules: boolean, lockedProgramId?: string|number|null }} props
 */
const DeanAnalytics = ({ showEvalModules, lockedProgramId = null }) => {
  const programLocked =
    lockedProgramId != null && String(lockedProgramId).trim() !== '';
  const lockedProgramIdStr = programLocked ? String(lockedProgramId) : '';

  const [tab, setTab] = useState('workload');
  const [programId, setProgramId] = useState(() => (programLocked ? lockedProgramIdStr : ''));
  const [thisAyId, setThisAyId] = useState('');
  const [compareAyId, setCompareAyId] = useState('');
  const [applied, setApplied] = useState(() => ({
    programId: programLocked ? lockedProgramIdStr : '',
    thisAyId: '',
    compareAyId: '',
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  /** Selected week key on Rush forecast chart — unlocks weekday detail. */
  const [selectedRushWeekKey, setSelectedRushWeekKey] = useState(null);

  useEffect(() => {
    if (!programLocked) return;
    setProgramId(lockedProgramIdStr);
    setApplied((prev) => ({ ...prev, programId: lockedProgramIdStr }));
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
        if (applied.programId) params.program_id = applied.programId;
        if (applied.thisAyId) params.academic_year_id = applied.thisAyId;
        if (applied.compareAyId) params.compare_academic_year_id = applied.compareAyId;
        const res = await api.get('/evaluation/reports/dean-decision', {
          params,
          skipLoading: true,
          signal: controller.signal,
        });
        if (cancelled) return;
        setData(res.data);
        setSelectedRushWeekKey(null);
        if (!programLocked) {
          setProgramId((prev) => prev || (res.data?.selected_program_id ? String(res.data.selected_program_id) : ''));
        }
        setThisAyId((prev) => prev || (res.data?.this_academic_year_id ? String(res.data.this_academic_year_id) : ''));
        setCompareAyId((prev) => prev || (res.data?.compare_academic_year_id ? String(res.data.compare_academic_year_id) : ''));
      } catch (e) {
        if (cancelled || e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return;
        setError(e?.response?.data?.message || 'Could not load decision analytics.');
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [showEvalModules, applied, programLocked]);

  const programs = data?.programs || [];
  const academicYears = data?.academic_years || [];
  const programLabel =
    data?.selected_program?.program_code ||
    programs.find((p) => String(p.program_id) === String(programId))?.program_code ||
    'Program';

  const selectedRushWeek = useMemo(() => {
    if (!selectedRushWeekKey) return null;
    return (data?.rush_forecast?.by_week || []).find(
      (w) => String(w.key) === String(selectedRushWeekKey)
    ) || null;
  }, [data?.rush_forecast?.by_week, selectedRushWeekKey]);

  const selectedRushWeekdayDetail = useMemo(() => {
    if (!selectedRushWeekKey) {
      return {
        by_weekday: data?.rush_forecast?.by_weekday || [],
        insight_day: data?.rush_forecast?.insight_day || '',
        scopeLabel: 'current window',
      };
    }
    const byWeek = data?.rush_forecast?.by_weekday_by_week || {};
    const detail = byWeek[selectedRushWeekKey];
    if (!detail) {
      return {
        by_weekday: [],
        insight_day: 'No day breakdown for this week.',
        scopeLabel: selectedRushWeek?.label || 'selected week',
      };
    }
    return {
      ...detail,
      scopeLabel: selectedRushWeek?.label || 'selected week',
    };
  }, [
    data?.rush_forecast?.by_weekday,
    data?.rush_forecast?.insight_day,
    data?.rush_forecast?.by_weekday_by_week,
    selectedRushWeekKey,
    selectedRushWeek,
  ]);

  const tabs = [
    { id: 'workload', label: 'Workload' },
    { id: 'enrollment', label: 'Enrollment' },
    { id: 'unevaluated', label: 'Unevaluated' },
    { id: 'capacity', label: 'Capacity' },
    { id: 'forecast', label: 'Rush forecast' },
  ];

  const setAnalyticsTab = (nextTab) => {
    setTab(nextTab);
    if (nextTab !== 'forecast') {
      setSelectedRushWeekKey(null);
    }
  };

  if (!showEvalModules) {
    return (
      <div className="dean-analytics" data-tour="page-dean-analytics">
        <h1 className="dean-analytics__title">Analytics</h1>
        <p className="dean-analytics__empty">You do not have access to evaluation analytics.</p>
      </div>
    );
  }

  return (
    <div className="dean-analytics" data-tour="page-dean-analytics">
      <div className="dean-analytics__head">
        <div>
          <h1 className="dean-analytics__title">Decision analytics</h1>
          <p className="dean-analytics__lead">
            One-program views for staffing, backlog, and evaluation rush decisions.
          </p>
        </div>
        <div className="dean-analytics__filters">
          <div>
            <label htmlFor="dean-an-program">Program</label>
            <select
              id="dean-an-program"
              value={programId}
              onChange={(e) => {
                if (programLocked) return;
                const v = e.target.value;
                setProgramId(v);
                setApplied((a) => ({ ...a, programId: v }));
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
          <div>
            <label htmlFor="dean-an-this-ay">This period</label>
            <select
              id="dean-an-this-ay"
              value={thisAyId}
              onChange={(e) => {
                const v = e.target.value;
                setThisAyId(v);
                setApplied((a) => ({ ...a, thisAyId: v }));
              }}
              aria-label="This academic year"
            >
              <option value="">Current standing</option>
              {academicYears.map((y) => (
                <option key={y.academic_year_id} value={y.academic_year_id}>
                  {y.academic_year_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dean-an-last-ay">Last period</label>
            <select
              id="dean-an-last-ay"
              value={compareAyId}
              onChange={(e) => {
                const v = e.target.value;
                setCompareAyId(v);
                setApplied((a) => ({ ...a, compareAyId: v }));
              }}
              aria-label="Compare academic year"
            >
              <option value="">Auto previous</option>
              {academicYears.map((y) => (
                <option key={`c-${y.academic_year_id}`} value={y.academic_year_id}>
                  {y.academic_year_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="dean-analytics__tabs" role="tablist" aria-label="Analytics sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`dean-analytics__tab${tab === t.id ? ' dean-analytics__tab--active' : ''}`}
            onClick={() => setAnalyticsTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <p className="dean-analytics__empty">Loading…</p>
      ) : error ? (
        <p className="dean-analytics__empty">{error}</p>
      ) : (
        <>
          {tab === 'workload' && (
            <>
              <div className="dean-analytics__metrics">
                <div className="dean-metric-card">
                  <div className="dean-metric-card__icon">
                    <i className="fa-solid fa-calendar-day" aria-hidden />
                  </div>
                  <div className="dean-metric-card__body">
                    <div className="dean-metric-card__label">Evaluations today</div>
                    <div className="dean-metric-card__value">
                      {data?.workload?.today_count ?? 0}
                    </div>
                  </div>
                </div>
                <div className="dean-metric-card">
                  <div className="dean-metric-card__icon">
                    <i className="fa-solid fa-calendar-week" aria-hidden />
                  </div>
                  <div className="dean-metric-card__body">
                    <div className="dean-metric-card__label">This week (Mon–Fri)</div>
                    <div className="dean-metric-card__value">
                      {data?.workload?.week_total ?? 0}
                    </div>
                  </div>
                </div>
                <div className="dean-metric-card">
                  <div className="dean-metric-card__icon">
                    <i className="fa-solid fa-building-columns" aria-hidden />
                  </div>
                  <div className="dean-metric-card__body">
                    <div className="dean-metric-card__label">Program</div>
                    <div className="dean-metric-card__value dean-metric-card__value--sm">
                      {programLabel}
                    </div>
                  </div>
                </div>
              </div>
              <p className="dean-analytics__insight">{data?.workload?.insight}</p>
              <div className="dean-chart-card">
                <h3 className="dean-chart-card__title">
                  Evaluations completed per day (Mon–Fri)
                </h3>
                <p className="dean-chart-card__sub">{data?.workload?.week_label}</p>
                <BarChart items={data?.workload?.by_weekday || []} />
              </div>
            </>
          )}

          {tab === 'enrollment' && (
            <>
              <p className="dean-analytics__insight">{data?.enrollment_compare?.insight}</p>
              <div className="dean-analytics__two-col">
                <div className="dean-chart-card">
                  <h3 className="dean-chart-card__title">
                    Last period — {data?.enrollment_compare?.last_year_label || '—'}
                  </h3>
                  <p className="dean-chart-card__sub">1st–4th year student totals</p>
                  <BarChart
                    items={(data?.enrollment_compare?.series || []).map((r) => ({
                      key: `last-${r.year_level_id}`,
                      label: r.label,
                      count: r.last_year,
                    }))}
                    colorClass="dean-vbar__fill--muted"
                  />
                </div>
                <div className="dean-chart-card">
                  <h3 className="dean-chart-card__title">
                    This period — {data?.enrollment_compare?.this_year_label || '—'}
                  </h3>
                  <p className="dean-chart-card__sub">1st–4th year student totals</p>
                  <BarChart
                    items={(data?.enrollment_compare?.series || []).map((r) => ({
                      key: `this-${r.year_level_id}`,
                      label: r.label,
                      count: r.this_year,
                    }))}
                  />
                </div>
              </div>
              <div className="dean-chart-card" style={{ marginTop: '1.25rem' }}>
                <h3 className="dean-chart-card__title">Side-by-side compare</h3>
                <DualBarChart items={data?.enrollment_compare?.series || []} />
              </div>
            </>
          )}

          {tab === 'unevaluated' && (
            <>
              <div className="dean-analytics__metrics">
                <div className="dean-metric-card">
                  <div className="dean-metric-card__icon">
                    <i className="fa-solid fa-robot" aria-hidden />
                  </div>
                  <div className="dean-metric-card__body">
                    <div className="dean-metric-card__label">Auto-evaluated (system)</div>
                    <div className="dean-metric-card__value">
                      {data?.unevaluated_by_year?.totals?.auto_evaluated ?? 0}
                    </div>
                  </div>
                </div>
                <div className="dean-metric-card">
                  <div className="dean-metric-card__icon">
                    <i className="fa-solid fa-arrow-up-right-dots" aria-hidden />
                  </div>
                  <div className="dean-metric-card__body">
                    <div className="dean-metric-card__label">Auto-promoted</div>
                    <div className="dean-metric-card__value">
                      {data?.unevaluated_by_year?.totals?.auto_promoted ?? 0}
                    </div>
                  </div>
                </div>
                <div className="dean-metric-card">
                  <div className="dean-metric-card__icon">
                    <i className="fa-solid fa-clipboard-question" aria-hidden />
                  </div>
                  <div className="dean-metric-card__body">
                    <div className="dean-metric-card__label">Unevaluated left</div>
                    <div className="dean-metric-card__value">
                      {data?.unevaluated_by_year?.totals?.unevaluated ?? 0}
                    </div>
                  </div>
                </div>
              </div>
              <p className="dean-analytics__insight">{data?.unevaluated_by_year?.insight}</p>
              <div className="dean-chart-card">
                <h3 className="dean-chart-card__title">
                  Unevaluated students by year level ({programLabel})
                </h3>
                <p className="dean-chart-card__sub">
                  Remaining backlog — irregulars and incomplete loads. Regulars who passed all
                  subjects are auto-evaluated.
                </p>
                <BarChart
                  items={(data?.unevaluated_by_year?.series || []).map((r) => ({
                    key: r.year_level_id,
                    label: r.label,
                    count: r.unevaluated,
                  }))}
                  colorClass="dean-vbar__fill--warn"
                />
                <div className="dean-mini-table-wrap">
                  <table className="dean-mini-table">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Unevaluated</th>
                        <th>Auto-evaluated</th>
                        <th>Auto-promoted</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.unevaluated_by_year?.series || []).map((r) => (
                        <tr key={r.year_level_id}>
                          <td>{r.label}</td>
                          <td>
                            <strong>{r.unevaluated}</strong>
                          </td>
                          <td>{r.auto_evaluated ?? 0}</td>
                          <td>{r.auto_promoted ?? 0}</td>
                          <td>{r.total_students}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="dean-chart-card" style={{ marginTop: '1.25rem' }}>
                <h3 className="dean-chart-card__title">
                  Auto-evaluated vs unevaluated
                </h3>
                <p className="dean-chart-card__sub">
                  Passed all subjects = automatic evaluation via system. Missing/failed subjects =
                  unevaluated (manual, usually irregular).
                </p>
                <DualBarChart
                  items={data?.unevaluated_by_year?.series || []}
                  leftKey="unevaluated"
                  rightKey="auto_evaluated"
                  leftLabel="Unevaluated (irregular / incomplete)"
                  rightLabel="Automatic evaluated via system"
                  leftClass="dean-dual-pair__fill--uneval"
                  rightClass="dean-dual-pair__fill--auto"
                  emptyText="No evaluation totals for this program."
                />
              </div>
            </>
          )}

          {tab === 'capacity' && (
            <>
              <p className="dean-analytics__insight">
                {(data?.decision_hints || []).find((h) => h.section === 'capacity')?.text ||
                  'Compare evaluator coverage with remaining unevaluated load per year level.'}
              </p>
              <div className="dean-analytics__two-col">
                <div className="dean-chart-card">
                  <h3 className="dean-chart-card__title">Evaluators by assigned year level</h3>
                  <p className="dean-chart-card__sub">Manpower map — who covers which year</p>
                  {(data?.evaluators_by_year?.series || []).map((row) => (
                    <div key={row.year_level_id} className="dean-eval-year-block">
                      <div className="dean-eval-year-block__head">
                        <strong>{row.label}</strong>
                        <span>{row.count} evaluator{row.count === 1 ? '' : 's'}</span>
                      </div>
                      {row.evaluators?.length ? (
                        <ul className="dean-eval-year-block__list">
                          {row.evaluators.map((ev) => (
                            <li key={`${row.year_level_id}-${ev.user_id}`}>
                              {ev.name}
                              {ev.scope === 'all_years' ? (
                                <em className="dean-eval-year-block__tag"> all years</em>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="dean-analytics__empty" style={{ margin: '0.35rem 0 0' }}>
                          No evaluator assigned
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="dean-chart-card">
                  <h3 className="dean-chart-card__title">Unevaluated students by year level</h3>
                  <p className="dean-chart-card__sub">
                    Remaining irregular / incomplete load — auto-evaluated regulars are excluded
                  </p>
                  <BarChart
                    items={(data?.unevaluated_by_year?.series || []).map((r) => ({
                      key: `cap-${r.year_level_id}`,
                      label: r.label,
                      count: r.unevaluated,
                    }))}
                    colorClass="dean-vbar__fill--warn"
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'forecast' && (
            <>
              <p className="dean-analytics__insight">{data?.rush_forecast?.insight_week}</p>
              <div className="dean-chart-card">
                <h3 className="dean-chart-card__title">Evaluation rush — by week</h3>
                <p className="dean-chart-card__sub">
                  {data?.rush_forecast?.range_label} · calendar weeks (Mon–Sun) · click a week
                  to filter the day chart below
                </p>
                <BarChart
                  items={data?.rush_forecast?.by_week || []}
                  selectedKey={selectedRushWeekKey}
                  onSelect={(key) => setSelectedRushWeekKey(key)}
                />
              </div>
              <p className="dean-analytics__insight" style={{ marginTop: '1.25rem' }}>
                {selectedRushWeekdayDetail.insight_day}
              </p>
              <div className="dean-chart-card">
                <h3 className="dean-chart-card__title">
                  Inside the rush — by day
                  {selectedRushWeekKey && selectedRushWeek?.label
                    ? ` (${selectedRushWeek.label})`
                    : ' (current window)'}
                </h3>
                <p className="dean-chart-card__sub">
                  {selectedRushWeekKey
                    ? `${selectedRushWeek?.full_label || selectedRushWeek?.label || 'Selected week'} · Mon–Sun calendar days · click the week again for the full window`
                    : 'Mon–Sun totals across the calendar weeks above'}
                </p>
                <BarChart
                  items={selectedRushWeekdayDetail.by_weekday || []}
                  colorClass="dean-vbar__fill--accent"
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default DeanAnalytics;
