import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { swalError } from '../../utils/swal';
import {
  downloadStudentAcademicEvaluationPdf,
  fetchStudentEvaluationPayload,
  getGradedSemesterOptionsFromPayload,
} from '../../utils/studentAcademicEvaluationPdf';
import EvaluationPdfSemesterModal from '../common/EvaluationPdfSemesterModal';
import GradeConversionModal from './GradeConversionModal';
import {
  formatPctBoundary,
  getGradeDisplayParts,
} from '../../utils/gradePercentageConversion';
import '../admin/CurriculumManagement.css';
import './StudentCurriculum.css';

/** e.g. 1 → "1st Year", 4 → "4th Year" (fallback when API has no year_level_name). */
function ordinalYearLabel(yearNum) {
  const n = Number(yearNum);
  if (!Number.isFinite(n) || n < 1) {
    return yearNum != null && yearNum !== '' ? `Year ${yearNum}` : 'Year';
  }
  const j = n % 10;
  const k = n % 100;
  let suf = 'th';
  if (k < 11 || k > 13) {
    if (j === 1) suf = 'st';
    else if (j === 2) suf = 'nd';
    else if (j === 3) suf = 'rd';
  }
  return `${n}${suf} Year`;
}

/** Distinct program terms (year + semester) in catalog order — same ordering as curriculum rows. */
function orderedDistinctTerms(items) {
  const m = new Map();
  (items || []).forEach((item) => {
    const y = Number(item.year_level_id ?? item.year_level?.year_level_id);
    const s = Number(item.semester_id ?? item.semester?.semester_id);
    if (!Number.isFinite(y) || !Number.isFinite(s)) return;
    const k = `${y}|${s}`;
    if (!m.has(k)) m.set(k, { year_level_id: y, semester_id: s });
  });
  return [...m.values()].sort((a, b) => {
    if (a.year_level_id !== b.year_level_id) return a.year_level_id - b.year_level_id;
    return a.semester_id - b.semester_id;
  });
}

