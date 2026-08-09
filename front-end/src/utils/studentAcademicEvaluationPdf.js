import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getStudentCurriculumOutcomeDisplay } from './gradePercentageConversion';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Include in PDF only rows with a recorded grade, credit, or final status (excludes ongoing / blank). */
export function evaluationRowIsGraded(r) {
  if (!r || typeof r !== 'object') return false;
  if (r.passed_via_transfer_credit === true) return true;
  if (Number(r.units_earned) > 0) return true;
  const g = r.grade;
  if (g != null && String(g).trim() !== '') return true;
  const st = String(r.status || '')
    .toLowerCase()
    .trim();
  if (st === '' || st === 'ongoing') return false;
  if (
    [
      'passed',
      'pass',
      'failed',
      'fail',
      'f',
      'inc',
      'incomplete',
      'credit',
      'completed',
    ].includes(st)
  ) {
    return true;
  }
  if (st === 'not passed' || st.includes('fail')) return true;
  return false;
}

export function semesterGroupKey(g) {
  return `${g.year_level_id ?? '—'}|${g.semester_id ?? '—'}`;
}

function groupGradedRowsBySemester(gradedRows) {
  const map = new Map();
  for (const r of gradedRows) {
    const yId = r.year_level_id ?? '—';
    const sId = r.semester_id ?? '—';
    const key = `${yId}|${sId}`;
    if (!map.has(key)) {
      map.set(key, {
        year_level_id: r.year_level_id,
        semester_id: r.semester_id,
        year_level_name: r.year_level_name || String(r.year_level_id ?? ''),
        semester_name: r.semester_name || String(r.semester_id ?? ''),
        rows: [],
      });
    }
    map.get(key).rows.push(r);
  }
  return [...map.values()].sort((a, b) => {
    const ay = Number(a.year_level_id ?? 0);
    const by = Number(b.year_level_id ?? 0);
    if (ay !== by) return ay - by;
    return Number(a.semester_id ?? 0) - Number(b.semester_id ?? 0);
  });
}

/** Default PDF selection: lowest year level, first two semesters (e.g. 1st year 1st + 2nd). */
export function defaultEvalPdfSelectionKeys(opts) {
  if (!opts.length) return [];
  const finiteYears = opts
    .map((o) => Number(o.year_level_id))
    .filter((n) => Number.isFinite(n));
  if (finiteYears.length === 0) return opts.slice(0, 2).map((o) => o.key);
  const minY = Math.min(...finiteYears);
  const firstYear = opts.filter((o) => Number(o.year_level_id) === minY);
  const keys = firstYear.slice(0, 2).map((o) => o.key);
  return keys.length ? keys : opts.map((o) => o.key);
}

export function firstYearFirstSemKeys(opts) {
  if (!opts.length) return [];
  const finiteYears = opts
    .map((o) => Number(o.year_level_id))
    .filter((n) => Number.isFinite(n));
  if (finiteYears.length === 0) return [opts[0].key];
  const minY = Math.min(...finiteYears);
  const firstYear = opts.filter((o) => Number(o.year_level_id) === minY);
  return firstYear[0] ? [firstYear[0].key] : [opts[0].key];
}

export function firstYearFirstTwoSemKeys(opts) {
  if (!opts.length) return [];
  const finiteYears = opts
    .map((o) => Number(o.year_level_id))
    .filter((n) => Number.isFinite(n));
  if (finiteYears.length === 0) return opts.slice(0, 2).map((o) => o.key);
  const minY = Math.min(...finiteYears);
  return opts
    .filter((o) => Number(o.year_level_id) === minY)
    .slice(0, 2)
    .map((o) => o.key);
}

/** UI + PDF labels for each graded term (sorted). */
export function getGradedSemesterOptionsFromPayload(data) {
  const gradedRows = (data?.rows || []).filter(evaluationRowIsGraded);
  const groups = groupGradedRowsBySemester(gradedRows);
  return groups.map((g) => {
    const yRaw =
      (g.year_level_name || '').toString().trim() ||
      (g.year_level_id != null && g.year_level_id !== '' ? `Year ${g.year_level_id}` : 'Year');
    const sRaw =
      (g.semester_name || '').toString().trim() ||
      (g.semester_id != null && g.semester_id !== '' ? `Semester ${g.semester_id}` : 'Semester');
    return {
      key: semesterGroupKey(g),
      label: `${yRaw} — ${sRaw}`,
      year_level_id: g.year_level_id,
      semester_id: g.semester_id,
      rowCount: g.rows.length,
    };
  });
}

