/**
 * CDO College–style conversion: numerical grade (1.00–5.00) ↔ percentage band.
 * Two scales: standard (50% passing) and PS-60 (60% passing), chosen from curriculum passing_grade.
 */

const PS50_BANDS = {
  1: { min: 94.8, max: 100 },
  1.25: { min: 89.2, max: 94.7 },
  1.5: { min: 83.6, max: 89.1 },
  1.75: { min: 78.0, max: 83.5 },
  2: { min: 72.4, max: 77.9 },
  2.25: { min: 66.8, max: 72.3 },
  2.5: { min: 61.2, max: 66.7 },
  2.75: { min: 55.6, max: 61.1 },
  3: { min: 50.0, max: 55.5 },
  5: { min: 0.0, max: 49.9 },
};

const PS60_BANDS = {
  1: { min: 96.0, max: 100 },
  1.25: { min: 91.5, max: 95.9 },
  1.5: { min: 87.0, max: 91.4 },
  1.75: { min: 82.5, max: 86.9 },
  2: { min: 78.0, max: 82.4 },
  2.25: { min: 73.5, max: 77.9 },
  2.5: { min: 69.0, max: 73.4 },
  2.75: { min: 64.5, max: 68.9 },
  3: { min: 60.0, max: 64.4 },
  5: { min: 0.0, max: 59.9 },
};

const PASS_KEYS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];

/**
 * @param {unknown} passingGrade — e.g. 50, "50", "60%"
 * @returns {boolean} true → PS-60 table (60% passing subjects)
 */
export function passingGradeUsesPs60(passingGrade) {
  const n = parseFloat(String(passingGrade ?? '').replace(/%/g, '').trim());
  if (!Number.isFinite(n)) return false;
  return n >= 60;
}

function snapToBandKey(g) {
  if (!Number.isFinite(g)) return null;
  if (g < 0) return null;
  if (g > 3 + 1e-6) return 5;
  const step = 0.25;
  let snapped = Math.round((g - 1) / step) * step + 1;
  if (snapped < 1) snapped = 1;
  if (snapped > 3) snapped = 3;
  return snapped;
}

/**
 * @param {string|number} gradeRaw — evaluation grade
 * @param {boolean} usePs60
 * @returns {{ label: string, approxPercent: number, min: number, max: number, scaleLabel: string, tableGrade: string } | null}
 */
export function numericalGradeToPercentInfo(gradeRaw, usePs60) {
  const str = String(gradeRaw ?? '').trim();
  if (!str) return null;
  const g = parseFloat(str.replace(',', '.'));
  if (!Number.isFinite(g)) return null;
  if (g > 5.01 || g < 0) return null;
  if (g < 1 - 1e-6) return null;
  if (/^[a-z]+$/i.test(str) && str.length <= 4) return null;

  const bands = usePs60 ? PS60_BANDS : PS50_BANDS;
  const scaleLabel = usePs60 ? '60% passing (PS-60)' : '50% passing (standard)';

  const key = snapToBandKey(g);
  if (key == null) return null;
  const band = bands[key];
  if (!band) return null;

  const mid = (band.min + band.max) / 2;
  const approxPercent = Math.round(mid);
  const label =
    band.min === band.max
      ? `${approxPercent}%`
      : `${approxPercent}% (about ${formatPctBoundary(band.min)}–${formatPctBoundary(band.max)}%)`;

  return {
    label,
    approxPercent,
    min: band.min,
    max: band.max,
    scaleLabel,
    tableGrade: key === 5 ? '5.00' : Number(key).toFixed(2),
  };
}

