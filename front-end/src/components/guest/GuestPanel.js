import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { swalError } from '../../utils/swal';
import './GuestPanel.css';

const INSTITUTION_NAME =
  process.env.REACT_APP_INSTITUTION_NAME || 'Cagayan de Oro College — PHINMA Education';

/** @returns {string|number|null} */
function getYearLevelId(row) {
  const rel = row.yearLevel ?? row.year_level;
  if (rel != null && typeof rel === 'object') return rel.year_level_id ?? null;
  return row.year_level ?? null;
}

/** @returns {string|number|null} */
function getSemesterId(row) {
  const rel = row.semester;
  if (rel != null && typeof rel === 'object') return rel.semester_id ?? null;
  return row.semester_id ?? null;
}

function curriculumHeaderLabel(row) {
  const h = row.curriculumHeader ?? row.curriculum_header;
  if (!h) {
    return row.curriculum_header_id != null ? `Curriculum #${row.curriculum_header_id}` : '—';
  }
  return h.Effective_Year || h.description || h.effective_year || `Curriculum #${row.curriculum_header_id}`;
}

function electiveSlot(row) {
  return row.electiveSlot || row.elective_slot;
}

/** Curriculum row tied to an elective slot (not a single fixed subject). */
function isElectiveSlotRow(row) {
  return row.elective_slot_id != null && row.elective_slot_id !== '';
}

function getPenCodes(row) {
  if (row.subject?.subject_code) return row.subject.subject_code;
  const slot = electiveSlot(row);
  const subs = slot?.electiveSubjects || slot?.elective_subjects;
  if (Array.isArray(subs) && subs.length > 0) {
    const codes = subs.map((es) => es.subject?.subject_code).filter(Boolean);
    if (codes.length) return codes.join(' / ');
  }
  if (row.elective_slot_id) return `Elective slot #${row.elective_slot_id}`;
  return '—';
}

function getPenCodeParts(row) {
  const raw = getPenCodes(row);
  if (raw === '—') return [];
  return raw.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
}

/** Pen code column: hide individual codes for electives (show placeholder only). */
function getPenCodePartsForDisplay(row) {
  if (isElectiveSlotRow(row)) return [];
  return getPenCodeParts(row);
}

function getTitle(row) {
  if (row.subject?.subject_name) return row.subject.subject_name;
  const slot = electiveSlot(row);
  if (slot?.slot_name) return slot.slot_name;
  return '—';
}

/** Title column: electives show only the word "Elective". */
function getDisplayTitle(row) {
  if (isElectiveSlotRow(row)) return 'Elective';
  return getTitle(row);
}

function getUnits(row) {
  if (row.subject?.number_of_units != null) return row.subject.number_of_units;
  const slot = electiveSlot(row);
  const subs = slot?.electiveSubjects || slot?.elective_subjects;
  if (Array.isArray(subs) && subs[0]?.subject?.number_of_units != null) {
    return subs[0].subject.number_of_units;
  }
  return '—';
}

function lookupYearLabel(yearId, yearLevels) {
  if (yearId == null || yearId === '') return 'Unknown year';
  const y = yearLevels.find((yl) => String(yl.year_level_id) === String(yearId));
  return y?.year_level || `Year (${yearId})`;
}

function lookupSemesterLabel(semId, semesters) {
  if (semId == null || semId === '') return 'Unknown semester';
  const s = semesters.find((sem) => String(sem.semester_id) === String(semId));
  return s?.semester_name || `Semester (${semId})`;
}

function orderInList(list, id, idField) {
  if (id == null || id === '') return 100000;
  const i = list.findIndex((x) => String(x[idField]) === String(id));
  return i === -1 ? Number(id) || 99999 : i;
}

/**
 * Public curriculum simulation: filter catalog, mark rows as passed, export PDF.
 */
const GuestPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef(null);
  const [curriculum, setCurriculum] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [programFilter, setProgramFilter] = useState('');
  const [headerFilter, setHeaderFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [remarks, setRemarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schools, setSchools] = useState([]);
  const [simSchoolId, setSimSchoolId] = useState('');
  const [codesText, setCodesText] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResults, setSimResults] = useState(null);
  const [simError, setSimError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [curRes, lookRes, schoolsRes] = await Promise.all([
          api.get('/curriculum'),
          api.get('/curriculum/lookup/data'),
          api.get('/schools').catch(() => ({ data: [] })),
        ]);
        setCurriculum(Array.isArray(curRes.data) ? curRes.data : []);
        const p = lookRes.data?.programs || [];
        setPrograms(p);
        if (p.length >= 1) setProgramFilter(String(p[0].program_id));
        setYearLevels(lookRes.data?.yearLevels || lookRes.data?.year_levels || []);
        setSemesters(lookRes.data?.semesters || []);
        const sl = schoolsRes.data;
        setSchools(Array.isArray(sl) ? sl : []);
      } catch (e) {
        const msg = e.response?.data?.message || 'Could not load curriculum.';
        setError(msg);
        setCurriculum([]);
        await swalError('Could not load data', msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const headerOptions = useMemo(() => {
    const map = new Map();
    curriculum.forEach((row) => {
      if (programFilter && String(row.program_id) !== String(programFilter)) return;
      const hid = row.curriculum_header_id;
      if (hid == null) return;
      if (!map.has(hid)) {
        map.set(hid, curriculumHeaderLabel(row));
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id: String(id), label }));
  }, [curriculum, programFilter]);

  const filteredRows = useMemo(() => {
    return curriculum.filter((row) => {
      if (programFilter && String(row.program_id) !== String(programFilter)) return false;
      if (headerFilter && String(row.curriculum_header_id ?? '') !== headerFilter) return false;
      if (yearFilter && String(getYearLevelId(row) ?? '') !== yearFilter) return false;
      if (semesterFilter && String(getSemesterId(row) ?? '') !== semesterFilter) return false;
      return true;
    });
  }, [curriculum, programFilter, headerFilter, yearFilter, semesterFilter]);

  /** One block per year level + semester (e.g. 1st Year — First Semester). */
  const groupedSections = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      const yid = getYearLevelId(row);
      const sid = getSemesterId(row);
      const key = `${yid ?? '∅'}|${sid ?? '∅'}`;
      if (!map.has(key)) {
        map.set(key, { yearId: yid, semId: sid, rows: [] });
      }
      map.get(key).rows.push(row);
    });

    const keys = [...map.keys()].sort((ka, kb) => {
      const a = map.get(ka);
      const b = map.get(kb);
      const yOrder =
        orderInList(yearLevels, a.yearId, 'year_level_id') -
        orderInList(yearLevels, b.yearId, 'year_level_id');
      if (yOrder !== 0) return yOrder;
      return (
        orderInList(semesters, a.semId, 'semester_id') -
        orderInList(semesters, b.semId, 'semester_id')
      );
    });

    return keys.map((key) => {
      const g = map.get(key);
      const rows = [...g.rows].sort((r1, r2) => {
        const e1 = isElectiveSlotRow(r1);
        const e2 = isElectiveSlotRow(r2);
        if (e1 !== e2) return e1 ? 1 : -1;
        if (e1) {
          return Number(r1.elective_slot_id) - Number(r2.elective_slot_id);
        }
        return String(getPenCodes(r1)).localeCompare(String(getPenCodes(r2)));
      });
      const yLabel = lookupYearLabel(g.yearId, yearLevels);
      const sLabel = lookupSemesterLabel(g.semId, semesters);
      return {
        key,
        title: `${yLabel} — ${sLabel}`,
        rows,
      };
    });
  }, [filteredRows, yearLevels, semesters]);

  const passedUnitsTotal = useMemo(() => {
    let sum = 0;
    filteredRows.forEach((row) => {
      const id = row.curriculum_id;
      if (remarks[id] !== 'passed') return;
      const u = getUnits(row);
      if (u === '—' || u === '') return;
      const n = typeof u === 'number' ? u : Number(String(u).replace(/,/g, ''));
      if (!Number.isNaN(n)) sum += n;
    });
    return sum;
  }, [filteredRows, remarks]);

  const setRemark = useCallback((curriculumId, value) => {
    setRemarks((prev) => ({ ...prev, [curriculumId]: value }));
  }, []);

  const handleSimulate = async (e) => {
    e.preventDefault();
    setSimError('');
    setSimResults(null);
    const lines = codesText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setSimError('Enter at least one external course code (one per line).');
      return;
    }
    setSimLoading(true);
    try {
      const body = {
        courses: lines.map((subject_code) => ({ subject_code })),
      };
      if (simSchoolId) {
        body.school_id = parseInt(simSchoolId, 10);
      }
      const res = await api.post('/guest/credit-simulation', body);
      setSimResults(res.data?.results || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Simulation failed';
      setSimError(msg);
      await swalError('Simulation failed', msg);
    } finally {
      setSimLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save('curriculum-simulation.pdf');
    } catch (e) {
      await swalError('Could not create PDF', e?.message || 'Unknown error');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const selectedHeaderLabel =
    headerOptions.find((h) => h.id === headerFilter)?.label ||
    (headerFilter ? `A.Y. ${headerFilter}` : 'All');

  return (
    <div className="guest-sim-page">
      <header className="guest-sim-topbar">
        <div className="guest-sim-brand">
          <span className="guest-sim-logo-mark" aria-hidden="true" />
          <span className="guest-sim-institution">{INSTITUTION_NAME}</span>
        </div>
        <div className="guest-sim-topbar-actions">
          <button type="button" className="guest-sim-back" onClick={() => navigate('/login')}>
            <span className="guest-sim-back-icon" aria-hidden="true">
              ←
            </span>
            Back to Login
          </button>
          <span className="guest-sim-page-badge">Curriculum Simulation</span>
        </div>
      </header>

      <div className="guest-sim-user-row">
        {user ? (
          <>
            <span className="guest-user-email">{user.email}</span>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <button type="button" className="guest-nav-btn" onClick={() => navigate('/')}>
              Home
            </button>
            <button type="button" className="guest-nav-btn guest-nav-btn-primary" onClick={() => navigate('/login')}>
              Login
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="guest-loading">Loading…</p>
      ) : (
        <>
          {error && <div className="guest-error">{error}</div>}

          <div ref={printRef} className="guest-sim-print-wrap">
            <div className="guest-sim-filters">
              <div className="guest-sim-filter-grid" role="group" aria-label="Filter curriculum">
                <label className="guest-sim-field">
                  <span className="guest-sim-field-label">
                    <span className="guest-sim-icon guest-sim-icon-calendar" /> Curriculum
                  </span>
                  <select
                    value={headerFilter}
                    onChange={(e) => setHeaderFilter(e.target.value)}
                    className="guest-sim-input"
                  >
                    <option value="">All curricula</option>
                    {headerOptions.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="guest-sim-field">
                  <span className="guest-sim-field-label">
                    <span className="guest-sim-icon guest-sim-icon-screen" /> Program
                  </span>
                  <select
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                    className="guest-sim-input"
                  >
                    <option value="">All programs</option>
                    {programs.map((p) => (
                      <option key={p.program_id} value={p.program_id}>
                        {p.program_code || p.program_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="guest-sim-field">
                  <span className="guest-sim-field-label">
                    <span className="guest-sim-icon guest-sim-icon-screen" /> Year
                  </span>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="guest-sim-input"
                  >
                    <option value="">All years</option>
                    {yearLevels.map((y) => (
                      <option key={y.year_level_id} value={String(y.year_level_id)}>
                        {y.year_level}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="guest-sim-field">
                  <span className="guest-sim-field-label">
                    <span className="guest-sim-icon guest-sim-icon-screen" /> Semester
                  </span>
                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="guest-sim-input"
                  >
                    <option value="">All semesters</option>
                    {semesters.map((s) => (
                      <option key={s.semester_id} value={String(s.semester_id)}>
                        {s.semester_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="guest-sim-pdf-wrap">
                <button
                  id="pdf-export"
                  type="button"
                  className="guest-sim-pdf-btn"
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading || groupedSections.length === 0}
                >
                  {pdfLoading ? 'Preparing…' : 'Download as PDF'}
                </button>
              </div>
            </div>

            <div className="guest-sim-summary guest-sim-summary-bar">
              <p className="guest-sim-summary-text">
                Mark courses you have already passed.{' '}
                <span className="guest-sim-summary-label">Passed units (this view)</span>
              </p>
              <span className="guest-sim-summary-pill" aria-live="polite">
                {passedUnitsTotal.toFixed(1)}
              </span>
            </div>

            <div className="guest-sim-table-card">
              <div className="guest-sim-table-head">
                <span className="guest-sim-table-head-title">Curriculum simulation</span>
                <span className="guest-sim-table-head-sep">—</span>
                <span className="guest-sim-table-head-sub">{selectedHeaderLabel}</span>
              </div>
              <div className="guest-sim-sections-body">
                {groupedSections.length === 0 ? (
                  <div className="guest-sim-empty">No courses match the selected filters.</div>
                ) : (
                  groupedSections.map((section, secIdx) => (
                    <section
                      key={section.key}
                      className="guest-sim-section-card"
                      aria-labelledby={`guest-section-h-${secIdx}`}
                    >
                      <h3 className="guest-sim-section-heading" id={`guest-section-h-${secIdx}`}>
                        {section.title}
                      </h3>
                      <div className="guest-sim-mini-scroll">
                        <table className="guest-sim-mini-table">
                          <colgroup>
                            <col className="guest-col-pen" />
                            <col className="guest-col-title" />
                            <col className="guest-col-units" />
                            <col className="guest-col-remarks" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th scope="col">Pen Code</th>
                              <th scope="col">Descriptive Title</th>
                              <th scope="col">Units</th>
                              <th scope="col">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.rows.map((row) => {
                              const id = row.curriculum_id;
                              const parts = getPenCodePartsForDisplay(row);
                              const val = remarks[id] || '';
                              return (
                                <tr key={id}>
                                  <td className="guest-td-pen">
                                    <div className="guest-code-pills">
                                      {parts.length === 0 ? (
                                        <span className="guest-code-pill guest-code-pill--empty">—</span>
                                      ) : (
                                        parts.map((code, pi) => (
                                          <span key={`${id}-code-${pi}`} className="guest-code-pill">
                                            {code}
                                          </span>
                                        ))
                                      )}
                                    </div>
                                  </td>
                                  <td className="guest-td-title">{getDisplayTitle(row)}</td>
                                  <td className="guest-td-units">
                                    <span className="guest-units-pill">{getUnits(row)}</span>
                                  </td>
                                  <td className="guest-td-remarks">
                                    <select
                                      className={`guest-remarks-select ${val === 'passed' ? 'guest-remarks-passed' : ''}`}
                                      value={val}
                                      onChange={(e) => setRemark(id, e.target.value)}
                                      aria-label={`Remarks for ${getDisplayTitle(row)}`}
                                    >
                                      <option value="">---</option>
                                      <option value="passed">Passed</option>
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))
                )}
              </div>
            </div>
          </div>

          <details className="guest-transfer-details">
            <summary>External course code lookup (transfer credit match)</summary>
            <p className="guest-sim-desc">
              Enter course codes from a previous school (one per line). If they exist with an active equivalence, you
              will see possible local matches. This does not create a record.
            </p>
            <form className="guest-sim-form" onSubmit={handleSimulate}>
              <div className="guest-sim-row">
                <label htmlFor="guest-sim-school">School (optional)</label>
                <select
                  id="guest-sim-school"
                  value={simSchoolId}
                  onChange={(e) => setSimSchoolId(e.target.value)}
                >
                  <option value="">Any school</option>
                  {schools.map((s) => (
                    <option key={s.school_id} value={s.school_id}>
                      {s.school_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="guest-sim-row">
                <label htmlFor="guest-sim-codes">External course codes</label>
                <textarea
                  id="guest-sim-codes"
                  rows={4}
                  placeholder={'e.g. MATH101\nENG102'}
                  value={codesText}
                  onChange={(e) => setCodesText(e.target.value)}
                />
              </div>
              <button type="submit" className="guest-sim-submit" disabled={simLoading}>
                {simLoading ? 'Checking…' : 'Check matches'}
              </button>
            </form>
            {simError && <div className="guest-error guest-sim-err">{simError}</div>}
            {simResults && simResults.length > 0 && (
              <div className="guest-sim-results">
                {simResults.map((r, idx) => (
                  <div key={idx} className="guest-sim-block">
                    <div className="guest-sim-code">
                      <strong>Code:</strong> {r.input_code}{' '}
                      <span className={`guest-sim-badge guest-sim-${r.match}`}>{r.match}</span>
                    </div>
                    {r.message && <p className="guest-sim-msg">{r.message}</p>}
                    {r.equivalences?.length > 0 && (
                      <table className="guest-sim-table-inner">
                        <thead>
                          <tr>
                            <th>Local code</th>
                            <th>Local subject</th>
                            <th>Units</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.equivalences.map((eq, i) => (
                            <tr key={i}>
                              <td>{eq.local_subject_code || '—'}</td>
                              <td>{eq.local_subject_name || '—'}</td>
                              <td>{eq.credited_units ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </details>
        </>
      )}
    </div>
  );
};

export default GuestPanel;
