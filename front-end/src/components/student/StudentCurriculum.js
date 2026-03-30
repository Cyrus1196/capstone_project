import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { swalError } from '../../utils/swal';
import {
  downloadStudentAcademicEvaluationPdf,
  fetchStudentEvaluationPayload,
  getGradedSemesterOptionsFromPayload,
} from '../../utils/studentAcademicEvaluationPdf';
import EvaluationPdfSemesterModal from '../common/EvaluationPdfSemesterModal';
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

  const getEnrollmentStatus = (subjectId) => {
    const enrollment = enrollments.find(
      (e) =>
        Number(e.subject_id) === Number(subjectId) ||
        Number(e.subject?.subject_id) === Number(subjectId)
    );
    return enrollment
      ? {
          status: enrollment.status,
          grade: enrollment.grade,
          completed:
            enrollment.status === 'completed' ||
            enrollment.status === 'passed' ||
            parseFloat(enrollment.grade || 0) >= 70,
        }
      : null;
  };

  const getEvaluationStatus = (subjectId) => {
    const evaluation = evaluations.find(
      (e) =>
        Number(e.subject_id) === Number(subjectId) ||
        Number(e.subject?.subject_id) === Number(subjectId)
    );
    return evaluation
      ? {
          status: evaluation.evaluation_status || evaluation.status,
          grade: evaluation.grade,
          hasGrade: evaluation.grade != null && evaluation.grade !== '',
        }
      : null;
  };

  const isRowTransferCredited = (row) => row?.passed_via_transfer_credit === true;

  /** Row is considered passed for “year complete” (aligns with row STATUS / enrollment.completed). */
  const rowHasPassingRecord = (item) => {
    if (isRowTransferCredited(item)) return true;
    const sid = item.subject_id || item.subject?.subject_id;
    if (sid == null || sid === '') return false;
    const evalStatus = getEvaluationStatus(sid);
    const enrollmentStatus = getEnrollmentStatus(sid);
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
    if (!Number.isNaN(numGrade) && numGrade >= 70) return true;
    if (evalStatus?.hasGrade && !Number.isNaN(numGrade) && numGrade >= 70) return true;
    return false;
  };

  /**
   * Subject has a recorded outcome (pass, fail with grade, INC, etc.).
   * Used to unlock the next semester once the previous term is fully graded —
   * not only when every course is passed (failed but graded should still reveal next sem).
   */
  const rowHasRecordedEvaluation = (item) => {
    if (rowHasPassingRecord(item)) return true;
    const sid = item.subject_id || item.subject?.subject_id;
    // Curriculum placeholders (no mapped subject) should not block unlocking the next semester.
    if (sid == null || sid === '') return true;
    const enrollmentStatus = getEnrollmentStatus(sid);
    const evalStatus = getEvaluationStatus(sid);
    const gradeRaw = enrollmentStatus?.grade ?? evalStatus?.grade;
    const st = String(enrollmentStatus?.status || evalStatus?.status || '')
      .toLowerCase()
      .trim();
    // Still taking the course — do not count as "closed" for unlocking the next semester.
    if (st === 'ongoing') return false;
    const gradeStr =
      gradeRaw != null && String(gradeRaw).trim() !== ''
        ? String(gradeRaw).trim()
        : '';
    if (gradeStr) {
      const n = parseFloat(gradeStr);
      if (!Number.isNaN(n)) return true;
      // Letter or symbolic grade (e.g. F, UD) still means the term outcome was recorded.
      return true;
    }
    if (
      st === 'failed' ||
      st === 'fail' ||
      st === 'f' ||
      st === 'inc' ||
      st === 'incomplete' ||
      st === 'dropped' ||
      st.includes('fail') ||
      st === 'not passed'
    ) {
      return true;
    }
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

  // Show year 1, then each next year only after the previous year is fully completed.
  const getVisibleYearLevels = () => {
    const sorted = [...yearLevels].map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    if (sorted.length === 0) return [];

    const visible = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prevYear = sorted[i - 1];
      if (isYearLevelFullyCompleted(prevYear)) {
        visible.push(sorted[i]);
      } else {
        break;
      }
    }
    return visible;
  };

  // Filter semesters within a year level
  const getVisibleSemesters = (yearLevelId) => {
    const allSemesters = groupBySemester(yearLevelId);
    const visibleSemesters = [];
    const sortedYearLevels = [...yearLevels]
      .map(Number)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    const minYear = sortedYearLevels.length ? sortedYearLevels[0] : null;
    const ylNum = Number(yearLevelId);

    for (let i = 0; i < allSemesters.length; i++) {
      const semester = allSemesters[i];

      if (i === 0) {
        if (minYear != null && ylNum === minYear) {
          visibleSemesters.push(semester);
        } else {
          const idx = sortedYearLevels.indexOf(ylNum);
          const prevYear = idx > 0 ? sortedYearLevels[idx - 1] : null;
          if (prevYear != null && isYearLevelFullyCompleted(prevYear)) {
            visibleSemesters.push(semester);
          }
        }
      } else {
        const prevSem = allSemesters[i - 1];
        const prevSemFullyEvaluated =
          prevSem.rows.length > 0 &&
          prevSem.rows.every((row) => rowHasRecordedEvaluation(row));
        if (prevSemFullyEvaluated) {
          visibleSemesters.push(semester);
        }
      }
    }

    return visibleSemesters;
  };

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

  // Check if all prerequisites are passed
  const arePrerequisitesPassed = (row) => {
    const subject = row.subject || row;
    const prerequisites = row.prerequisites || subject.prerequisites || [];
    
    if (prerequisites.length === 0) return { passed: true, failedPrereqs: [] };
    
    const failedPrereqs = [];
    
    for (const prereq of prerequisites) {
      // Get the prerequisite subject code
      const prereqCode = prereq.subject_code || prereq.prereq_subject_code || 
                         prereq.requiredSubject?.subject_code;
      
      // Find the subject_id for this prerequisite code
      const prereqSubject = curriculum.find((item) => {
        const code = item.subject_code || item.subject?.subject_code;
        return code === prereqCode;
      });
      
      if (!prereqSubject) continue;
      
      const prereqSubjectId = prereqSubject.subject_id || prereqSubject.subject?.subject_id;

      if (isRowTransferCredited(prereqSubject)) {
        continue;
      }
      
      // Check if prerequisite is passed
      const enrollment = getEnrollmentStatus(prereqSubjectId);
      const evaluation = getEvaluationStatus(prereqSubjectId);
      
      const isPassed = enrollment?.completed || 
                       enrollment?.status === 'passed' ||
                       enrollment?.status === 'completed' ||
                       parseFloat(enrollment?.grade || 0) >= 50 ||
                       parseFloat(evaluation?.grade || 0) >= 50;
      
      const isFailed = enrollment?.status === 'failed' ||
                        evaluation?.status === 'failed' ||
                        parseFloat(enrollment?.grade || 0) < 50 ||
                        parseFloat(evaluation?.grade || 0) < 50;
      
      // If explicitly failed, add to failed list
      if (isFailed && !isPassed) {
        failedPrereqs.push(prereqCode);
      }
    }
    
    return { 
      passed: failedPrereqs.length === 0, 
      failedPrereqs 
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
        <button
          type="button"
          className="student-curriculum-download-eval"
          onClick={openEvalPdfModal}
          disabled={evaluationPdfLoading}
        >
          {evaluationPdfLoading && !evalPdfModalOpen ? 'Loading…' : 'Download evaluation report'}
        </button>
      </div>

      <EvaluationPdfSemesterModal
        open={evalPdfModalOpen}
        onClose={closeEvalPdfModal}
        options={evalPdfSemesterOptions}
        loading={evaluationPdfLoading}
        onConfirm={confirmEvalPdfDownload}
      />

      {error && <div className="error-message">{error}</div>}

      {curriculum.length === 0 && !loading && (
        <div className="no-data">No curriculum data found. Please contact your administrator.</div>
      )}

      {yearLevels.length > 0 && (
        <div className="filter-section student-curriculum-year-tabs">
          {getVisibleYearLevels().map((yearLevelId) => {
            const yl = Number(yearLevelId);
            const row = curriculum.find(
              (item) => Number(item.year_level_id || item.year_level?.year_level_id) === yl
            );
            const name =
              row?.year_level_name ||
              row?.year_level?.year_level ||
              ordinalYearLabel(yl);

            return (
              <button
                key={yearLevelId}
                type="button"
                className={
                  Number(selectedYearLevel) === yl ? 'year-tab-pill active' : 'year-tab-pill'
                }
                onClick={() => setSelectedYearLevel(yl)}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {selectedYearLevel != null && curriculum.length > 0 && (
        <div className="year-group">
          <div className="year-group-header">
            <div className="curriculum-header-block">
              <div className="curriculum-header-school">Cagayan de Oro College</div>
              <div className="curriculum-header-program">{programLine}</div>
              <div className="curriculum-header-year">{yearLabel.toUpperCase()}</div>
            </div>
          </div>

          <div className="semesters-stacked-container">
            {getVisibleSemesters(selectedYearLevel).map((semester) => (
              <div key={semester.id} className="semester-section">
                <div className="semester-section-header">
                  <h3>
                    {yearLabel.toUpperCase()} — {(semester.name || '').toUpperCase()}
                  </h3>
                </div>
                <div className="table-container">
                  <table className="data-table semester-table student-curriculum-table">
                    <thead>
                      <tr>
                        <th>Subject Code</th>
                        <th>Pre/Co-requisite</th>
                        <th>Description</th>
                        <th>Units</th>
                        <th>Hours</th>
                        <th>Passing Grade</th>
                        <th>Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semester.rows.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="no-subjects">
                            No subjects
                          </td>
                        </tr>
                      ) : (
                        semester.rows.map((row) => {
                          const sid = row.subject_id || row.subject?.subject_id;
                          const enrollment = sid ? getEnrollmentStatus(sid) : null;
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

                          // Check prerequisite eligibility
                          const prereqCheck = arePrerequisitesPassed(row);
                          const notEligible =
                            !transferCredited && !prereqCheck.passed && !done;

                          return (
                            <tr
                              key={row.curriculum_id || `${sid}-${semester.id}`}
                              className={done ? 'student-curriculum-row-passed' : ''}
                            >
                              <td>
                                <strong style={{ color: '#2563eb' }}>{code}</strong>
                              </td>
                              <td className="prereq-cell">{prereq}</td>
                              <td>{title}</td>
                              <td>{units}</td>
                              <td>{hours}</td>
                              <td>{passing}</td>
                              <td>{type}</td>
                              <td className="student-curriculum-status-td">
                                {transferCredited ? (
                                  <span className="student-curriculum-status-inline">
                                    <span className="status-badge status-credited">Credited</span>
                                    <span className="student-curriculum-credit-note">Transfer credit</span>
                                  </span>
                                ) : notEligible ? (
                                  <span className="status-badge status-not-eligible">
                                    Not Eligible
                                  </span>
                                ) : enrollment ? (
                                  <span className="student-curriculum-status-inline">
                                    <span
                                      className={`status-badge status-${(enrollment.status || '')
                                        .toLowerCase()
                                        .replace(/\s+/g, '-')}`}
                                    >
                                      {enrollment.status || '—'}
                                    </span>
                                    {enrollment.grade != null && enrollment.grade !== '' && (
                                      <span className="student-curriculum-grade">
                                        Grade: {enrollment.grade}
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="muted-status">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCurriculum;
