import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Label,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Sankey,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

export const COLORS = {
  good: '#22a35a',
  goodDark: '#2e7d32',
  warn: '#f59e0b',
  bad: '#ef4444',
  info: '#3b82f6',
  violet: '#8b5cf6',
  muted: '#94a3b8',
  ink: '#0f172a',
  grid: '#e2e8f0',
};

const AXIS_TICK = { fill: '#64748b', fontSize: 12 };
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
  fontSize: 13,
};

export function toneColor(rate, low = 75, critical = 60) {
  if (rate < critical) return COLORS.bad;
  if (rate < low) return COLORS.warn;
  return COLORS.good;
}

function truncate(text, max = 14) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function ChartCard({ title, subtitle, children, wide = false, className = '' }) {
  return (
    <section className={`dean-viz-card${wide ? ' dean-viz-card--wide' : ''} ${className}`.trim()}>
      <header className="dean-viz-card__head">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      <div className="dean-viz-card__body">{children}</div>
    </section>
  );
}

export function EmptyChart({ text = 'Not enough data yet.' }) {
  return <div className="dean-viz-empty">{text}</div>;
}

export function DonutChart({ data, centerValue, centerLabel, height = 260 }) {
  const items = data.filter((d) => d.value > 0);
  if (!items.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={items}
          dataKey="value"
          nameKey="name"
          innerRadius="62%"
          outerRadius="88%"
          paddingAngle={items.length > 1 ? 2 : 0}
          stroke="none"
          animationDuration={900}
        >
          {items.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
          {centerValue != null ? (
            <Label
              position="center"
              content={({ viewBox }) => {
                const { cx, cy } = viewBox || {};
                if (cx == null) return null;
                return (
                  <g>
                    <text x={cx} y={cy - 4} textAnchor="middle" className="dean-viz-donut__value">
                      {centerValue}
                    </text>
                    <text x={cx} y={cy + 18} textAnchor="middle" className="dean-viz-donut__label">
                      {centerLabel}
                    </text>
                  </g>
                );
              }}
            />
          ) : null}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v} students`, n]} />
        <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars of pass rate with the 75% intervention line. */
export function PassRateBarChart({ subjects, threshold = 75 }) {
  if (!subjects.length) return <EmptyChart />;
  const data = subjects.map((s) => ({ ...s, label: s.code }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 30 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 48, left: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} stroke={COLORS.grid} />
        <XAxis type="number" domain={[0, 100]} tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="label" width={86} tick={AXIS_TICK} interval={0} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: 'rgba(148,163,184,0.12)' }}
          formatter={(v) => [`${v}%`, 'Pass rate']}
          labelFormatter={(_, p) => {
            const s = p?.[0]?.payload;
            return s ? `${s.code} – ${s.name} (${s.passed}/${s.enrolled} passed)` : '';
          }}
        />
        <ReferenceLine
          x={threshold}
          stroke={COLORS.bad}
          strokeDasharray="5 4"
          label={{ value: `${threshold}%`, position: 'top', fill: COLORS.bad, fontSize: 11 }}
        />
        <Bar dataKey="pass_rate" radius={[0, 8, 8, 0]} animationDuration={900}>
          {data.map((s) => (
            <Cell key={s.subject_id} fill={toneColor(s.pass_rate, threshold)} />
          ))}
          <LabelList dataKey="pass_rate" position="right" formatter={(v) => `${v}%`} className="dean-viz-label" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Stacked outcome counts per subject. */
export function OutcomeStackChart({ subjects }) {
  if (!subjects.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, subjects.length * 30 + 60)}>
      <BarChart data={subjects} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} stroke={COLORS.grid} />
        <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
        <YAxis type="category" dataKey="code" width={86} tick={AXIS_TICK} interval={0} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="passed" name="Passed" stackId="o" fill={COLORS.good} animationDuration={900} />
        <Bar dataKey="failed" name="Failed" stackId="o" fill={COLORS.bad} animationDuration={900} />
        <Bar dataKey="inc" name="INC" stackId="o" fill={COLORS.warn} animationDuration={900} />
        <Bar dataKey="dropped" name="Dropped" stackId="o" fill={COLORS.muted} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function BubbleTooltip({ active, payload }) {
  const s = active && payload?.[0]?.payload;
  if (!s) return null;
  return (
    <div className="dean-viz-tooltip">
      <strong>
        {s.code} – {s.name}
      </strong>
      <span>
        {s.passed}/{s.enrolled} passed · {s.pass_rate}%
      </span>
      <span>
        {s.enrolled - s.passed} did not pass ({s.failed} failed, {s.inc} INC, {s.dropped} dropped)
      </span>
    </div>
  );
}

/** Risk map: enrollment (x) vs pass rate (y); bubble size = students who did not pass. */
export function SubjectRiskMap({ subjects, threshold = 75 }) {
  if (!subjects.length) return <EmptyChart />;
  const data = subjects.map((s) => ({ ...s, notPassed: s.enrolled - s.passed }));
  const maxEnrolled = Math.max(...data.map((s) => s.enrolled));
  const minRate = Math.max(0, Math.min(...data.map((s) => s.pass_rate)) - 5);
  const median = [...data].sort((a, b) => a.enrolled - b.enrolled)[Math.floor(data.length / 2)].enrolled;
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 16, right: 24, left: 0, bottom: 16 }}>
        <CartesianGrid stroke={COLORS.grid} />
        <ReferenceArea
          x1={median}
          x2={maxEnrolled * 1.08}
          y1={minRate}
          y2={threshold}
          fill={COLORS.bad}
          fillOpacity={0.07}
          label={{ value: 'Priority zone', position: 'insideBottomRight', fill: COLORS.bad, fontSize: 12 }}
        />
        <XAxis
          type="number"
          dataKey="enrolled"
          name="Students"
          tick={AXIS_TICK}
          domain={[0, Math.ceil(maxEnrolled * 1.08)]}
          label={{ value: 'Students with a final result', position: 'insideBottom', offset: -8, fill: '#64748b', fontSize: 12 }}
        />
        <YAxis
          type="number"
          dataKey="pass_rate"
          name="Pass rate"
          tick={AXIS_TICK}
          domain={[minRate, 100]}
          tickFormatter={(v) => `${Math.round(v)}%`}
        />
        <ZAxis type="number" dataKey="notPassed" range={[60, 900]} />
        <ReferenceLine y={threshold} stroke={COLORS.bad} strokeDasharray="5 4" />
        <Tooltip content={<BubbleTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} animationDuration={900}>
          {data.map((s) => (
            <Cell key={s.subject_id} fill={toneColor(s.pass_rate, threshold)} fillOpacity={0.72} stroke="#fff" />
          ))}
          <LabelList dataKey="code" position="top" className="dean-viz-label dean-viz-label--sm" />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/** Weighted pass rate per curriculum term, bars + enrolled line. */
export function TermPassRateChart({ terms, threshold = 75 }) {
  if (!terms.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={terms} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="deanTermGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.info} stopOpacity={0.95} />
            <stop offset="100%" stopColor={COLORS.info} stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={COLORS.grid} />
        <XAxis dataKey="label" tick={AXIS_TICK} interval={0} />
        <YAxis yAxisId="rate" domain={[0, 100]} tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} />
        <YAxis yAxisId="n" orientation="right" tick={AXIS_TICK} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, n) => (n === 'Pass rate' ? [`${v}%`, n] : [v, n])}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine yAxisId="rate" y={threshold} stroke={COLORS.bad} strokeDasharray="5 4" />
        <Bar yAxisId="rate" dataKey="pass_rate" name="Pass rate" radius={[8, 8, 0, 0]} animationDuration={900}>
          {terms.map((t) => (
            <Cell key={t.key} fill={t.pass_rate < threshold ? COLORS.warn : 'url(#deanTermGrad)'} />
          ))}
        </Bar>
        <Line
          yAxisId="n"
          type="monotone"
          dataKey="not_passed"
          name="Did not pass"
          stroke={COLORS.bad}
          strokeWidth={2.5}
          dot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function SankeyNode({ x, y, width, height, payload }) {
  if (!payload || height <= 0) return null;
  const left = payload.side === 'left';
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={3}
        fill={left ? COLORS.bad : COLORS.info}
        fillOpacity={0.9}
      />
      <text
        x={left ? x - 8 : x + width + 8}
        y={y + height / 2}
        textAnchor={left ? 'end' : 'start'}
        dominantBaseline="middle"
        className="dean-viz-sankey__label"
      >
        {payload.name}
        <tspan className="dean-viz-sankey__n"> {payload.value}</tspan>
      </text>
    </g>
  );
}

/** Flow from blocking prerequisite (left) to the subjects students cannot take yet (right). */
export function BlockerFlow({ blockers, maxBlockers = 8, maxDependents = 4 }) {
  const top = blockers.slice(0, maxBlockers);
  if (!top.length) return <EmptyChart text="No prerequisite is blocking students right now." />;
  const nodes = [];
  const links = [];
  const rightIndex = new Map();
  top.forEach((b) => {
    nodes.push({ name: b.code, side: 'left' });
  });
  top.forEach((b, i) => {
    b.dependents.slice(0, maxDependents).forEach((d) => {
      if (!rightIndex.has(d.code)) {
        rightIndex.set(d.code, nodes.length);
        nodes.push({ name: d.code, side: 'right' });
      }
      links.push({ source: i, target: rightIndex.get(d.code), value: d.students });
    });
  });
  if (!links.length) return <EmptyChart />;
  const height = Math.max(280, Math.max(top.length, rightIndex.size) * 42);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Sankey
        data={{ nodes, links }}
        node={<SankeyNode />}
        nodePadding={18}
        nodeWidth={12}
        margin={{ top: 8, right: 120, bottom: 8, left: 120 }}
        link={{ stroke: COLORS.bad, strokeOpacity: 0.22 }}
      >
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} students`, 'Blocked']} />
      </Sankey>
    </ResponsiveContainer>
  );
}

