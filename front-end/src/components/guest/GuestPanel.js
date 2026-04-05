import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { swalError } from '../../utils/swal';
import './GuestPanel.css';

const publicUrl = process.env.PUBLIC_URL || '';

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

function getTitle(row) {
  if (row.subject?.subject_name) return row.subject.subject_name;
  const slot = electiveSlot(row);
  if (slot?.slot_name) return slot.slot_name;
  return '—';
}

/** Elective slot row + chosen track → matching elective_subject entry, if any. */
function resolveElectiveSubject(row, trackId) {
  if (!isElectiveSlotRow(row) || trackId == null || trackId === '') return null;
  const slot = electiveSlot(row);
  const subs = slot?.electiveSubjects || slot?.elective_subjects;
  if (!Array.isArray(subs)) return null;
  return subs.find((es) => String(es.track_id) === String(trackId)) ?? null;
}

function getPenCodePartsForGuest(row, electiveTrackId) {
  if (!isElectiveSlotRow(row)) return getPenCodeParts(row);
  if (!electiveTrackId) return [];
  const es = resolveElectiveSubject(row, electiveTrackId);
  const code = es?.subject?.subject_code;
  return code ? [String(code).trim()].filter(Boolean) : [];
}

function getDisplayTitleForGuest(row, electiveTrackId) {
  if (!isElectiveSlotRow(row)) return getTitle(row);
  if (!electiveTrackId) return 'Elective';
  const es = resolveElectiveSubject(row, electiveTrackId);
  if (es?.subject?.subject_name) return es.subject.subject_name;
  return '—';
}