export function formatPctBoundary(x) {
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

/** Shown as the main “score” (evaluator uses 0–100 / 50–100). */
function formatPercentDisplay(g) {
  const n = Number(g);
  if (!Number.isFinite(n)) return String(g);
  const r = Math.round(n);
  if (Math.abs(n - r) < 0.05) return String(r);
  const t = n.toFixed(1);
  return t.endsWith('.0') ? String(Math.round(n)) : t;
}

function formatGradePointKey(k) {
  if (k === 5) return '5.00';
  const s = Number(k).toFixed(2);
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/**
 * Map a percentage to the table row (1.00, 1.25, …, 3.00, 5.00) that contains it.
 * @param {number} percent
 * @param {boolean} usePs60
 * @returns {number|null} band key
 */
export function percentToNumericalGradeKey(percent, usePs60) {
  const p = Number(percent);
  if (!Number.isFinite(p)) return null;
  const bands = usePs60 ? PS60_BANDS : PS50_BANDS;
  const order = [...PASS_KEYS, 5];
  for (const k of order) {
    const b = bands[k];
    if (p + 1e-9 >= b.min && p - 1e-9 <= b.max) return k;
  }
  return null;
}

/**
 * Student + evaluator UI: primary label is percentage; optional secondary is 1.00–5.00.
 * @returns {{ primaryText: string, secondaryGp: string|null, isLetter: boolean, scaleLabel?: string, bandMin?: number, bandMax?: number } | null}
 */
export function getGradeDisplayParts(gradeRaw, passingGrade) {
  const usePs60 = passingGradeUsesPs60(passingGrade);
  const str = String(gradeRaw ?? '').trim();
  if (!str) return null;

  const hasDigit = /\d/.test(str);
  const g = parseFloat(str.replace(',', '.'));
  if (!hasDigit || !Number.isFinite(g)) {
    return { primaryText: str, secondaryGp: null, isLetter: true };
  }

  const scaleShort = usePs60 ? 'PS-60 (60% passing)' : 'Standard (50% passing)';

  if (g > 5.01 || g >= 50) {
    const gpKey = percentToNumericalGradeKey(g, usePs60);
    const secondaryGp = gpKey != null ? formatGradePointKey(gpKey) : null;
    return {
      primaryText: formatPercentDisplay(g),
      secondaryGp,
      isLetter: false,
      scaleLabel: scaleShort,
    };
  }

  if (g < 1 - 1e-6) {
    return {
      primaryText: formatPercentDisplay(g),
      secondaryGp: null,
      isLetter: false,
      scaleLabel: scaleShort,
    };
  }

  const pctInfo = numericalGradeToPercentInfo(g, usePs60);
  if (!pctInfo) {
    return { primaryText: str, secondaryGp: null, isLetter: false };
  }
  const mid = (pctInfo.min + pctInfo.max) / 2;
  return {
    primaryText: formatPercentDisplay(mid),
    secondaryGp: pctInfo.tableGrade,
    isLetter: false,
    scaleLabel: pctInfo.scaleLabel,
    bandMin: pctInfo.min,
    bandMax: pctInfo.max,
  };
}

/**
 * Evaluator form: show/stored as 0–100; map legacy 1.25-style DB values for the input.
 */
export function gradeRawToEvaluatorFormValue(gradeRaw, passingGrade) {
  if (gradeRaw === '' || gradeRaw == null) return '';
  const parts = getGradeDisplayParts(gradeRaw, passingGrade);
  if (!parts) return String(gradeRaw).trim();
  if (parts.isLetter) return String(gradeRaw).trim();
  return String(parts.primaryText);
}

/**
 * True when draft grade matches saved (treats 1.25 vs ~92 as same after canonicalization).
 */
export function evaluatorGradesEquivalent(a, b, passingGrade) {
  const ca = canonicalEvaluatorGradeForCompare(a, passingGrade);
  const cb = canonicalEvaluatorGradeForCompare(b, passingGrade);
  return ca === cb;
}

function canonicalEvaluatorGradeForCompare(gradeRaw, passingGrade) {
  if (gradeRaw === '' || gradeRaw == null) return '';
  const str = String(gradeRaw).trim();
  if (!str) return '';
  const parts = getGradeDisplayParts(str, passingGrade);
  if (!parts || parts.isLetter) {
    const n = parseFloat(str.replace(',', '.'));
    if (!Number.isNaN(n)) return String(Math.round(n * 1000) / 1000);
    return str.toLowerCase();
  }
  const n = parseFloat(String(parts.primaryText).replace(',', '.'));
  if (!Number.isFinite(n)) return str.toLowerCase();
  return String(Math.round(n * 10) / 10);
}

export function getPs50Rows() {
  return rowsFromBands(PS50_BANDS);
}

export function getPs60Rows() {
  return rowsFromBands(PS60_BANDS);
}

function rowsFromBands(bands) {
  const order = [...PASS_KEYS, 5];
  return order.map((k) => {
    const b = bands[k];
    const remark =
      k === 3 ? 'Passing grade' : k === 5 ? 'Failing grade' : '—';
    return {
      grade: k === 5 ? '5.00' : Number(k).toFixed(2),
      pct: `${formatPctBoundary(b.min)} – ${formatPctBoundary(b.max)}`,
      remark,
    };
  });
}