export function BlockerBarChart({ blockers }) {
  const data = blockers.slice(0, 12);
  if (!data.length) return <EmptyChart text="No prerequisite is blocking students right now." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32 + 60)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} stroke={COLORS.grid} />
        <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
        <YAxis type="category" dataKey="code" width={86} tick={AXIS_TICK} interval={0} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: 'rgba(148,163,184,0.12)' }}
          labelFormatter={(_, p) => {
            const b = p?.[0]?.payload;
            return b ? `${b.code} – ${b.name}` : '';
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="failed_or_inc" name="Failed / INC / dropped" stackId="b" fill={COLORS.bad} />
        <Bar
          dataKey="not_yet_passed"
          name="Not taken yet"
          stackId="b"
          fill={COLORS.warn}
          radius={[0, 6, 6, 0]}
        >
          <LabelList dataKey="students_blocked" position="right" className="dean-viz-label" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Stacked bars by year level; `percent` normalises each bar to 100%. */
export function StackedYearChart({ data, series, percent = false, height = 280 }) {
  if (!data.length || data.every((d) => series.every((s) => !d[s.key]))) return <EmptyChart />;
  const rows = percent
    ? data.map((d) => {
        const total = series.reduce((n, s) => n + (Number(d[s.key]) || 0), 0);
        const out = { ...d };
        series.forEach((s) => {
          out[`${s.key}__raw`] = d[s.key] || 0;
          out[s.key] = total > 0 ? Math.round(((d[s.key] || 0) / total) * 1000) / 10 : 0;
        });
        return out;
      })
    : data;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 16, right: 16, left: 0, bottom: 8 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={COLORS.grid} />
        <XAxis dataKey="label" tick={AXIS_TICK} />
        <YAxis
          tick={AXIS_TICK}
          allowDecimals={false}
          domain={percent ? [0, 100] : [0, 'auto']}
          tickFormatter={percent ? (v) => `${v}%` : undefined}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: 'rgba(148,163,184,0.12)' }}
          formatter={(v, name, item) => {
            if (!percent) return [v, name];
            const raw = item?.payload?.[`${item.dataKey}__raw`];
            return [`${v}% (${raw})`, name];
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="y"
            fill={s.color}
            radius={i === series.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
            animationDuration={900}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HistogramChart({ data, colorFor, xLabel, height = 260 }) {
  if (!data.length || data.every((d) => !d.count)) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 16 }} barCategoryGap="12%">
        <CartesianGrid vertical={false} stroke={COLORS.grid} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          interval={0}
          label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 12 } : undefined}
        />
        <YAxis tick={AXIS_TICK} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: 'rgba(148,163,184,0.12)' }}
          formatter={(v) => [`${v} students`, 'Count']}
        />
        <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={900}>
          {data.map((d, i) => (
            <Cell key={d.label} fill={colorFor(d, i)} />
          ))}
          <LabelList dataKey="count" position="top" className="dean-viz-label" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Actual average completion (bars) vs expected-by-now and expected-by-end-of-year (lines). */