function semesterSectionTitle(g) {
  const yRaw =
    (g.year_level_name || '').toString().trim() ||
    (g.year_level_id != null && g.year_level_id !== '' ? `Year ${g.year_level_id}` : 'Year');
  const sRaw =
    (g.semester_name || '').toString().trim() ||
    (g.semester_id != null && g.semester_id !== '' ? `Semester ${g.semester_id}` : 'Semester');
  return esc(`${yRaw.toUpperCase()} — ${sRaw.toUpperCase()}`);
}

/**
 * Fetches the logged-in student's academic evaluation payload (same as /evaluation/student/:id).
 * @param {import('axios').AxiosInstance} apiClient
 */
export async function fetchStudentEvaluationPayload(apiClient) {
  const prof = await apiClient.get('/students/profile');
  const idNum =
    prof.data?.student_id_number ||
    prof.data?.student_number ||
    prof.data?.Student_Id_Number;
  if (!idNum) {
    throw new Error('Your profile has no student ID number.');
  }
  const res = await apiClient.get(
    `/evaluation/student/${encodeURIComponent(String(idNum))}`
  );
  return res.data;
}

/**
 * @param {object} data
 * @param {{ semesterKeys?: string[] | null, compact?: boolean }} renderOpts
 *   - semesterKeys: if null/undefined, include all graded terms; if [], none; else filter
 */