/** Match subject codes regardless of spaces/case (e.g. "SSP 005" vs "SSP005", "PED 032" vs "PED032"). */
function normalizeSubjectCode(code) {
  return String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

const StudentCurriculum = () => {
  const [curriculum, setCurriculum] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedYearLevel, setSelectedYearLevel] = useState(null);
  const [yearLevels, setYearLevels] = useState([]);
  const [evaluationPdfLoading, setEvaluationPdfLoading] = useState(false);
  const [evalPdfModalOpen, setEvalPdfModalOpen] = useState(false);
  const [evalPdfPayload, setEvalPdfPayload] = useState(null);
  const [evalPdfSemesterOptions, setEvalPdfSemesterOptions] = useState([]);
  /** When API returns [] curriculum, explains why (e.g. program not assigned). */
  const [curriculumEmptyHint, setCurriculumEmptyHint] = useState({ message: '', reason: null });
  const [showGradePointEquiv, setShowGradePointEquiv] = useState(false);
  const [gradeConvModalOpen, setGradeConvModalOpen] = useState(false);
  /** Staff “Promote to next semester” — caps which terms appear in My Curriculum. */
  const [promotion, setPromotion] = useState(null);

  useEffect(() => {
    fetchCurriculum();
    fetchEnrollments();
  }, []);

  /** API may return { curriculum: [...] } or error-shaped objects; never assume .map exists. */
  const normalizeList = (payload, key) => {
    const raw = key != null ? payload?.[key] : payload;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Array.isArray(raw.data)) return raw.data;
    return [];
  };

  const fetchCurriculum = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students/curriculum');
      const curriculumData = normalizeList(response.data, 'curriculum');
      setCurriculum(curriculumData);
      const prom = response.data?.promotion;
      setPromotion(
        prom && typeof prom === 'object'
          ? {
              promoted_at: prom.promoted_at ?? null,
              target_year_level_id:
                prom.target_year_level_id != null && prom.target_year_level_id !== ''
                  ? Number(prom.target_year_level_id)
                  : null,
              target_semester_id:
                prom.target_semester_id != null && prom.target_semester_id !== ''
                  ? Number(prom.target_semester_id)
                  : null,
            }
          : null
      );
      setCurriculumEmptyHint({
        message: (response.data && response.data.curriculum_message) || '',
        reason: (response.data && response.data.curriculum_unavailable_reason) || null,
      });

      const uniqueYearLevels = [
        ...new Set(
          curriculumData
            .map((item) => item.year_level_id || item.year_level?.year_level_id)
            .filter((id) => id != null && id !== '')
            .map((id) => Number(id))
            .filter((n) => Number.isFinite(n))
        ),
      ].sort((a, b) => a - b);
      setYearLevels(uniqueYearLevels);

      if (uniqueYearLevels.length > 0 && selectedYearLevel == null) {
        setSelectedYearLevel(uniqueYearLevels[0]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching curriculum:', err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to load curriculum'
      );
      setCurriculum([]);
      setYearLevels([]);
      setPromotion(null);
      setCurriculumEmptyHint({ message: '', reason: null });
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const response = await api.get('/students/enrollments');
      const list = normalizeList(response.data, 'enrollments');
      setEnrollments(list);
      // Same records as evaluations (backend exposes them as enrollments); avoids 404 on /students/evaluations.
      setEvaluations(list);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
      setEnrollments([]);
      setEvaluations([]);
    }
  };

  const orderedTerms = useMemo(() => orderedDistinctTerms(curriculum), [curriculum]);

  const maxVisibleTermIndex = useMemo(() => {
    if (!orderedTerms.length) return 0;
    if (!promotion?.promoted_at) return 0;
    const ty = Number(promotion.target_year_level_id);
    const ts = Number(promotion.target_semester_id);
    if (!Number.isFinite(ty) || !Number.isFinite(ts)) return 0;
    const idx = orderedTerms.findIndex((t) => t.year_level_id === ty && t.semester_id === ts);
    return idx >= 0 ? idx : 0;
  }, [orderedTerms, promotion]);

  /** Year tabs: only years that include at least one term the student is allowed to see. */
  const visibleYearLevels = useMemo(() => {
    if (!orderedTerms.length) return [];
    const years = new Set();
    for (let i = 0; i <= maxVisibleTermIndex && i < orderedTerms.length; i++) {
      years.add(orderedTerms[i].year_level_id);
    }
    return [...years].sort((a, b) => a - b);
  }, [orderedTerms, maxVisibleTermIndex]);

  /**
   * Match evaluation to a curriculum row: same subject + semester when possible.
   * Avoids picking an older tbl_evaluation row (null grade) when a newer row exists for that term.
   */
  const pickEnrollment = (subjectId, semesterId) => {
    if (subjectId == null || subjectId === '') return null;
    const sid = Number(subjectId);
    const sem =
      semesterId != null && semesterId !== '' && Number.isFinite(Number(semesterId))
        ? Number(semesterId)
        : null;
    let list = enrollments.filter(
      (e) =>
        Number(e.subject_id) === sid || Number(e.subject?.subject_id) === sid
    );
    if (sem != null && list.some((e) => Number(e.semester_id) === sem)) {
      list = list.filter((e) => Number(e.semester_id) === sem);
    }
    if (list.length === 0) return null;

    const hasOutcome = (e) => {
      const st = String(e.evaluation_status || e.status || '').trim();
      const g = e.grade;
      return (
        st !== '' ||
        (g != null && String(g).trim() !== '' && !Number.isNaN(parseFloat(g)))
      );
    };
    const pool = list.filter(hasOutcome).length ? list.filter(hasOutcome) : list;
    pool.sort((a, b) => {
      const ta = Date.parse(a.evaluation_date || a.enrolled_date || 0) || 0;
      const tb = Date.parse(b.evaluation_date || b.enrolled_date || 0) || 0;
      return tb - ta;
    });
    return pool[0];
  };

  const enrollmentToViewModel = (enrollment, minPassing = 70) => {
    if (!enrollment) return null;
    const statusStr = String(enrollment.evaluation_status || enrollment.status || '').toLowerCase();
    const gradeRaw = enrollment.grade;
    const numGrade =
      gradeRaw !== '' && gradeRaw != null && !Number.isNaN(parseFloat(gradeRaw))
        ? parseFloat(gradeRaw)
        : NaN;
    const passedByStatus = ['completed', 'passed', 'pass', 'credit'].includes(statusStr);
    const passedByPercent = !Number.isNaN(numGrade) && numGrade >= minPassing;

    return {
      status: enrollment.status,
      grade: enrollment.grade,
      inc_compliance_deadline: enrollment.inc_compliance_deadline,
      completed: passedByStatus || passedByPercent,
    };
  };

  const getEnrollmentStatus = (subjectId, semesterId = null, minPassing = 70) => {
    return enrollmentToViewModel(pickEnrollment(subjectId, semesterId), minPassing);
  };

  const getEvaluationStatus = (subjectId, semesterId = null) => {
    const evaluation = pickEnrollment(subjectId, semesterId);
    return evaluation
      ? {
          status: evaluation.evaluation_status || evaluation.status,
          grade: evaluation.grade,
          hasGrade: evaluation.grade != null && evaluation.grade !== '',
          inc_compliance_deadline: evaluation.inc_compliance_deadline,
        }
      : null;
  };

  const isRowTransferCredited = (row) => row?.passed_via_transfer_credit === true;

  /** Row is considered passed for “year complete” (aligns with backend passing_grade + status). */
  const rowHasPassingRecord = (item) => {
    if (isRowTransferCredited(item)) return true;
    const sid = item.subject_id || item.subject?.subject_id;
    if (sid == null || sid === '') return false;
    const sem = item.semester_id;
    const pgRaw = item.passing_grade ?? item.subject?.passing_grade;
    const minPassing =
      pgRaw !== undefined && pgRaw !== null && pgRaw !== '' && !Number.isNaN(parseFloat(pgRaw))
        ? parseFloat(pgRaw)
        : 70;
    const evalStatus = getEvaluationStatus(sid, sem);
    const enrollmentStatus = getEnrollmentStatus(sid, sem, minPassing);
    const statusStr = String(
      enrollmentStatus?.status || evalStatus?.status || ''
    ).toLowerCase();
    const gradeRaw = enrollmentStatus?.grade ?? evalStatus?.grade;
    const numGrade =
      gradeRaw !== '' && gradeRaw != null && !Number.isNaN(parseFloat(gradeRaw))
        ? parseFloat(gradeRaw)
        : NaN;

    if (enrollmentStatus?.completed) return true;
    if (['passed', 'pass', 'credit', 'completed'].includes(statusStr)) return true;
    if (!Number.isNaN(numGrade) && numGrade >= minPassing) return true;
    if (evalStatus?.hasGrade && !Number.isNaN(numGrade) && numGrade >= minPassing) return true;
    return false;
  };

  /** True when every curriculum row for that year level has a passing grade/status. */
  const isYearLevelFullyCompleted = (yearLevelId) => {
    const yl = Number(yearLevelId);
    const rows = curriculum.filter(
      (item) => Number(item.year_level_id || item.year_level?.year_level_id) === yl
    );
    if (rows.length === 0) return false;
    return rows.every((item) => rowHasPassingRecord(item));
  };

  /** When the selected year is fully passed, move the tab to the first year that still has failures (or last year if all passed). */
  useEffect(() => {
    if (loading || !yearLevels.length || curriculum.length === 0) return;
    if (!visibleYearLevels.length) return;
    let target = visibleYearLevels[visibleYearLevels.length - 1];
    for (const y of visibleYearLevels) {
      if (!isYearLevelFullyCompleted(y)) {
        target = y;
        break;
      }
    }
    setSelectedYearLevel((prev) => {
      if (prev != null && !visibleYearLevels.includes(prev)) return target;
      if (prev == null) return target;
      if (!isYearLevelFullyCompleted(prev)) return prev;
      return target;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- align tab when curriculum/enrollment data changes
  }, [loading, curriculum, enrollments, yearLevels, visibleYearLevels]);

  const getPrerequisites = (row) => {
    const subject = row.subject || row;
    if (row.prerequisites && row.prerequisites.length > 0) {
      return row.prerequisites.map((p) => p.subject_code || p.prereq_subject_code).join(', ');
    }
    if (subject.prerequisites && subject.prerequisites.length > 0) {
      return subject.prerequisites
        .map((p) => p.requiredSubject?.subject_code || p.subject_code)
        .filter(Boolean)
        .join(', ');
    }
    return 'None';
  };

  /** Human text for INC compliance countdown on the student curriculum view. */
  const incComplianceHint = (deadlineIso) => {
    if (!deadlineIso) return null;
    const end = new Date(`${String(deadlineIso).slice(0, 10)}T23:59:59`);
    if (Number.isNaN(end.getTime())) return null;
    const now = new Date();
    const ms = end.getTime() - now.getTime();
    const days = Math.ceil(ms / 86400000);
    if (days < 0) return `Compliance overdue (${Math.abs(days)} day(s))`;
    if (days === 0) return 'Comply by today';
    return `${days} day(s) left to comply`;
  };

  // Check if all prerequisites are passed
  const arePrerequisitesPassed = (row) => {
    const subject = row.subject || row;
    const prerequisites = row.prerequisites || subject.prerequisites || [];

    if (prerequisites.length === 0) return { passed: true, failedPrereqs: [] };

    const failedPrereqs = [];

    for (const prereq of prerequisites) {
      const prereqCode =
        prereq.subject_code ||
        prereq.prereq_subject_code ||
        prereq.requiredSubject?.subject_code;
      const prereqNorm = normalizeSubjectCode(prereqCode);
      if (!prereqNorm) continue;

      const prereqSubject =
        curriculum.find((item) => {
          const code = item.subject_code || item.subject?.subject_code;
          return normalizeSubjectCode(code) === prereqNorm;
        }) ?? null;

      let prereqSubjectId =
        prereqSubject != null
          ? prereqSubject.subject_id || prereqSubject.subject?.subject_id
          : null;

      if (prereqSubjectId == null || prereqSubjectId === '') {
        const hit = enrollments.find((e) => {
          const c = e.subject_code || e.subject?.subject_code;
          return normalizeSubjectCode(c) === prereqNorm;
        });
        if (hit) {
          prereqSubjectId = hit.subject_id ?? hit.subject?.subject_id;
        }
      }

      if (prereqSubjectId == null || prereqSubjectId === '') {
        failedPrereqs.push(prereqCode || prereqNorm);
        continue;
      }

      const transferRow =
        prereqSubject ??
        curriculum.find(
          (item) =>
            Number(item.subject_id || item.subject?.subject_id) === Number(prereqSubjectId)
        );
      if (transferRow && isRowTransferCredited(transferRow)) {
        continue;
      }

      const enrollment = getEnrollmentStatus(prereqSubjectId);
      const evaluation = getEvaluationStatus(prereqSubjectId);

      const prereqSt = String(enrollment?.status || evaluation?.status || '')
        .toLowerCase()
        .trim();
      if (prereqSt === 'inc' || prereqSt === 'incomplete') {
        failedPrereqs.push(prereqCode || prereqNorm);
        continue;
      }

      const evalSt = String(evaluation?.status || '')
        .toLowerCase()
        .trim();
      const enrollSt = String(enrollment?.status || '')
        .toLowerCase()
        .trim();

      const isPassed =
        enrollment?.completed ||
        enrollSt === 'passed' ||
        enrollSt === 'pass' ||
        enrollSt === 'credit' ||
        enrollSt === 'completed' ||
        evalSt === 'passed' ||
        evalSt === 'pass' ||
        evalSt === 'credit' ||
        evalSt === 'completed' ||
        parseFloat(enrollment?.grade || 0) >= 50 ||
        parseFloat(evaluation?.grade || 0) >= 50;

      const isFailed =
        enrollSt === 'failed' ||
        enrollSt === 'fail' ||
        enrollSt === 'f' ||
        evalSt === 'failed' ||
        evalSt === 'fail' ||
        evalSt === 'f' ||
        parseFloat(enrollment?.grade || 0) < 50 ||
        parseFloat(evaluation?.grade || 0) < 50;

      if (isFailed && !isPassed) {
        failedPrereqs.push(prereqCode || prereqNorm);
      }
    }

    return {
      passed: failedPrereqs.length === 0,
      failedPrereqs,
    };
  };

  const groupBySemester = (yearLevelId) => {
    const yl = Number(yearLevelId);
    const yearLevelSubjects = curriculum.filter(
      (item) => Number(item.year_level_id || item.year_level?.year_level_id) === yl
    );

    const grouped = {};
    yearLevelSubjects.forEach((item) => {
      const semesterId = item.semester_id || item.semester?.semester_id;
      const semesterName =
        item.semester_name || item.semester?.semester_name || 'Unknown';

      if (!grouped[semesterId]) {
        grouped[semesterId] = {
          id: semesterId,
          name: semesterName,
          rows: [],
        };
      }
      grouped[semesterId].rows.push(item);
    });

    return Object.values(grouped).sort((a, b) => Number(a.id) - Number(b.id));
  };

  /** Semesters in this year up to the latest term allowed by staff promotion (catalog order). */
  const getVisibleSemestersForYear = (yearLevelId) => {
    const yl = Number(yearLevelId);
    const semesters = groupBySemester(yearLevelId);
    return semesters.filter((sem) => {
      const sid = Number(sem.id);
      if (!Number.isFinite(sid)) return false;
      const gi = orderedTerms.findIndex((t) => t.year_level_id === yl && t.semester_id === sid);
      return gi >= 0 && gi <= maxVisibleTermIndex;
    });
  };

  const yearLabel = useMemo(() => {
    if (selectedYearLevel == null) return '';
    const sel = Number(selectedYearLevel);
    const row = curriculum.find(
      (item) => Number(item.year_level_id || item.year_level?.year_level_id) === sel
    );
    return (
      row?.year_level_name ||
      row?.year_level?.year_level ||
      ordinalYearLabel(sel)
    );
  }, [curriculum, selectedYearLevel]);

  const programLine = useMemo(() => {
    const row = curriculum[0];
    const p = row?.program;
    if (!p) return 'CURRICULUM';
    return `${p.program_name || ''}${p.program_code ? ` (${p.program_code})` : ''}`.trim();
  }, [curriculum]);

  const closeEvalPdfModal = () => {
    setEvalPdfModalOpen(false);
    setEvalPdfPayload(null);
    setEvalPdfSemesterOptions([]);
  };

  const openEvalPdfModal = async () => {
    setEvaluationPdfLoading(true);
    try {
      const payload = await fetchStudentEvaluationPayload(api);
      const opts = getGradedSemesterOptionsFromPayload(payload);
      setEvalPdfPayload(payload);
      setEvalPdfSemesterOptions(opts);
      setEvalPdfModalOpen(true);
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || 'Could not load evaluation data.';
      await swalError('Download failed', msg);
    } finally {
      setEvaluationPdfLoading(false);
    }
  };

  const confirmEvalPdfDownload = async (semesterKeys) => {
    if (!evalPdfPayload) return;
    setEvaluationPdfLoading(true);
    try {
      await downloadStudentAcademicEvaluationPdf(api, {
        semesterKeys,
        data: evalPdfPayload,
      });
      closeEvalPdfModal();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not generate the report.';
      await swalError('Download failed', msg);
    } finally {
      setEvaluationPdfLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading curriculum...</div>;
  }

  return (
    <div className="curriculum-management student-curriculum-page">
      <div className="management-header student-curriculum-management-header">
        <h2>My Curriculum</h2>
        <div className="student-curriculum-header-actions">
          <button
            type="button"
            className={`student-curriculum-pct-toggle${showGradePointEquiv ? ' active' : ''}`}
            aria-pressed={showGradePointEquiv}
            onClick={() => setShowGradePointEquiv((v) => !v)}
          >
            {showGradePointEquiv ? 'Hide 1.00–5.00 equivalent' : 'Show 1.00–5.00 equivalent'}
          </button>
          <button
            type="button"
            className="student-curriculum-conv-tables"
            onClick={() => setGradeConvModalOpen(true)}
          >
            Conversion tables
          </button>
          <button
            type="button"
            className="student-curriculum-download-eval"
            onClick={openEvalPdfModal}
            disabled={evaluationPdfLoading}
          >
            {evaluationPdfLoading && !evalPdfModalOpen ? 'Loading…' : 'Download evaluation report'}
          </button>
        </div>
      </div>

      <GradeConversionModal open={gradeConvModalOpen} onClose={() => setGradeConvModalOpen(false)} />

      <EvaluationPdfSemesterModal
        open={evalPdfModalOpen}
        onClose={closeEvalPdfModal}
        options={evalPdfSemesterOptions}
        loading={evaluationPdfLoading}
        onConfirm={confirmEvalPdfDownload}
      />

      {error && <div className="error-message">{error}</div>}

      {curriculum.length === 0 && !loading && (
        <div className="no-data student-curriculum-empty">
          {curriculumEmptyHint.message ? (
            <>
              <p className="student-curriculum-empty-title">Curriculum is not available yet</p>
              <p className="student-curriculum-empty-body">{curriculumEmptyHint.message}</p>
            </>
          ) : (
            <p>No curriculum data found. Please contact your administrator.</p>
          )}
        </div>
      )}

      {yearLevels.length > 0 && (
        <nav
          className="curriculum-pagination curriculum-year-pagination student-curriculum-year-nav"
          aria-label="Year level"
        >
          <div className="curriculum-year-pagination__pills" role="tablist">
            {visibleYearLevels.map((yearLevelId) => {
              const yl = Number(yearLevelId);
              const row = curriculum.find(
                (item) => Number(item.year_level_id || item.year_level?.year_level_id) === yl
              );
              const name =
                row?.year_level_name ||
                row?.year_level?.year_level ||
                ordinalYearLabel(yl);
              const isActive = Number(selectedYearLevel) === yl;

              return (
                <button
                  key={yearLevelId}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`curriculum-year-pagination__pill${isActive ? ' is-active' : ''}`}
                  onClick={() => setSelectedYearLevel(yl)}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {selectedYearLevel != null && curriculum.length > 0 && (
        <section className="student-curriculum-panel" aria-label="Curriculum details">
          <div className="year-group student-curriculum-panel__inner">
            <div className="year-group-header student-curriculum-panel__header">
              <div className="curriculum-header-block">
                <div className="curriculum-header-school">Cagayan de Oro College</div>
                <div className="curriculum-header-program">{programLine}</div>
              </div>
            </div>

            <div className="semesters-stacked-container student-curriculum-panel__body">
            {(() => {
              const visibleSemesters = getVisibleSemestersForYear(selectedYearLevel);
              return (
                <>
                  {visibleSemesters.map((semester) => (
              <div key={semester.id} className="semester-section">
                <div className="semester-section-header">
                  <h3>
                    {yearLabel.toUpperCase()} — {(semester.name || '').toUpperCase()}
                  </h3>
                </div>
                <div className="table-container">
                  <div
                    className="curriculum-data-grid curriculum-data-grid--scroll-table student-curriculum-grid"
                    style={{ '--curriculum-data-cols': 8 }}
                    role="table"
                    aria-label="Curriculum subjects"
                  >
                    <div className="curriculum-data-grid__head" role="row">
                      {['Subject Code', 'Pre/Co-requisite', 'Description', 'Units', 'Hours', 'Passing Grade', 'Type', 'Status'].map((label) => (
                        <div key={label} className="curriculum-data-grid__th" role="columnheader">
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="curriculum-data-grid__body" role="rowgroup">
                      {semester.rows.length === 0 ? (
                        <div className="curriculum-data-grid__empty no-subjects" role="row">
                          <div role="cell">No subjects</div>
                        </div>
                      ) : (
                        semester.rows.map((row) => {
                          const sid = row.subject_id || row.subject?.subject_id;
                          const enrollment = sid ? getEnrollmentStatus(sid, row.semester_id) : null;
                          const code =
                            row.subject_code || row.subject?.subject_code || '—';
                          const title =
                            row.subject_name || row.subject?.subject_name || '—';
                          const units =
                            row.units ??
                            row.subject?.number_of_units ??
                            '—';
                          const hours =
                            row.hours ??
                            row.subject?.number_of_hrs ??
                            '—';
                          const passing = row.passing_grade ?? '—';
                          const type = row.subject_type || '—';
                          const prereq = getPrerequisites(row);
                          const transferCredited = isRowTransferCredited(row);
                          const done = transferCredited || enrollment?.completed;

                          // Check prerequisite eligibility (for subjects not yet taken / no grade on file).
                          const prereqCheck = arePrerequisitesPassed(row);
                          /** If there is any stored evaluation for this subject+term, show that outcome — do not replace "failed" with Not Eligible when prereqs were also unmet. */
                          const hasStoredEvaluation = enrollment != null;
                          const notEligible =
                            !transferCredited &&
                            !prereqCheck.passed &&
                            !done &&
                            !hasStoredEvaluation;
                          const statusRaw = enrollment?.status || '';
                          const statusLc = String(statusRaw).toLowerCase().trim();
                          const statusLabel =
                            statusLc === 'incomplete' ? 'INC' : statusRaw || '—';
                          const isIncStatus =
                            statusLc === 'incomplete' || statusLc === 'inc';
                          const incHint =
                            isIncStatus && enrollment?.inc_compliance_deadline
                              ? incComplianceHint(enrollment.inc_compliance_deadline)
                              : null;

                          const gradeDisplayParts =
                            enrollment?.grade != null &&
                            String(enrollment.grade).trim() !== '' &&
                            !isIncStatus
                              ? getGradeDisplayParts(enrollment.grade, passing)
                              : null;

                          return (
                            <div
                              key={row.curriculum_id || `${sid}-${semester.id}`}
                              className={`curriculum-data-grid__row${done ? ' student-curriculum-row-passed' : ''}`}
                              role="row"
                            >
                              <div className="curriculum-data-grid__cell" role="cell">
                                <span className="curriculum-data-grid__mobile-label">Subject Code</span>
                                <span className="curriculum-data-grid__cell-value">
                                  <strong style={{ color: '#2563eb' }}>{code}</strong>
                                </span>
                              </div>
                              <div className="curriculum-data-grid__cell prereq-cell" role="cell">
                                <span className="curriculum-data-grid__mobile-label">Pre/Co-requisite</span>
                                <span className="curriculum-data-grid__cell-value">{prereq}</span>
                              </div>
                              <div className="curriculum-data-grid__cell" role="cell">
                                <span className="curriculum-data-grid__mobile-label">Description</span>
                                <span className="curriculum-data-grid__cell-value">{title}</span>
                              </div>
                              <div className="curriculum-data-grid__cell" role="cell">
                                <span className="curriculum-data-grid__mobile-label">Units</span>
                                <span className="curriculum-data-grid__cell-value">{units}</span>
                              </div>
                              <div className="curriculum-data-grid__cell" role="cell">
                                <span className="curriculum-data-grid__mobile-label">Hours</span>
                                <span className="curriculum-data-grid__cell-value">{hours}</span>
                              </div>
                              <div className="curriculum-data-grid__cell" role="cell">
                                <span className="curriculum-data-grid__mobile-label">Passing Grade</span>
                                <span className="curriculum-data-grid__cell-value">{passing}</span>
                              </div>
                              <div className="curriculum-data-grid__cell" role="cell">
                                <span className="curriculum-data-grid__mobile-label">Type</span>
                                <span className="curriculum-data-grid__cell-value">{type}</span>
                              </div>
                              <div className="curriculum-data-grid__cell student-curriculum-status-td" role="cell">
                                <span className="curriculum-data-grid__mobile-label">Status</span>
                                <span className="curriculum-data-grid__cell-value">
                                  {transferCredited ? (
                                    <span className="student-curriculum-status-inline">
                                      <span className="status-badge status-credited">Credited</span>
                                      <span className="student-curriculum-credit-note">Transfer credit</span>
                                    </span>
                                  ) : notEligible ? (
                                    <span className="student-curriculum-status-inline">
                                      <span className="status-badge status-not-eligible">
                                        Not Eligible
                                      </span>
                                    </span>
                                  ) : enrollment ? (
                                    <span className="student-curriculum-status-inline">
                                      <span
                                        className={`status-badge status-${(enrollment.status || '')
                                          .toLowerCase()
                                          .replace(/\s+/g, '-')}`}
                                      >
                                        {statusLabel}
                                      </span>
                                      {enrollment.grade != null &&
                                        enrollment.grade !== '' &&
                                        !isIncStatus && (
                                          <span className="student-curriculum-grade-block">
                                            <span className="student-curriculum-grade">
                                              {gradeDisplayParts
                                                ? `Grade: ${gradeDisplayParts.primaryText}`
                                                : `Grade: ${enrollment.grade}`}
                                            </span>
                                            {showGradePointEquiv &&
                                              gradeDisplayParts &&
                                              !gradeDisplayParts.isLetter &&
                                              gradeDisplayParts.secondaryGp ? (
                                              <span
                                                className="student-curriculum-grade-pct"
                                                title={
                                                  gradeDisplayParts.bandMin != null &&
                                                  gradeDisplayParts.bandMax != null
                                                    ? `${gradeDisplayParts.scaleLabel}. Official score band: ${formatPctBoundary(
                                                        gradeDisplayParts.bandMin
                                                      )}–${formatPctBoundary(gradeDisplayParts.bandMax)}.`
                                                    : gradeDisplayParts.scaleLabel || ''
                                                }
                                              >
                                                ≈ {gradeDisplayParts.secondaryGp}
                                              </span>
                                            ) : null}
                                          </span>
                                        )}
                                      {incHint ? (
                                        <span className="student-curriculum-inc-hint" title="Incomplete — complete requirements by this deadline">
                                          {incHint}
                                          {enrollment.inc_compliance_deadline
                                            ? ` (by ${String(enrollment.inc_compliance_deadline).slice(0, 10)})`
                                            : ''}
                                        </span>
                                      ) : null}
                                    </span>
                                  ) : (
                                    <span className="muted-status">—</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
                  ))}
                </>
              );
            })()}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default StudentCurriculum;