export function ExpectedVsActualChart({ rows }) {
  const data = rows.filter((r) => r.students > 0);
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="deanActualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.good} stopOpacity={0.95} />
            <stop offset="100%" stopColor={COLORS.good} stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={COLORS.grid} />
        <XAxis dataKey="label" tick={AXIS_TICK} />
        <YAxis domain={[0, 100]} tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v}%`, n]} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="actual_average" name="Actual average" barSize={56} radius={[10, 10, 0, 0]} animationDuration={900}>
          {data.map((r) => (
            <Cell key={r.year_level_id} fill={r.gap < -10 ? COLORS.bad : r.gap < 0 ? COLORS.warn : 'url(#deanActualGrad)'} />
          ))}
          <LabelList dataKey="actual_average" position="top" formatter={(v) => `${v}%`} className="dean-viz-label" />
        </Bar>
        <Line
          type="monotone"
          dataKey="expected_by_now"
          name="Expected by now"
          stroke={COLORS.ink}
          strokeWidth={2.5}
          strokeDasharray="6 4"
          dot={{ r: 5, fill: COLORS.ink }}
        />
        <Line
          type="monotone"
          dataKey="expected_end_of_year"
          name="Expected by end of year"
          stroke={COLORS.violet}
          strokeWidth={2}
          dot={{ r: 4, fill: COLORS.violet }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function GapChart({ rows }) {
  const data = rows.filter((r) => r.students > 0);
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, left: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} stroke={COLORS.grid} />
        <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} />
        <YAxis type="category" dataKey="label" width={86} tick={AXIS_TICK} />
        <ReferenceLine x={0} stroke={COLORS.ink} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v > 0 ? '+' : ''}${v} points`, 'Gap vs expected']} />
        <Bar dataKey="gap" radius={6} animationDuration={900}>
          {data.map((r) => (
            <Cell key={r.year_level_id} fill={r.gap < -10 ? COLORS.bad : r.gap < 0 ? COLORS.warn : COLORS.good} />
          ))}
          <LabelList dataKey="gap" position="right" className="dean-viz-label" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Year level × completion-decile heatmap (how many students sit at each completion level). */