function fillReportElement(el, data, renderOpts = {}) {
  const { semesterKeys = null, compact = false } = renderOpts;
  const student = data?.student;
  const summary = data?.summary || {};
  const rows = data?.rows || [];
  const computedStatus = data?.computed_academic_status;
  const statusReasons = data?.academic_status_reasons || [];

  const name =
    student?.full_name ||
    [student?.last_name, student?.first_name].filter(Boolean).join(', ') ||
    '—';

  const fs = compact ? '9px' : '12px';
  const fsSmall = compact ? '8px' : '10px';
  const fsH = compact ? '13px' : '16px';
  const pad = compact ? '4px 6px' : '7px 8px';
  const padHead = compact ? '6px 8px' : '10px 12px';
  const maxW = compact ? '1050px' : '800px';
  const mbBlock = compact ? '10px' : '18px';

  const reasonHtml =
    statusReasons.length > 0
      ? `<p style="margin:6px 0;font-size:${fsSmall};color:#444;"><strong>Note:</strong> ${esc(statusReasons.join(' '))}</p>`
      : '';

  const computedHtml =
    computedStatus != null && computedStatus !== ''
      ? `<div style="font-size:${fs};"><strong>Computed status (sequence):</strong> ${esc(computedStatus)}</div>`
      : '';

  const gradedRows = rows.filter(evaluationRowIsGraded);
  let semesterGroups = groupGradedRowsBySemester(gradedRows);

  if (semesterKeys != null) {
    const set = new Set(semesterKeys);
    semesterGroups = semesterGroups.filter((g) => set.has(semesterGroupKey(g)));
  }

  const semesterBlocksHtml =
    semesterGroups.length === 0
      ? `<div style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:${fs};color:#475569;">
          No graded courses for the selected term(s). Choose different semesters or ensure grades are saved.
        </div>`
      : semesterGroups
          .map((g) => {
            const body = g.rows
              .map(
                (r) =>
                  `<tr style="background:#f8fff9;">
            <td style="padding:${pad};border:1px solid #cfe8d8;font-weight:600;color:#1e40af;font-size:${fs};">${esc(r.subject_code || '—')}</td>
            <td style="padding:${pad};border:1px solid #cfe8d8;font-size:${fs};">${esc(r.subject_name || '—')}</td>
            <td style="padding:${pad};border:1px solid #cfe8d8;text-align:center;font-size:${fs};">${esc(r.units ?? '—')}</td>
            <td style="padding:${pad};border:1px solid #cfe8d8;text-align:center;font-size:${fs};">${
              (() => {
                const outcome = getStudentCurriculumOutcomeDisplay(
                  r,
                  { evaluation_status: r.status, status: r.status, grade: r.grade },
                  Number(r.units_earned) > 0
                );
                if (outcome?.label === 'Complete') return esc('—');
                return esc(
                  r.grade != null && String(r.grade).trim() !== '' ? r.grade : '—'
                );
              })()
            }</td>
            <td style="padding:${pad};border:1px solid #cfe8d8;font-size:${fs};">${esc(
              (() => {
                if (r.passed_via_transfer_credit) return 'Credit (transfer)';
                const outcome = getStudentCurriculumOutcomeDisplay(
                  r,
                  { evaluation_status: r.status, status: r.status, grade: r.grade },
                  Number(r.units_earned) > 0
                );
                if (outcome) return outcome.label;
                return r.status || (Number(r.units_earned) > 0 ? 'Passed' : '—');
              })()
            )}</td>
          </tr>`
              )
              .join('');
            return `
        <div style="margin-bottom:${mbBlock};border:1px solid #86c5a8;border-radius:8px;overflow:hidden;">
          <div style="background:linear-gradient(90deg,#d1e7dd,#e8f5ee);color:#0f5132;padding:${padHead};font-weight:700;font-size:${compact ? '10px' : '12px'};border-bottom:1px solid #a3cfbb;">
            ${semesterSectionTitle(g)}
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:${fs};">
            <thead>
              <tr style="background:#eef6f1;">
                <th style="padding:${pad};border:1px solid #cfe8d8;text-align:left;">Code</th>
                <th style="padding:${pad};border:1px solid #cfe8d8;text-align:left;">Subject</th>
                <th style="padding:${pad};border:1px solid #cfe8d8;text-align:center;">Units</th>
                <th style="padding:${pad};border:1px solid #cfe8d8;text-align:center;">Grade</th>
                <th style="padding:${pad};border:1px solid #cfe8d8;text-align:left;">Status</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>`;
          })
          .join('');

  el.innerHTML = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:${fs};color:#111;background:#fff;padding:${compact ? '8px' : '12px'};max-width:${maxW};">
      <h1 style="font-size:${fsH};margin:0 0 8px;">Academic evaluation report</h1>
      <div style="margin-bottom:8px;line-height:1.4;font-size:${fs};">
        <div><strong>Student:</strong> ${esc(name)}</div>
        <div><strong>ID:</strong> ${esc(student?.student_id_number || student?.student_number || '—')}</div>
        <div><strong>Program:</strong> ${esc(student?.program?.program_name || '—')}</div>
        <div><strong>Record academic status:</strong> ${esc(student?.academic_status || '—')}</div>
        ${computedHtml}
      </div>
      ${reasonHtml}
      <div style="display:flex;flex-wrap:wrap;gap:8px 16px;margin-bottom:8px;font-size:${fsSmall};">
        <span>Curriculum units: <strong>${esc(summary.total_units_in_curriculum ?? '—')}</strong></span>
        <span>Earned units: <strong>${esc(summary.total_units_earned ?? '—')}</strong></span>
        <span>Remaining (units): <strong>${esc(summary.lacking_units ?? '—')}</strong></span>
      </div>
      <p style="margin:0 0 8px;font-size:${fsSmall};color:#64748b;">
        <strong>Selected graded term(s) only.</strong> Ongoing or unevaluated subjects are omitted.
      </p>
      ${semesterBlocksHtml}
      <p style="margin-top:10px;font-size:${fsSmall};color:#666;">Generated from the student information system.</p>
    </div>
  `;
}

/**
 * @param {import('axios').AxiosInstance} apiClient
 * @param {{
 *   semesterKeys?: string[] | null,
 *   data?: object,
 *   fitSinglePage?: boolean,
 * }=} options
 */
export async function downloadStudentAcademicEvaluationPdf(apiClient, options = {}) {
  const { semesterKeys = null, data: providedData } = options;
  const data = providedData ?? (await fetchStudentEvaluationPayload(apiClient));

  const gradedGroups = groupGradedRowsBySemester(
    (data?.rows || []).filter(evaluationRowIsGraded)
  );
  let activeCount = gradedGroups.length;
  if (semesterKeys != null) {
    const set = new Set(semesterKeys);
    activeCount = gradedGroups.filter((g) => set.has(semesterGroupKey(g))).length;
  }
  const compact = activeCount <= 2;
  const fitSinglePage =
    options.fitSinglePage !== undefined ? options.fitSinglePage : activeCount <= 2;

  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'fixed',
    left: '-12000px',
    top: '0',
    width: compact ? '1080px' : '820px',
    background: '#fff',
  });
  fillReportElement(el, data, { semesterKeys, compact });
  document.body.appendChild(el);

  try {
    const canvas = await html2canvas(el, {
      scale: compact ? 2 : 2,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');
    const useLandscape = compact || fitSinglePage;
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: useLandscape ? 'landscape' : 'portrait',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    let imgWidth = pdfWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (fitSinglePage && imgHeight > pdfHeight) {
      imgHeight = pdfHeight;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
      const x = (pdfWidth - imgWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage(undefined, useLandscape ? 'landscape' : 'portrait');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
    }

    const st = data?.student;
    const rawId = st?.student_id_number || st?.student_number || 'student';
    const safeId = String(rawId).replace(/[^a-zA-Z0-9-_]/g, '_');
    pdf.save(`academic-evaluation-report-${safeId}.pdf`);
  } finally {
    document.body.removeChild(el);
  }
}