function getUnitsForGuest(row, electiveTrackId) {
  if (!isElectiveSlotRow(row)) return getUnits(row);
  if (!electiveTrackId) return '—';
  const es = resolveElectiveSubject(row, electiveTrackId);
  if (es?.subject?.number_of_units != null) return es.subject.number_of_units;
  return '—';
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
 * Public curriculum simulation: filter catalog, mark rows completed, export PDF.
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
  /** After Confirm, table shows only courses not marked completed (remaining to take). */
  const [remainingMode, setRemainingMode] = useState(false);
  /** One track for the whole simulation: all elective rows resolve to that track's subject per slot. */
  const [guestElectiveTrackId, setGuestElectiveTrackId] = useState('');
  const [electiveTrackModalOpen, setElectiveTrackModalOpen] = useState(false);

  useEffect(() => {
    setRemainingMode(false);
  }, [programFilter, headerFilter, yearFilter, semesterFilter]);

  useEffect(() => {
    setGuestElectiveTrackId('');
  }, [programFilter, headerFilter]);

  useEffect(() => {
    if (!electiveTrackModalOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setElectiveTrackModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [electiveTrackModalOpen]);

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

  const electiveTrackOptions = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      if (!isElectiveSlotRow(row)) return;
      const slot = electiveSlot(row);
      const subs = slot?.electiveSubjects || slot?.elective_subjects;
      if (!Array.isArray(subs)) return;
      subs.forEach((es) => {
        const tid = es.track_id;
        if (tid == null || tid === '') return;
        const key = String(tid);
        if (map.has(key)) return;
        const t = es.track;
        map.set(key, {
          track_id: tid,
          track_name: t?.track_name || t?.track_code || `Track ${tid}`,
          track_code: t?.track_code,
        });
      });
    });
    return [...map.values()].sort((a, b) => String(a.track_name).localeCompare(String(b.track_name)));
  }, [filteredRows]);

  const selectedElectiveTrackLabel = useMemo(() => {
    if (!guestElectiveTrackId) return '';
    const o = electiveTrackOptions.find((t) => String(t.track_id) === String(guestElectiveTrackId));
    return o ? (o.track_code ? `${o.track_name} (${o.track_code})` : o.track_name) : '';
  }, [electiveTrackOptions, guestElectiveTrackId]);

  const hasElectiveRowsInView = useMemo(
    () => filteredRows.some((row) => isElectiveSlotRow(row)),
    [filteredRows],
  );

  const passedUnitsTotal = useMemo(() => {
    let sum = 0;
    filteredRows.forEach((row) => {
      const id = row.curriculum_id;
      if (remarks[id] !== 'passed') return;
      const u = getUnitsForGuest(row, guestElectiveTrackId);
      if (u === '—' || u === '') return;
      const n = typeof u === 'number' ? u : Number(String(u).replace(/,/g, ''));
      if (!Number.isNaN(n)) sum += n;
    });
    return sum;
  }, [filteredRows, remarks, guestElectiveTrackId]);

  const groupedSectionsDisplay = useMemo(() => {
    if (!remainingMode) {
      return groupedSections;
    }
    return groupedSections
      .map((section) => ({
        ...section,
        rows: section.rows.filter((row) => remarks[row.curriculum_id] !== 'passed'),
      }))
      .filter((section) => section.rows.length > 0);
  }, [groupedSections, remainingMode, remarks]);

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
      <div className="guest-sim-page-bg" aria-hidden />
      <div
        className={`guest-sim-page-content${!loading ? ' guest-sim-page-content--sim-float' : ''}`}
      >
      <header className="guest-sim-topbar">
        <div className="guest-sim-brand">
          <img
            src={`${publicUrl}/branding/cagayan_de_oro_college_seal.png`}
            alt="Cagayan de Oro College seal"
            className="guest-sim-seal"
          />
          <div className="guest-sim-brand-text">
            <span className="guest-sim-institution">{INSTITUTION_NAME}</span>
            <span className="guest-sim-portal-tag">Academic Evaluation Portal · Guest</span>
          </div>
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
                  disabled={pdfLoading || groupedSectionsDisplay.length === 0}
                >
                  {pdfLoading ? 'Preparing…' : 'Download as PDF'}
                </button>
              </div>
            </div>

            <div className="guest-sim-summary guest-sim-summary-bar">
              <p className="guest-sim-summary-text">
                {remainingMode ? (
                  <>
                    Showing subjects you still need to take (not marked completed).{' '}
                    <span className="guest-sim-summary-label">Completed units (full list)</span>
                  </>
                ) : (
                  <>
                    Mark courses you have already completed—here or at another school—then tap{' '}
                    <strong>Confirm</strong> below to see what is left.{' '}
                    <span className="guest-sim-summary-label">Completed units (this view)</span>
                  </>
                )}
              </p>
              <span className="guest-sim-summary-pill" aria-live="polite">
                {passedUnitsTotal.toFixed(1)}
              </span>
            </div>
            {hasElectiveRowsInView && (
              <p className="guest-sim-elective-hint">
                Elective rows: tap <strong>Elective</strong> to choose a track; every elective slot updates to that
                track&apos;s subjects.
                {selectedElectiveTrackLabel ? (
                  <>
                    {' '}
                    <span className="guest-sim-elective-hint-track">Current track: {selectedElectiveTrackLabel}</span>
                  </>
                ) : null}
              </p>
            )}

            <div className="guest-sim-table-card">
              <div className="guest-sim-table-head">
                <span className="guest-sim-table-head-title">
                  {remainingMode ? 'Remaining subjects' : 'Curriculum simulation'}
                </span>
                <span className="guest-sim-table-head-sep">—</span>
                <span className="guest-sim-table-head-sub">
                  {remainingMode ? 'Not marked completed' : selectedHeaderLabel}
                </span>
              </div>
              <div className="guest-sim-sections-body">
                {groupedSections.length === 0 ? (
                  <div className="guest-sim-empty">No courses match the selected filters.</div>
                ) : groupedSectionsDisplay.length === 0 ? (
                  <div className="guest-sim-empty">
                    {remainingMode
                      ? 'Every course in this view is marked completed — nothing left to take here.'
                      : 'No courses match the selected filters.'}
                  </div>
                ) : (
                  groupedSectionsDisplay.map((section, secIdx) => (
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
                              const parts = getPenCodePartsForGuest(row, guestElectiveTrackId);
                              const titleLabel = getDisplayTitleForGuest(row, guestElectiveTrackId);
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
                                  <td className="guest-td-title">
                                    {isElectiveSlotRow(row) ? (
                                      <button
                                        type="button"
                                        className="guest-elective-title-btn"
                                        onClick={() => setElectiveTrackModalOpen(true)}
                                        title={
                                          guestElectiveTrackId
                                            ? 'Change elective track (updates all elective rows)'
                                            : 'Choose elective track'
                                        }
                                      >
                                        {titleLabel}
                                        {!guestElectiveTrackId ? (
                                          <span className="guest-elective-title-btn__hint"> · Choose track</span>
                                        ) : null}
                                      </button>
                                    ) : (
                                      titleLabel
                                    )}
                                  </td>
                                  <td className="guest-td-units">
                                    <span className="guest-units-pill">{getUnitsForGuest(row, guestElectiveTrackId)}</span>
                                  </td>
                                  <td className="guest-td-remarks">
                                    <select
                                      className={`guest-remarks-select ${val === 'passed' ? 'guest-remarks-passed' : ''}`}
                                      value={val}
                                      onChange={(e) => setRemark(id, e.target.value)}
                                      disabled={remainingMode}
                                      aria-label={`Remarks for ${titleLabel}`}
                                    >
                                      <option value="">---</option>
                                      <option value="passed">Completed</option>
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

          {electiveTrackModalOpen && (
            <div
              className="guest-elective-modal-root"
              role="dialog"
              aria-modal="true"
              aria-labelledby="guest-elective-modal-title"
            >
              <button
                type="button"
                className="guest-elective-modal-backdrop"
                aria-label="Close"
                onClick={() => setElectiveTrackModalOpen(false)}
              />
              <div className="guest-elective-modal">
                <h2 id="guest-elective-modal-title" className="guest-elective-modal-title">
                  Elective track
                </h2>
                <p className="guest-elective-modal-desc">
                  Pick one track. Every elective slot in this filtered view will show the subject mapped to that track
                  (when one exists for that slot).
                </p>
                {electiveTrackOptions.length === 0 ? (
                  <p className="guest-elective-modal-empty">
                    No tracks were found on elective subjects for this view. If this looks wrong, the curriculum may
                    need elective–track links in the admin.
                  </p>
                ) : (
                  <ul className="guest-elective-modal-list">
                    {electiveTrackOptions.map((t) => {
                      const active = String(t.track_id) === String(guestElectiveTrackId);
                      return (
                        <li key={String(t.track_id)}>
                          <button
                            type="button"
                            className={`guest-elective-modal-option${active ? ' guest-elective-modal-option--active' : ''}`}
                            onClick={() => {
                              setGuestElectiveTrackId(String(t.track_id));
                              setElectiveTrackModalOpen(false);
                            }}
                          >
                            <span className="guest-elective-modal-option-name">{t.track_name}</span>
                            {t.track_code ? (
                              <span className="guest-elective-modal-option-code">{t.track_code}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="guest-elective-modal-footer">
                  {guestElectiveTrackId ? (
                    <button
                      type="button"
                      className="guest-elective-modal-clear"
                      onClick={() => {
                        setGuestElectiveTrackId('');
                        setElectiveTrackModalOpen(false);
                      }}
                    >
                      Clear track
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="guest-elective-modal-close"
                    onClick={() => setElectiveTrackModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="guest-sim-float-dock" role="toolbar" aria-label="Curriculum simulation">
            {remainingMode ? (
              <button
                type="button"
                className="guest-sim-float-btn guest-sim-float-btn--secondary"
                onClick={() => setRemainingMode(false)}
              >
                Show full curriculum
              </button>
            ) : (
              <button
                type="button"
                className="guest-sim-float-btn guest-sim-float-btn--primary"
                onClick={() => setRemainingMode(true)}
              >
                Confirm
              </button>
            )}
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
    </div>
  );
};

export default GuestPanel;