export function CompletionHeatmap({ rows }) {
  const data = rows.filter((r) => r.students > 0);
  if (!data.length) return <EmptyChart />;
  const max = Math.max(1, ...data.flatMap((r) => r.completion_deciles || []));
  return (
    <div className="dean-heatmap">
      <div className="dean-heatmap__row dean-heatmap__row--head">
        <span />
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i}>{i * 10}%</span>
        ))}
      </div>
      {data.map((r) => (
        <div className="dean-heatmap__row" key={r.year_level_id}>
          <span className="dean-heatmap__label">{r.label}</span>
          {(r.completion_deciles || []).map((n, i) => {
            const alpha = n > 0 ? 0.12 + (n / max) * 0.88 : 0;
            const expectedHere =
              r.expected_by_now != null && Math.min(9, Math.floor(r.expected_by_now / 10)) === i;
            return (
              <span
                key={i}
                className={`dean-heatmap__cell${expectedHere ? ' dean-heatmap__cell--expected' : ''}`}
                style={{ backgroundColor: `rgba(46, 125, 50, ${alpha})`, color: alpha > 0.55 ? '#fff' : '#0f172a' }}
                title={`${r.label}: ${n} student${n === 1 ? '' : 's'} at ${i * 10}–${i * 10 + 9}% complete${
                  expectedHere ? ' (expected level)' : ''
                }`}
              >
                {n || ''}
              </span>
            );
          })}
        </div>
      ))}
      <p className="dean-heatmap__legend">
        Darker = more students. Outlined cell = where students are expected to be by now.
      </p>
    </div>
  );
}

export function AvgUnitsChart({ rows }) {
  const data = rows.filter((r) => r.cap != null);
  if (!data.length || data.every((r) => r.avg_units == null)) return <EmptyChart text="No saved load plans yet." />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={COLORS.grid} />
        <XAxis dataKey="label" tick={AXIS_TICK} />
        <YAxis tick={AXIS_TICK} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v == null ? '—' : `${v} units`, n]} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="avg_units" name="Average planned units" barSize={48} radius={[10, 10, 0, 0]} fill={COLORS.info}>
          <LabelList dataKey="avg_units" position="top" className="dean-viz-label" />
        </Bar>
        <Line
          type="stepAfter"
          dataKey="cap"
          name="Unit cap"
          stroke={COLORS.bad}
          strokeWidth={2.5}
          strokeDasharray="6 4"
          dot={{ r: 5, fill: COLORS.bad }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function RankedBarChart({ data, valueKey = 'count', labelKey = 'code', color = COLORS.violet, valueLabel = 'Students' }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 30 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 36, left: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} stroke={COLORS.grid} />
        <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey={labelKey}
          width={96}
          tick={AXIS_TICK}
          interval={0}
          tickFormatter={(v) => truncate(v)}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: 'rgba(148,163,184,0.12)' }}
          formatter={(v) => [v, valueLabel]}
          labelFormatter={(_, p) => {
            const d = p?.[0]?.payload;
            return d ? [d[labelKey], d.name].filter(Boolean).join(' – ') : '';
          }}
        />
        <Bar dataKey={valueKey} fill={color} radius={[0, 8, 8, 0]} animationDuration={900}>
          <LabelList dataKey={valueKey} position="right" className="dean-viz-label" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
