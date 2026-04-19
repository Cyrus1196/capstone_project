import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { swalToast, swalError, swalConfirm, swalInfo } from '../../utils/swal';
import PromoteSemesterModal from './PromoteSemesterModal';
import {
  evaluatorGradesEquivalent,
  getGradeDisplayParts,
  gradeRawToEvaluatorFormValue,
} from '../../utils/gradePercentageConversion';
import './StudentEvaluationView.css';

/** Row completion from server data only (matches sequential unlock in renderTable). */
function isRowGradableForTermGate(row) {
  return row.subject_id != null && row.subject_id !== '';
}

function isTransferCreditRowForTermGate(row) {
  return row?.passed_via_transfer_credit === true || String(row?.status || '').toLowerCase() === 'credit';
}

function isEvalRowCompleteFromServerRow(row) {
  if (isTransferCreditRowForTermGate(row)) return true;
  if (!isRowGradableForTermGate(row)) return true;
  const status = String(row.status || '')
    .toLowerCase()
    .trim();
  if (status === 'ongoing') return false;
  if (
    status === 'passed' ||
    status === 'pass' ||
    status === 'failed' ||
    status === 'fail' ||
    status === 'f' ||
    status === 'inc' ||
    status === 'incomplete'
  ) {
    return true;
  }
  if (row.grade != null && String(row.grade).trim() !== '') return true;
  return false;
}

/** Promotion only: allow failed / empty / INC on record; block only explicit “ongoing” (no final yet). */
function isEvalRowBlockingSemesterPromotion(row) {
  if (isTransferCreditRowForTermGate(row)) return false;
  if (!isRowGradableForTermGate(row)) return false;
  const status = String(row.status || '')
    .toLowerCase()
    .trim();
  return status === 'ongoing';
}

function passingForEvalRow(row) {
  return row.passing_grade != null && row.passing_grade !== '' ? row.passing_grade : '50';
}

function formatEvalGradeReadonly(gradeRaw, row) {
  if (gradeRaw == null || String(gradeRaw).trim() === '') return '';
  const p = getGradeDisplayParts(gradeRaw, passingForEvalRow(row));
  if (!p) return String(gradeRaw);
  if (p.isLetter) return p.primaryText;
  return p.primaryText;
}

/** UI uses `inc`; API stores `incomplete`. */
function normalizeStatusForUi(status) {
  if (status == null || status === '') return '';
  const t = String(status).trim().toLowerCase();
  if (t === 'incomplete') return 'inc';
  return String(status).trim();
}

/** Grade + status when choosing a remark button (P / F / clear). Pass–fail evaluation only. */
function gradeAndStatusForRemarkClick(status) {
  if (status === '') return { status: '', grade: '' };
  if (status === 'passed') return { status: 'passed', grade: '75' };
  if (status === 'failed') return { status: 'failed', grade: '49' };
  return { status, grade: '' };
}

/** Stable React key / draft key for one curriculum evaluation row. */
function getEvaluationRowKey(row) {
  if (row.curriculum_id != null && row.curriculum_id !== '') {
    return `cur-${row.curriculum_id}`;
  }
  if (row.evaluation_id) {
    return `eval-${row.evaluation_id}`;
  }
  return `new-${row.subject_id}-${row.academic_year_id}-${row.semester_id}`;
}

function mergeEvalRowWithDrafts(row, drafts, keyFn) {
  const key = keyFn(row);
  const d = drafts[key];
  if (!d) return row;
  let status = row.status;
  let grade = row.grade;
  if (d.status !== '' && d.status != null) {
    status = d.status === 'inc' ? 'incomplete' : d.status;
  }
  if (d.grade !== '' && d.grade != null && String(d.grade).trim() !== '') {
    grade = d.grade;
  }
  return { ...row, status, grade };
}

function normalizeEvalSubjectCode(code) {
  return String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function findEvalRowBySubjectCode(rows, code) {
  const c = normalizeEvalSubjectCode(code);
  if (!c) return null;
  return rows.find((r) => normalizeEvalSubjectCode(r.subject_code) === c) ?? null;
}

/**
 * Promote modal / summary text. StudentCurriculumEvaluationBuilder sets `prerequisite` null but
 * sends prerequisite codes in `prerequisite_subject_codes` (same data Curriculum Management shows as "P: …").
 */
function formatPromotionPrerequisiteDisplay(row) {
  const direct = row?.prerequisite != null ? String(row.prerequisite).trim() : '';
  if (direct) return direct;
  const pre = row?.prerequisite_subject_codes;
  const co = row?.corequisite_subject_codes;
  const parts = [];
  if (Array.isArray(pre) && pre.length > 0) {
    const list = pre.map((c) => String(c).trim()).filter(Boolean);
    if (list.length) parts.push(`P: ${list.join(', ')}`);
  }
  if (Array.isArray(co) && co.length > 0) {
    const list = co.map((c) => String(c).trim()).filter(Boolean);
    if (list.length) parts.push(`Co: ${list.join(', ')}`);
  }
  if (parts.length) return parts.join(' · ');
  return '';
}

/** Same rule as student My Curriculum: only prerequisites block; corequisites are concurrent. */
function evalRowPrerequisitesMet(allRows, targetRow) {
  const pre = targetRow.prerequisite_subject_codes;
  const codes = [...(Array.isArray(pre) ? pre : [])];
  const seen = new Set();
  if (codes.length === 0) return true;
  for (const code of codes) {
    const cn = normalizeEvalSubjectCode(code);
    if (!cn || seen.has(cn)) continue;
    seen.add(cn);
    const pr = findEvalRowBySubjectCode(allRows, code);
    if (!pr) continue;
    if (pr.passed_via_transfer_credit === true) continue;
    const st = String(pr.status || '')
      .toLowerCase()
      .trim();
    if (st === 'inc' || st === 'incomplete') return false;
    if (st === 'passed' || st === 'pass' || st === 'credit') continue;
    const pg =
      pr.passing_grade != null && pr.passing_grade !== '' && !Number.isNaN(parseFloat(pr.passing_grade))
        ? parseFloat(pr.passing_grade)
        : 50;
    const rawG = pr.grade;
    const g =
      rawG != null && String(rawG).trim() !== '' && !Number.isNaN(parseFloat(rawG))
        ? parseFloat(rawG)
        : null;
    if (g != null && g >= pg) continue;
    if (st === 'failed' || st === 'fail' || st === 'f') return false;
    if (g != null && g < pg) return false;
    return false;
  }
  return true;
}

/**
 * @param {object} props
 * @param {'need-evaluation'|'already-evaluated'} [props.listMode]
 * @param {'pending'|'completed'|'all'} [props.listScope] — API student list filter (default follows listMode).
 * @param {'default'|'curriculumTracking'} [props.variant] — Curriculum tab: Figma-style copy and all-student list.
 */
const EVALUATION_WORK_PERMS = [
  'Student Evaluation',
  'evaluation.view',
  'evaluation.create',
  'evaluation.edit',
  'evaluation.approve',
];

const StudentEvaluationView = ({
  listMode = 'need-evaluation',
  listScope: listScopeProp,
  variant = 'default',
}) => {
  const { user, isAdmin, isFaculty, isProgramHead, hasPermission, hasAnyPermission } = useAuth();
  const canEdit = !!(isAdmin || isFaculty || isProgramHead || hasAnyPermission(EVALUATION_WORK_PERMS));
  /** Evaluators review imported grades only; they store “evaluation complete” but do not edit rows. */
  const isEvaluatorOnly = user?.role === 'Evaluator';
  const canEditEvaluationRows = canEdit && !isEvaluatorOnly;
  const canEditNumericGrades = canEditEvaluationRows;
  const isEvaluatedModule = listMode === 'already-evaluated';
  const isCurriculumTracking = variant === 'curriculumTracking';
  const resolvedListScope =
    listScopeProp ?? (isEvaluatedModule ? 'completed' : 'pending');

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Track all drafts and which ones have been modified
  const [drafts, setDrafts] = useState({});
  const [modifiedKeys, setModifiedKeys] = useState(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [completions, setCompletions] = useState([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [storingRecord, setStoringRecord] = useState(false);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteEvaluatedBy, setPromoteEvaluatedBy] = useState('');
  const [promoteSaving, setPromoteSaving] = useState(false);
  const prevEvalStudentIdRef = useRef(null);

  const [listProgramFilter, setListProgramFilter] = useState('');
  const [evalFilterYearId, setEvalFilterYearId] = useState('');
  const [evalFilterSemesterId, setEvalFilterSemesterId] = useState('');
  const [evalFilterAyId, setEvalFilterAyId] = useState('');
  const getRowKey = getEvaluationRowKey;

  const mergedRowsForPrereq = useMemo(() => {
    if (!data?.rows?.length) return [];
    return data.rows.map((row) => mergeEvalRowWithDrafts(row, drafts, getEvaluationRowKey));
  }, [data?.rows, drafts]);

  /** API may use incomplete; UI uses inc — treat as equivalent. */
  const normalizeStatusForCompare = (s) => {
    if (s === '' || s == null) return '';
    const t = String(s).trim().toLowerCase();
    if (t === 'inc' || t === 'incomplete') return 'incomplete';
    return t;
  };

  const draftMatchesSavedRow = (draftGrade, draftStatus, row, draftDeadline = '') => {
    const gradeOk =
      evaluatorGradesEquivalent(draftGrade, row.grade, passingForEvalRow(row)) &&
      normalizeStatusForCompare(draftStatus) === normalizeStatusForCompare(row.status);
    if (!gradeOk) return false;
    if (normalizeStatusForCompare(draftStatus) !== 'incomplete') return true;
    const rowD = row.inc_compliance_deadline
      ? String(row.inc_compliance_deadline).slice(0, 10)
      : '';
    const d = draftDeadline ? String(draftDeadline).slice(0, 10) : '';
    return rowD === d;
  };

  const isRowGradable = (row) =>
    row.subject_id != null && row.subject_id !== '';

  /** Approved transfer credit — show as credited; do not overwrite with class grades. */
  const isTransferCreditRow = (row) =>
    row?.passed_via_transfer_credit === true ||
    String(row?.status || '').toLowerCase() === 'credit';

  const fetchStudentList = useCallback(
    async (search = '') => {
      setLoadingList(true);
      try {
        const params = {
          search: search || undefined,
        };
        if (resolvedListScope !== 'all') {
          params.academic_record = resolvedListScope;
        }
        const response = await api.get('/evaluation/students', { params });
        const list = response.data.students || [];
        setStudents(list);
        setSelectedStudent((prev) => {
          if (!prev) return prev;
          const found = list.find((s) => s.student_id === prev.student_id);
          return found || prev;
        });
      } catch (err) {
        console.error('Error fetching student list:', err);
        setStudents([]);
      } finally {
        setLoadingList(false);
      }
    },
    [resolvedListScope]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudentList(searchTerm);
    }, searchTerm ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchStudentList]);

  const programOptions = useMemo(() => {
    const m = new Map();
    students.forEach((s) => {
      const id = s.program?.program_id ?? s.program_id;
      if (id == null || id === '') return;
      const name = s.program_name || s.program?.program_name || `Program ${id}`;
      m.set(String(id), name);
    });
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!listProgramFilter) return students;
    return students.filter(
      (s) => String(s.program?.program_id ?? s.program_id ?? '') === listProgramFilter
    );
  }, [students, listProgramFilter]);

  /** Evaluators may only file “evaluation complete” when at least one gradable row has an imported grade. */
  const evaluatorHasImportedGrades = useMemo(() => {
    if (!isEvaluatorOnly || !data?.rows?.length) return true;
    return data.rows.some(
      (r) =>
        isRowGradable(r) &&
        !isTransferCreditRow(r) &&
        r.grade != null &&
        String(r.grade).trim() !== ''
    );
  }, [isEvaluatorOnly, data?.rows]);

  const evaluationFilterOptions = useMemo(() => {
    if (!data?.rows?.length) {
      return { years: [], academicYears: [], programLabel: '' };
    }
    const rows = data.rows;
    const yearsMap = new Map();
    const ayMap = new Map();
    rows.forEach((r) => {
      if (r.year_level_id != null && r.year_level_id !== '') {
        const label = r.year_level_name || `Year ${r.year_level_id}`;
        yearsMap.set(String(r.year_level_id), { id: String(r.year_level_id), label });
      }
      if (r.academic_year_id != null && r.academic_year_id !== '') {
        ayMap.set(String(r.academic_year_id), {
          id: String(r.academic_year_id),
          label: `A.Y. ${r.academic_year_id}`,
        });
      }
    });
    const years = [...yearsMap.values()].sort((a, b) => Number(a.id) - Number(b.id));
    const academicYears = [...ayMap.values()].sort((a, b) => Number(a.id) - Number(b.id));
    const programLabel =
      data.student?.program?.program_name ||
      data.student?.program?.program_code ||
      'Program';
    return { years, academicYears, programLabel };
  }, [data]);

  const orderedCurriculumTerms = useMemo(() => {
    if (!data?.rows?.length) return [];
    const m = new Map();
    data.rows.forEach((r) => {
      const y = r.year_level_id;
      const s = r.semester_id;
      if (y == null || y === '' || s == null || s === '') return;
      const k = `${y}-${s}`;
      if (!m.has(k)) {
        m.set(k, {
          year_level_id: String(y),
          semester_id: String(s),
          year_level_name: r.year_level_name,
          semester_name: r.semester_name,
        });
      }
    });
    return [...m.values()].sort((a, b) => {
      const dy = Number(a.year_level_id) - Number(b.year_level_id);
      if (dy !== 0) return dy;
      return Number(a.semester_id) - Number(b.semester_id);
    });
  }, [data?.rows]);

  /** Index of the term the student was last promoted into (so filters can reach that year/semester). */
  const promotionTargetTermIndex = useMemo(() => {
    if (!orderedCurriculumTerms.length || !data?.student?.promoted_next_sem_at) return -1;
    const ty = data.student.promotion_target_year_level_id;
    const ts = data.student.promotion_target_semester_id;
    if (ty == null || ty === '' || ts == null || ts === '') return -1;
    const idx = orderedCurriculumTerms.findIndex(
      (t) => String(t.year_level_id) === String(ty) && String(t.semester_id) === String(ts)
    );
    return idx >= 0 ? idx : -1;
  }, [data?.student, orderedCurriculumTerms]);

  /**
   * Deepest term index the user may view: first incomplete term (strict), or last if all complete —
   * extended through the official promotion target so staff can open the next year after promoting.
   */
  const maxSelectableTermIndex = useMemo(() => {
    if (!orderedCurriculumTerms.length || !data?.rows?.length) return -1;
    const rows = data.rows;
    const termComplete = (t) => {
      const tr = rows.filter(
        (r) => String(r.year_level_id) === t.year_level_id && String(r.semester_id) === t.semester_id
      );
      return tr.length > 0 && tr.every((r) => isEvalRowCompleteFromServerRow(r));
    };
    let strictMax = orderedCurriculumTerms.length - 1;
    for (let i = 0; i < orderedCurriculumTerms.length; i++) {
      if (!termComplete(orderedCurriculumTerms[i])) {
        strictMax = i;
        break;
      }
    }
    const last = orderedCurriculumTerms.length - 1;
    if (promotionTargetTermIndex >= 0) {
      return Math.min(Math.max(strictMax, promotionTargetTermIndex), last);
    }
    return strictMax;
  }, [data?.rows, orderedCurriculumTerms, promotionTargetTermIndex]);

  const allowedTerms = useMemo(() => {
    if (maxSelectableTermIndex < 0 || !orderedCurriculumTerms.length) return [];
    return orderedCurriculumTerms.slice(0, maxSelectableTermIndex + 1);
  }, [orderedCurriculumTerms, maxSelectableTermIndex]);

  const allowedTermKeySet = useMemo(
    () => new Set(allowedTerms.map((t) => `${t.year_level_id}-${t.semester_id}`)),
    [allowedTerms]
  );

  const currentTermComplete = useMemo(() => {
    if (!data?.rows?.length || !evalFilterYearId || !evalFilterSemesterId) return false;
    const key = `${evalFilterYearId}-${evalFilterSemesterId}`;
    if (!allowedTermKeySet.has(key)) return false;
    const tr = data.rows.filter(
      (r) =>
        String(r.year_level_id) === String(evalFilterYearId) &&
        String(r.semester_id) === String(evalFilterSemesterId)
    );
    return tr.length > 0 && tr.every((r) => isEvalRowCompleteFromServerRow(r));
  }, [data?.rows, evalFilterYearId, evalFilterSemesterId, allowedTermKeySet]);

  /** Looser than currentTermComplete: irregular students may promote with fails or empty retake slots. */
  const currentTermCompleteForPromotion = useMemo(() => {
    if (!data?.rows?.length || !evalFilterYearId || !evalFilterSemesterId) return false;
    const key = `${evalFilterYearId}-${evalFilterSemesterId}`;
    if (!allowedTermKeySet.has(key)) return false;
    const tr = data.rows.filter(
      (r) =>
        String(r.year_level_id) === String(evalFilterYearId) &&
        String(r.semester_id) === String(evalFilterSemesterId)
    );
    return tr.length > 0 && tr.every((r) => !isEvalRowBlockingSemesterPromotion(r));
  }, [data?.rows, evalFilterYearId, evalFilterSemesterId, allowedTermKeySet]);

  const nextPromotionTerm = useMemo(() => {
    const terms = orderedCurriculumTerms;
    if (!terms.length || !evalFilterYearId || !evalFilterSemesterId) return null;
    if (!currentTermCompleteForPromotion) return null;
    const curIdx = terms.findIndex(
      (t) => t.year_level_id === String(evalFilterYearId) && t.semester_id === String(evalFilterSemesterId)
    );
    if (curIdx < 0 || curIdx >= terms.length - 1) return null;
    return terms[curIdx + 1];
  }, [orderedCurriculumTerms, evalFilterYearId, evalFilterSemesterId, currentTermCompleteForPromotion]);

  const yearsAllowedForFilter = useMemo(() => {
    const ids = new Set(allowedTerms.map((t) => t.year_level_id));
    return evaluationFilterOptions.years.filter((y) => ids.has(y.id));
  }, [allowedTerms, evaluationFilterOptions.years]);

  const semesterOptionsForYear = useMemo(() => {
    if (!data?.rows?.length || !evalFilterYearId || !allowedTermKeySet.size) return [];
    const m = new Map();
    data.rows
      .filter((r) => String(r.year_level_id) === String(evalFilterYearId))
      .forEach((r) => {
        if (r.semester_id == null || r.semester_id === '') return;
        const pair = `${r.year_level_id}-${r.semester_id}`;
        if (!allowedTermKeySet.has(pair)) return;
        const label = r.semester_name || `Semester ${r.semester_id}`;
        m.set(String(r.semester_id), { id: String(r.semester_id), label });
      });
    return [...m.values()].sort((a, b) => Number(a.id) - Number(b.id));
  }, [data, evalFilterYearId, allowedTermKeySet]);

  const promotionModalRows = useMemo(() => {
    if (!nextPromotionTerm || !data?.rows?.length) return [];
    return data.rows.filter(
      (r) =>
        String(r.year_level_id) === nextPromotionTerm.year_level_id &&
        String(r.semester_id) === nextPromotionTerm.semester_id
    );
  }, [data?.rows, nextPromotionTerm]);

  const promotionTableRows = useMemo(
    () =>
      promotionModalRows.map((r) => ({
        penCode: r.subject_code || '—',
        title: r.subject_name || '—',
        units: r.units ?? 0,
        prerequisite: formatPromotionPrerequisiteDisplay(r) || 'NONE',
      })),
    [promotionModalRows]
  );

  const promotionModalTotalUnits = useMemo(
    () => promotionModalRows.reduce((acc, r) => acc + (Number(r.units) || 0), 0),
    [promotionModalRows]
  );

  const promotionCurriculumLabel = useMemo(() => {
    if (!promotionModalRows.length) return '—';
    const ay = promotionModalRows[0]?.academic_year_id;
    if (ay == null || ay === '') return '—';
    const match = evaluationFilterOptions.academicYears.find((o) => o.id === String(ay));
    return match?.label || `A.Y ${ay}`;
  }, [promotionModalRows, evaluationFilterOptions.academicYears]);

  useEffect(() => {
    if (!data?.rows?.length || !allowedTerms.length) {
      setEvalFilterYearId('');
      setEvalFilterSemesterId('');
      setEvalFilterAyId('');
      return;
    }
    const sid = data.student?.student_id;
    if (prevEvalStudentIdRef.current !== sid) {
      prevEvalStudentIdRef.current = sid;
      const t = allowedTerms[allowedTerms.length - 1];
      setEvalFilterYearId(t.year_level_id);
      setEvalFilterSemesterId(t.semester_id);
      setEvalFilterAyId('');
    }
  }, [data?.student?.student_id, data?.rows, allowedTerms]);

  useEffect(() => {
    if (!allowedTermKeySet.size || !evalFilterYearId || !evalFilterSemesterId) return;
    const cur = `${evalFilterYearId}-${evalFilterSemesterId}`;
    if (allowedTermKeySet.has(cur)) return;
    const t = allowedTerms[allowedTerms.length - 1];
    setEvalFilterYearId(t.year_level_id);
    setEvalFilterSemesterId(t.semester_id);
  }, [allowedTermKeySet, allowedTerms, evalFilterYearId, evalFilterSemesterId]);

  useEffect(() => {
    if (!semesterOptionsForYear.length) return;
    const ok = semesterOptionsForYear.some((o) => o.id === evalFilterSemesterId);
    if (!ok) setEvalFilterSemesterId(semesterOptionsForYear[0].id);
  }, [semesterOptionsForYear, evalFilterSemesterId]);

  const fetchCompletionsForStudent = useCallback(async (studentId) => {
    if (!studentId) {
      setCompletions([]);
      return;
    }
    try {
      const res = await api.get('/evaluation/academic-record/completions', {
        params: { student_id: studentId },
      });
      setCompletions(res.data.completions || []);
    } catch {
      setCompletions([]);
    }
  }, []);

  useEffect(() => {
    if (!isEvaluatedModule) {
      setCompletions([]);
      return undefined;
    }
    const sid = selectedStudent?.student_id;
    if (!sid) {
      setCompletions([]);
      return undefined;
    }
    fetchCompletionsForStudent(sid);
    return undefined;
  }, [selectedStudent?.student_id, fetchCompletionsForStudent, isEvaluatedModule]);

  // Initialize drafts when student evaluation data changes
  useEffect(() => {
    if (!data?.rows) return;

    const next = {};
    data.rows.forEach((row) => {
      const key = getRowKey(row);
      next[key] = {
        grade: gradeRawToEvaluatorFormValue(row.grade ?? '', passingForEvalRow(row)),
        status: normalizeStatusForUi(row.status ?? ''),
        inc_compliance_deadline: row.inc_compliance_deadline
          ? String(row.inc_compliance_deadline).slice(0, 10)
          : '',
        subject_id: row.subject_id,
        curriculum_id: row.curriculum_id,
        academic_year_id: row.academic_year_id,
        semester_id: row.semester_id,
        evaluation_id: row.evaluation_id,
        passed_via_transfer_credit: row.passed_via_transfer_credit === true,
      };
    });
    setDrafts(next);
    setModifiedKeys(new Set());
    setSaveError('');
  }, [data]);

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle student selection from list
  const handleStudentSelect = async (student) => {
    // Check for unsaved changes
    if (modifiedKeys.size > 0) {
      const confirmed = await swalConfirm(
        'Unsaved Changes',
        `You have ${modifiedKeys.size} unsaved changes. Discard them?`,
        'Discard',
        'Cancel'
      );
      if (!confirmed) return;
    }

    setSelectedStudent(student);
    setCompletionNotes('');
    setError('');
    setLoading(true);

    try {
      const response = await api.get(`/evaluation/student/${encodeURIComponent(student.student_id_number)}`);
      setData(response.data);
    } catch (err) {
      console.error('Error fetching student evaluation:', err);
      setData(null);
      const msg = err.response?.data?.message || 'Failed to load student evaluation';
      setError(msg);
      await swalError('Could not load evaluation', msg);
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (row, patch) => {
    const key = getRowKey(row);
    const base = drafts[key] || { grade: '', status: '', inc_compliance_deadline: '' };
    const merged = { ...base, ...patch };
    if (merged.status !== 'inc') {
      merged.inc_compliance_deadline = '';
    }
    setDrafts({ ...drafts, [key]: merged });
    setModifiedKeys((prev) => {
      const next = new Set(prev);
      if (draftMatchesSavedRow(merged.grade, merged.status, row, merged.inc_compliance_deadline)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Batch update status for multiple rows
  const batchUpdateStatus = (rows, status) => {
    const gradable = rows.filter((row) => {
      if (!isRowGradable(row) || isTransferCreditRow(row)) return false;
      const mi = data?.rows ? data.rows.findIndex((r) => getRowKey(r) === getRowKey(row)) : -1;
      const mergedTarget = mi >= 0 ? mergedRowsForPrereq[mi] : row;
      return evalRowPrerequisitesMet(mergedRowsForPrereq, mergedTarget);
    });
    if (gradable.length === 0) {
      swalToast(
        'info',
        'No rows to update here (elective slots need a subject, all rows are transfer-credited, or every course is blocked until prerequisites are passed on record).'
      );
      return;
    }

    const nextDrafts = { ...drafts };
    for (const row of gradable) {
      const key = getRowKey(row);
      const currentDraft = nextDrafts[key] || {};
      let newGrade;
      if (status === '') {
        newGrade = '';
      } else if (status === 'passed') {
        newGrade = '75';
      } else if (status === 'failed') {
        newGrade = '49';
      } else {
        newGrade =
          currentDraft.grade === '' || currentDraft.grade == null
            ? ''
            : String(currentDraft.grade);
      }

      nextDrafts[key] = {
        ...currentDraft,
        status,
        grade: newGrade,
        inc_compliance_deadline: '',
      };
    }

    const nextModified = new Set(modifiedKeys);
    for (const row of gradable) {
      const key = getRowKey(row);
      const d = nextDrafts[key];
      if (draftMatchesSavedRow(d.grade, d.status, row, d.inc_compliance_deadline)) {
        nextModified.delete(key);
      } else {
        nextModified.add(key);
      }
    }

    setDrafts(nextDrafts);
    setModifiedKeys(nextModified);

    if (status === '') {
      const clearedPendingSave = gradable.filter((row) => nextModified.has(getRowKey(row))).length;
      if (clearedPendingSave === 0) {
        swalToast(
          'info',
          'Nothing new to clear — these rows already match what is saved. Use bottom “Clear All” to discard unsaved edits in other rows.'
        );
      } else {
        swalToast(
          'success',
          `Cleared ${clearedPendingSave} subject(s) in the form. Click “Save All Changes” to update the server, or “Clear All” below to undo.`
        );
      }
    } else {
      swalToast('success', `Updated ${gradable.length} subject(s) to "${status}"`);
    }
  };

  // Save all modified evaluations at once
  const handleSaveAll = async () => {
    if (!canEditEvaluationRows || !selectedStudent || !data?.student?.student_id) return;
    if (modifiedKeys.size === 0) {
      swalToast('info', 'No changes to save');
      return;
    }

    setSavingAll(true);
    setSaveError('');

    const savePromises = [];
    const results = { success: 0, failed: 0, errors: [] };

    for (const key of modifiedKeys) {
      const draft = drafts[key];
      if (!draft || draft.subject_id == null || draft.subject_id === '') continue;
      if (draft.passed_via_transfer_credit) continue;

      const gradeValue =
        draft.grade === '' || draft.grade == null ? null : draft.grade;
      const evaluation_status =
        draft.status === '' || draft.status == null
          ? null
          : draft.status === 'inc'
            ? 'incomplete'
            : draft.status;
      const clearingOnly =
        gradeValue == null && evaluation_status == null && draft.evaluation_id;
      const hasValues = gradeValue != null || evaluation_status != null;
      // Allow save when clearing an existing evaluation (PUT nulls). Skip POST with no data.
      if (!hasValues && !clearingOnly) continue;

      const rowForKey = data.rows.find((r) => getRowKey(r) === key);
      const mi = rowForKey != null ? data.rows.indexOf(rowForKey) : -1;
      const mergedTarget = mi >= 0 ? mergedRowsForPrereq[mi] : null;
      if (
        hasValues &&
        mergedTarget &&
        !evalRowPrerequisitesMet(mergedRowsForPrereq, mergedTarget)
      ) {
        results.failed++;
        results.errors.push(
          'Prerequisites are not satisfied for one or more subjects; fix or clear those rows first.'
        );
        continue;
      }

      const savePromise = (async () => {
        try {
          const incPayload =
            evaluation_status === 'incomplete'
              ? {
                  inc_compliance_deadline:
                    draft.inc_compliance_deadline &&
                    String(draft.inc_compliance_deadline).trim() !== ''
                      ? String(draft.inc_compliance_deadline).slice(0, 10)
                      : null,
                }
              : {};
          if (draft.evaluation_id) {
            await api.put(`/evaluation/${draft.evaluation_id}`, {
              grade: gradeValue,
              evaluation_status,
              ...incPayload,
            });
          } else {
            await api.post('/evaluation', {
              student_id: data.student.student_id,
              subject_id: draft.subject_id,
              academic_year_id: draft.academic_year_id,
              semester_id: draft.semester_id,
              grade: gradeValue,
              evaluation_status,
              ...incPayload,
            });
          }
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(err.response?.data?.message || 'Save failed');
        }
      })();

      savePromises.push(savePromise);
    }

    await Promise.all(savePromises);

    setSavingAll(false);

    if (results.failed > 0) {
      setSaveError(`${results.failed} of ${modifiedKeys.size} saves failed`);
      swalError('Partial Save Failure', `${results.failed} evaluations could not be saved`);
    } else {
      swalToast('success', `Saved ${results.success} evaluations`);
      setModifiedKeys(new Set());
      // Refresh data
      const response = await api.get(`/evaluation/student/${encodeURIComponent(selectedStudent.student_id_number)}`);
      setData(response.data);
    }
  };

  const formatStoredDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return String(iso);
    }
  };

  const persistAcademicRecordComplete = async (notesText) => {
    if (!canEdit || !data?.student?.student_id) return;
    setStoringRecord(true);
    try {
      await api.post('/evaluation/academic-record/complete', {
        student_id: data.student.student_id,
        notes: notesText?.trim() ? notesText.trim() : undefined,
      });
      swalToast('success', 'Evaluation record stored');
      setCompletionNotes('');
      if (isEvaluatedModule && data.student.student_id) {
        await fetchCompletionsForStudent(data.student.student_id);
      }
      await fetchStudentList(searchTerm);
    } catch (err) {
      await swalError('Could not store record', err.response?.data?.message || 'Request failed');
    } finally {
      setStoringRecord(false);
    }
  };

  const handleStoreAcademicRecord = () => persistAcademicRecordComplete(completionNotes);

  const handleNeedViewStoreClick = async () => {
    if (!canEdit || !data?.student?.student_id) return;
    const { value, isConfirmed } = await Swal.fire({
      title: 'Store evaluation record',
      text: 'This logs a completed review and moves the student to Evaluated students.',
      input: 'textarea',
      inputLabel: 'Notes (optional)',
      inputPlaceholder: 'e.g. Verified curriculum progress for SY 2025–2026',
      showCancelButton: true,
      confirmButtonText: 'Store',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (!isConfirmed) return;
    await persistAcademicRecordComplete(typeof value === 'string' ? value : '');
  };

  const handleDeleteStored = async (recordId) => {
    if (!(isAdmin || hasPermission('dean.approve'))) return;
    const ok = await swalConfirm(
      'Remove stored record?',
      'This removes one entry from the academic record evaluation log.',
      'Remove',
      'Cancel'
    );
    if (!ok) return;
    try {
      await api.delete(`/evaluation/academic-record/complete/${recordId}`);
      swalToast('success', 'Record removed');
      if (data?.student?.student_id) {
        await fetchCompletionsForStudent(data.student.student_id);
      }
      await fetchStudentList(searchTerm);
    } catch (err) {
      await swalError('Could not remove', err.response?.data?.message || 'Request failed');
    }
  };

  // Clear all drafts
  const handleClearAll = () => {
    if (!canEditEvaluationRows || modifiedKeys.size === 0) return;

    swalConfirm('Clear All Changes?', 'Reset all grades and statuses to original values?', 'Clear', 'Cancel')
      .then((confirmed) => {
        if (!confirmed) return;

        const resetDrafts = { ...drafts };
        data.rows.forEach((row) => {
          const key = getRowKey(row);
          resetDrafts[key] = {
            ...resetDrafts[key],
            grade: gradeRawToEvaluatorFormValue(row.grade ?? '', passingForEvalRow(row)),
            status: normalizeStatusForUi(row.status ?? ''),
            inc_compliance_deadline: row.inc_compliance_deadline
              ? String(row.inc_compliance_deadline).slice(0, 10)
              : '',
          };
        });
        setDrafts(resetDrafts);
        setModifiedKeys(new Set());
        swalToast('success', 'All changes cleared');
      });
  };

  const openPromoteModal = useCallback(() => {
    if (!currentTermCompleteForPromotion) {
      void swalInfo(
        'Current term not ready to promote',
        'At least one subject is still marked Ongoing with no final outcome. Failed grades, empty slots (retakes later), or Not eligible rows do not block promotion.'
      );
      return;
    }
    if (!nextPromotionTerm) {
      void swalInfo(
        'No next semester',
        'There is no later term in this curriculum after the year and semester you are viewing.'
      );
      return;
    }
    setPromoteEvaluatedBy(String(user?.email || '').trim());
    setPromoteModalOpen(true);
  }, [currentTermCompleteForPromotion, nextPromotionTerm, user?.email]);

  const handlePromoteSave = useCallback(async () => {
    if (
      !data?.student?.student_id ||
      !selectedStudent?.student_id_number ||
      !nextPromotionTerm ||
      !String(promoteEvaluatedBy || '').trim()
    ) {
      return;
    }
    setPromoteSaving(true);
    try {
      await api.post('/evaluation/student/promote-next-semester', {
        student_id: data.student.student_id,
        evaluated_by: promoteEvaluatedBy.trim(),
        target_year_level_id: Number(nextPromotionTerm.year_level_id),
        target_semester_id: Number(nextPromotionTerm.semester_id),
      });
      const res = await api.get(`/evaluation/student/${encodeURIComponent(selectedStudent.student_id_number)}`);
      setData(res.data);
      setPromoteModalOpen(false);
      swalToast('success', 'Promotion saved');
    } catch (err) {
      await swalError('Could not save promotion', err.response?.data?.message || 'Request failed');
    } finally {
      setPromoteSaving(false);
    }
  }, [data?.student?.student_id, nextPromotionTerm, promoteEvaluatedBy, selectedStudent]);

  const renderStudentHero = () => {
    if (!data) return null;

    const { student, summary } = data;
    const computed = data?.computed_academic_status;
    const enrolledStatus = student?.academic_status?.trim() || '';
    const displayStatus = (computed || enrolledStatus || '—').trim();
    const statusTitleParts = [];
    if (computed && enrolledStatus && computed !== enrolledStatus) {
      statusTitleParts.push(`Profile: ${enrolledStatus}. Curriculum evaluation: ${computed}.`);
    }
    const statusTitle = statusTitleParts.length ? statusTitleParts.join(' ') : undefined;
    const fullName =
      student?.full_name ||
      `${student?.last_name || ''}, ${student?.first_name || ''} ${student?.middle_name || ''}`.trim();

    const degree =
      student?.program?.program_name || student?.program?.program_code || '—';

    const isPromotedNextSem = Boolean(student?.promoted_next_sem_at);

    return (
      <div className="eval-hero">
        {isPromotedNextSem ? (
          <div className="eval-hero__promotion-badge" role="status">
            <i className="fa-solid fa-circle-check" aria-hidden />
            <span>Promoted for the next sem</span>
          </div>
        ) : null}
        <div className="eval-hero__top">
          <div className="eval-hero__student-card">
            <div className="eval-hero__name">{fullName || 'N/A'}</div>
            <div className="eval-hero__degree">{degree}</div>
          </div>
          <div className="eval-hero__status-block">
            <span className="eval-hero__status-label">Status</span>
            <span
              className={`eval-hero__status-pill ${
                displayStatus === 'Irregular' ? 'eval-hero__computed-pill--irregular' : ''
              }`}
              title={statusTitle}
            >
              {displayStatus}
            </span>
          </div>
          <div className="eval-hero__title-actions">
            <div className="eval-hero__title-pill">Curriculum Evaluation</div>
            {canEdit && selectedStudent ? (
              <button
                type="button"
                className="eval-hero__promote-btn"
                onClick={openPromoteModal}
                disabled={!nextPromotionTerm || !currentTermCompleteForPromotion}
                title={
                  !currentTermCompleteForPromotion
                    ? 'Resolve any subject still marked Ongoing (no final outcome). Failed, empty, or Not eligible rows do not block promotion.'
                    : !nextPromotionTerm
                      ? 'No next term in the curriculum after this year/semester.'
                      : 'Review next-term courses and record promotion'
                }
              >
                Promote to next semester
              </button>
            ) : null}
          </div>
        </div>
        <div className="eval-metrics-strip">
          <span>
            Curriculum units: <strong>{summary?.total_units_in_curriculum ?? 0}</strong>
          </span>
          <span>
            Earned: <strong>{summary?.total_units_earned ?? 0}</strong>
          </span>
          <span>
            Remaining:{' '}
            <strong className={summary?.lacking_units > 0 ? 'eval-lacking' : 'eval-ok'}>
              {summary?.lacking_units ?? 0}
            </strong>
          </span>
        </div>
      </div>
    );
  };

  const renderFilterRail = () => {
    if (!data || !selectedStudent || !data.rows?.length) return null;
    const { academicYears, programLabel } = evaluationFilterOptions;
    const years = yearsAllowedForFilter.length ? yearsAllowedForFilter : evaluationFilterOptions.years;
    const currentYearLabel =
      years.find((y) => y.id === evalFilterYearId)?.label || '—';
    const currentSemLabel =
      semesterOptionsForYear.find((s) => s.id === evalFilterSemesterId)?.label || '—';

    return (
      <>
        <div className="eval-filter-rail" role="toolbar" aria-label="Curriculum filters">
          <label className="eval-filter-field">
            <i className="fa-regular fa-calendar eval-filter-field__icon" aria-hidden />
            <span className="eval-filter-field__label">Curriculum</span>
            <select
              className="eval-filter-field__control"
              value={evalFilterAyId}
              onChange={(e) => setEvalFilterAyId(e.target.value)}
            >
              <option value="">All</option>
              {academicYears.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="eval-filter-field">
            <i className="fa-solid fa-graduation-cap eval-filter-field__icon" aria-hidden />
            <span className="eval-filter-field__label">Program</span>
            <select className="eval-filter-field__control" value="" disabled title={programLabel}>
              <option value="">{programLabel}</option>
            </select>
          </label>
          <label className="eval-filter-field">
            <i className="fa-regular fa-clock eval-filter-field__icon" aria-hidden />
            <span className="eval-filter-field__label">Year</span>
            <select
              className="eval-filter-field__control"
              value={evalFilterYearId}
              onChange={(e) => setEvalFilterYearId(e.target.value)}
            >
              {years.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="eval-filter-field">
            <i className="fa-regular fa-bookmark eval-filter-field__icon" aria-hidden />
            <span className="eval-filter-field__label">Semester</span>
            <select
              className="eval-filter-field__control"
              value={evalFilterSemesterId}
              onChange={(e) => setEvalFilterSemesterId(e.target.value)}
              disabled={!semesterOptionsForYear.length}
            >
              {semesterOptionsForYear.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="eval-filter-context" aria-live="polite">
          {(currentYearLabel + ' — ' + currentSemLabel).toUpperCase()}
        </p>
      </>
    );
  };

  const renderTable = () => {
    if (!data || !data.rows || data.rows.length === 0) {
      return (
        <div className="empty-state">
          No curriculum rows found for this student. Make sure the student has an assigned program and curriculum.
        </div>
      );
    }

    const useSequentialTerms = !isEvaluatedModule;

    // Group rows by year level & semester similar to the spreadsheet layout
    const groups = {};
    data.rows.forEach((row) => {
      const key = `${row.year_level_name || 'Unknown'} - ${row.semester_name || 'Unknown'}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    });

    const orderedEntries = Object.entries(groups).sort(([, rowsA], [, rowsB]) => {
      const a = rowsA[0] || {};
      const b = rowsB[0] || {};
      const ay = Number(a.year_level_id ?? 0);
      const by = Number(b.year_level_id ?? 0);
      if (ay !== by) return ay - by;
      return Number(a.semester_id ?? 0) - Number(b.semester_id ?? 0);
    });

    const termIndexForGroupRows = (rowsInGroup) => {
      const r0 = rowsInGroup[0];
      if (
        !r0 ||
        r0.year_level_id == null ||
        r0.year_level_id === '' ||
        r0.semester_id == null ||
        r0.semester_id === ''
      ) {
        return -1;
      }
      return orderedCurriculumTerms.findIndex(
        (t) =>
          String(t.year_level_id) === String(r0.year_level_id) &&
          String(t.semester_id) === String(r0.semester_id)
      );
    };

    let entriesToRender = orderedEntries;
    if (useSequentialTerms) {
      if (maxSelectableTermIndex < 0) {
        entriesToRender = [];
      } else {
        entriesToRender = orderedEntries.filter(([, grp]) => {
          const idx = termIndexForGroupRows(grp);
          return idx >= 0 && idx <= maxSelectableTermIndex;
        });
      }
    }

    const matchesTermFilters = ([, rows]) => {
      const r0 = rows[0];
      if (!r0) return false;
      if (evalFilterYearId && String(r0.year_level_id) !== String(evalFilterYearId)) return false;
      if (evalFilterSemesterId && String(r0.semester_id) !== String(evalFilterSemesterId)) return false;
      if (evalFilterAyId && String(r0.academic_year_id ?? '') !== String(evalFilterAyId)) return false;
      return true;
    };
    const filteredEntries = entriesToRender.filter(matchesTermFilters);

    return (
      <div className="eval-table-container">
        {filteredEntries.length === 0 && entriesToRender.length > 0 ? (
          <p className="eval-filter-empty">
            No courses match the selected filters. Try another year, semester, or curriculum year.
          </p>
        ) : null}
        {filteredEntries.map(([groupKey, rows]) => {
          const semesterModifiedCount = rows.filter((row) => modifiedKeys.has(getRowKey(row))).length;

          return (
            <div key={groupKey} className="eval-term-block">
              <div className="eval-term-header">
                <span>{groupKey}</span>
                {canEditEvaluationRows && (
                  <div className="term-batch-actions">
                    {semesterModifiedCount > 0 && (
                      <span className="term-modified-count">{semesterModifiedCount} changed</span>
                    )}
                    <button
                      className="batch-btn pass"
                      onClick={() => batchUpdateStatus(rows, 'passed')}
                      title="Mark all as Passed"
                    >
                      All Pass
                    </button>
                    <button
                      className="batch-btn fail"
                      onClick={() => batchUpdateStatus(rows, 'failed')}
                      title="Mark all as Failed"
                    >
                      All Fail
                    </button>
                    <button
                      className="batch-btn clear"
                      onClick={() => batchUpdateStatus(rows, '')}
                      title="Clear all"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              <table className="data-table eval-course-table">
                <thead>
                  <tr>
                    <th>Pen Code</th>
                    <th>Descriptive Title</th>
                    <th>Units</th>
                    <th>Grade</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const key = getRowKey(row);
                    const draft = drafts[key] || {};
                    const isModified = canEditEvaluationRows && modifiedKeys.has(key);
                    const statusClass = canEditEvaluationRows
                      ? draft.status || ''
                      : normalizeStatusForUi(row.status ?? '');
                    const gradable = isRowGradable(row);
                    const transferCredit = isTransferCreditRow(row);
                    const mi = data?.rows ? data.rows.findIndex((r) => getRowKey(r) === getRowKey(row)) : -1;
                    const mergedTarget =
                      mi >= 0 && mergedRowsForPrereq[mi]
                        ? mergedRowsForPrereq[mi]
                        : mergeEvalRowWithDrafts(row, drafts, getEvaluationRowKey);
                    const prereqsMet = evalRowPrerequisitesMet(mergedRowsForPrereq, mergedTarget);
                    const prereqBlocksEditing =
                      gradable && !transferCredit && canEditEvaluationRows && !prereqsMet;

                    return (
                      <tr
                        key={key}
                        className={`${isModified ? 'modified' : ''} ${statusClass} ${!gradable ? 'eval-row-not-gradable' : ''} ${transferCredit ? 'eval-row-transfer-credit' : ''} ${prereqBlocksEditing ? 'eval-row-prereq-blocked' : ''}`}
                        title={
                          transferCredit
                            ? 'Satisfied by approved transfer credit (not graded in class).'
                            : !gradable
                              ? 'Grades apply only after this curriculum row maps to a subject (track/elective slot).'
                              : prereqBlocksEditing
                                ? 'Prerequisite not satisfied on record (failed or not taken). Pass or credit required courses first.'
                                : undefined
                        }
                      >
                        <td className="code-cell">
                          <span className="eval-code-pill">
                            {row.subject_code || (gradable ? 'N/A' : '—')}
                          </span>
                        </td>
                        <td className="subject-cell">
                          {row.subject_name || (gradable ? 'N/A' : '—')}
                          {canEditEvaluationRows && isModified && (
                            <span className="modified-indicator" title="Unsaved changes">
                              ●
                            </span>
                          )}
                        </td>
                        <td className="units-cell">
                          <span className="eval-units-pill">{row.units ?? 0}</span>
                        </td>
                        <td
                          className="grade-cell"
                          title={
                            isEvaluatorOnly && gradable && !transferCredit
                              ? 'Grade comes from imported records; it cannot be edited here.'
                              : undefined
                          }
                        >
                          {gradable && transferCredit ? (
                            <span className="eval-transfer-credit-dash">—</span>
                          ) : canEditNumericGrades && gradable && prereqsMet ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              className="eval-grade-input"
                              value={draft.grade ?? ''}
                              onChange={(e) => {
                                let grade = e.target.value;
                                // Clamp grade to 0-100 range
                                if (grade !== '') {
                                  const numGrade = parseFloat(grade);
                                  if (!isNaN(numGrade)) {
                                    if (numGrade > 100) grade = '100';
                                    if (numGrade < 0) grade = '0';
                                  }
                                }
                                const numGrade = parseFloat(grade);
                                // Auto-set status based on grade
                                let newStatus = '';
                                if (grade !== '' && !isNaN(numGrade)) {
                                  newStatus = numGrade >= 50 ? 'passed' : 'failed';
                                }
                                updateDraft(row, { grade, status: newStatus });
                              }}
                              placeholder="50–100"
                              disabled={savingAll}
                            />
                          ) : canEditNumericGrades && gradable && !prereqsMet ? (
                            <span className="eval-grade-prereq-blocked">
                              {formatEvalGradeReadonly(
                                draft.grade !== '' && draft.grade != null ? draft.grade : row.grade,
                                row
                              ) || '—'}
                            </span>
                          ) : gradable ? (
                            <span className="eval-grade-readonly">
                              {formatEvalGradeReadonly(row.grade, row) || '—'}
                            </span>
                          ) : canEditEvaluationRows ? (
                            <span className="eval-grade-na">—</span>
                          ) : (
                            <span className="eval-grade-readonly">
                              {formatEvalGradeReadonly(row.grade, row) || '—'}
                            </span>
                          )}
                        </td>
                        <td className="status-cell">
                          {gradable && transferCredit ? (
                            <span className="status-badge-eval-credited" title="Approved transfer / advanced standing">
                              Credited
                            </span>
                          ) : canEditEvaluationRows && gradable && !prereqsMet ? (
                            <span className="eval-prereq-locked-badge" title="Prerequisite not satisfied on record">
                              Not eligible
                            </span>
                          ) : canEditEvaluationRows && gradable ? (
                            <div className="status-cell-inner">
                              <div className="status-buttons">
                                {['passed', 'failed', ''].map((s) => (
                                  <button
                                    key={s || 'clear'}
                                    type="button"
                                    className={`status-btn ${draft.status === s ? s : ''} ${!s ? 'clear' : ''}`}
                                    onClick={() => updateDraft(row, gradeAndStatusForRemarkClick(s))}
                                    disabled={savingAll}
                                    title={s || 'Clear'}
                                  >
                                    {!s ? '×' : s.charAt(0).toUpperCase()}
                                  </button>
                                ))}
                              </div>
                              {draft.status === 'inc' && (
                                <p className="eval-legacy-inc-hint" role="note">
                                  This row is still recorded as incomplete. Use Pass or Fail (or clear) to update it.
                                </p>
                              )}
                            </div>
                          ) : canEditEvaluationRows && !gradable ? (
                            <span className="eval-status-na">—</span>
                          ) : (
                            <span className={`status-display ${normalizeStatusForUi(row.status ?? '')}`}>
                              {normalizeStatusForUi(row.status ?? '') || '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="eval-term-footer">
                    <td colSpan={5} className="eval-term-footer__cell">
                      Total units:{' '}
                      <span className="eval-units-pill eval-units-pill--footer">
                        {rows.reduce((acc, row) => acc + (Number(row.units) || 0), 0)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStoredRecordsPanel = () => {
    if (!data?.student?.student_id || !selectedStudent) return null;
    const canRemoveStored = isAdmin || hasPermission('dean.approve');

    return (
      <div className="eval-stored-records">
        <h3 className="eval-stored-records__title">Stored evaluation records</h3>
        <p className="eval-stored-records__intro">
          Log each time this student&apos;s academic record has been formally evaluated. Entries are kept in the database
          for audit and reporting.
        </p>
        {completions.length === 0 ? (
          <p className="eval-stored-records__empty">No stored evaluation records yet for this student.</p>
        ) : (
          <ul className="eval-stored-records__list">
            {completions.map((c) => (
              <li key={c.academic_record_complete_id} className="eval-stored-records__item">
                <div className="eval-stored-records__item-head">
                  <span className="eval-stored-records__date">{formatStoredDate(c.completed_at)}</span>
                  {c.completed_by_email ? (
                    <span className="eval-stored-records__by"> · {c.completed_by_email}</span>
                  ) : null}
                  {canRemoveStored ? (
                    <button
                      type="button"
                      className="eval-stored-records__remove"
                      onClick={() => handleDeleteStored(c.academic_record_complete_id)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                {c.notes ? <div className="eval-stored-records__notes">{c.notes}</div> : null}
              </li>
            ))}
          </ul>
        )}
        {canEdit ? (
          <div className="eval-stored-records__form">
            <label htmlFor="eval-completion-notes">Notes (optional)</label>
            <textarea
              id="eval-completion-notes"
              className="eval-stored-records__textarea"
              rows={2}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="e.g. Verified curriculum progress for SY 2025–2026"
              disabled={storingRecord}
            />
            <button
              type="button"
              className="eval-stored-records__submit"
              onClick={handleStoreAcademicRecord}
              disabled={storingRecord || (isEvaluatorOnly && !evaluatorHasImportedGrades)}
              title={
                isEvaluatorOnly && !evaluatorHasImportedGrades
                  ? 'At least one subject needs an imported grade on file before you can store this evaluation.'
                  : undefined
              }
            >
              {storingRecord ? 'Storing…' : 'Store evaluation record'}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const sectionTitle =
    isCurriculumTracking && !isEvaluatedModule
      ? 'Curriculum tracking'
      : isEvaluatedModule
        ? 'Evaluated students'
        : 'Student list';
  const listPanelTitle =
    isCurriculumTracking && !isEvaluatedModule
      ? 'Students'
      : isEvaluatedModule
        ? 'On file'
        : 'Need to evaluate';
  const listCountLabel =
    isCurriculumTracking && !isEvaluatedModule
      ? `${filteredStudents.length} students`
      : isEvaluatedModule
        ? `${filteredStudents.length} stored`
        : `${filteredStudents.length} pending`;

  return (
    <div
      className={`student-eval-section student-eval-section--cdoc${
        isCurriculumTracking ? ' student-eval-section--curriculum-tracking' : ''
      }`}
    >
      <div className="section-header section-header--academic-record">
        <div className="section-header-titles">
          <h2>{sectionTitle}</h2>
        </div>
        {canEditEvaluationRows && modifiedKeys.size > 0 && (
          <div className="header-actions">
            <span className="unsaved-indicator">
              <span className="dot">●</span> {modifiedKeys.size} unsaved
            </span>
            <button
              type="button"
              className="clear-all-btn"
              onClick={handleClearAll}
              disabled={savingAll}
            >
              Clear All
            </button>
            <button
              type="button"
              className="save-all-btn"
              onClick={handleSaveAll}
              disabled={savingAll || modifiedKeys.size === 0}
            >
              {savingAll ? 'Saving...' : `Save All (${modifiedKeys.size})`}
            </button>
          </div>
        )}
      </div>

      <div className="eval-container">
        {/* Student List Panel */}
        <div className="eval-list-panel eval-list-panel--single">
          <div className="eval-list-header eval-list-header--management">
            <div className="eval-list-header-row">
              <h3>{listPanelTitle}</h3>
              <span className="eval-list-header-count">{listCountLabel}</span>
            </div>
            <div className="eval-list-toolbar">
              <label className="eval-list-toolbar__field">
                <span className="eval-list-toolbar__hint">Program</span>
                <select
                  className="eval-list-toolbar__select"
                  value={listProgramFilter}
                  onChange={(e) => setListProgramFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {programOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="eval-list-toolbar__search">
                <i className="fa-solid fa-magnifying-glass eval-list-toolbar__search-icon" aria-hidden />
                <input
                  type="text"
                  className="eval-list-search"
                  placeholder="Search name or ID…"
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  aria-label="Search students"
                />
              </div>
            </div>
          </div>

          {loadingList ? (
            <div className="eval-student-table-card">
              <div className="loading-message">Loading students...</div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="eval-student-table-card">
              <div className="empty-state">
                {isEvaluatedModule
                  ? 'No students with a stored evaluation match this search.'
                  : 'No students match the program filter or search.'}
              </div>
            </div>
          ) : (
            <div className="eval-student-table-card">
              <div className="eval-student-list eval-student-list--tabbed">
                <table className="eval-student-list-table eval-student-list-table--cdoc">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Course</th>
                      {isEvaluatedModule ? <th>Last stored</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.student_id}
                        className={selectedStudent?.student_id === student.student_id ? 'active' : ''}
                        onClick={() => handleStudentSelect(student)}
                      >
                        <td>
                          <span className="eval-id-pill">{student.student_id_number || 'N/A'}</span>
                        </td>
                        <td className="eval-student-name">{student.full_name}</td>
                        <td>
                          <span className="eval-program-pill">
                            {student.program?.program_code || student.program_name || '—'}
                          </span>
                        </td>
                        {isEvaluatedModule ? (
                          <td>
                            <span
                              className="eval-stored-badge eval-stored-badge--inline"
                              title={student.academic_record_completed_at || ''}
                            >
                              {student.academic_record_completed_at
                                ? new Date(student.academic_record_completed_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Yes'}
                            </span>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Evaluation Details Panel */}
        <div className="eval-details-panel">
          {error && <div className="error-message">{error}</div>}

          {loading && <div className="loading-message">Loading evaluation...</div>}

          {canEditEvaluationRows && modifiedKeys.size > 0 && (
            <div className="unsaved-badge">
              <span className="dot">●</span> {modifiedKeys.size} unsaved
            </div>
          )}

          {!loading && renderStudentHero()}
          {!loading && renderFilterRail()}
          {!loading &&
            !isEvaluatedModule &&
            canEdit &&
            data?.student?.student_id &&
            selectedStudent && (
              <div className="eval-need-store-cta eval-need-store-cta--btn-only">
                <button
                  type="button"
                  className="eval-need-store-cta__btn"
                  onClick={handleNeedViewStoreClick}
                  disabled={storingRecord || (isEvaluatorOnly && !evaluatorHasImportedGrades)}
                  title={
                    isEvaluatorOnly && !evaluatorHasImportedGrades
                      ? 'At least one subject needs an imported grade on file before you can store this evaluation.'
                      : isEvaluatorOnly
                        ? 'Store the evaluation when imported grades show this student may continue; they move to Evaluated students.'
                        : 'When the review is finished, store so this student moves to Evaluated students.'
                  }
                >
                  {storingRecord ? 'Storing…' : 'Store evaluation record'}
                </button>
              </div>
            )}
          {!loading && isEvaluatedModule && renderStoredRecordsPanel()}
          {!loading && renderTable()}

          {/* Floating Save Bar for unsaved changes */}
          {canEditEvaluationRows && modifiedKeys.size > 0 && (
            <div className="floating-save-bar">
              <span>{modifiedKeys.size} subject(s) with unsaved changes</span>
              <div className="floating-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClearAll}
                  disabled={savingAll}
                >
                  Clear All
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveAll}
                  disabled={savingAll}
                >
                  {savingAll ? 'Saving...' : 'Save All Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PromoteSemesterModal
        open={promoteModalOpen}
        onClose={() => {
          if (!promoteSaving) setPromoteModalOpen(false);
        }}
        onSave={handlePromoteSave}
        saving={promoteSaving}
        studentName={
          data?.student?.full_name ||
          `${data?.student?.last_name || ''}, ${data?.student?.first_name || ''} ${data?.student?.middle_name || ''}`.trim() ||
          'Student'
        }
        curriculumLabel={promotionCurriculumLabel}
        programLabel={evaluationFilterOptions.programLabel}
        yearLabel={nextPromotionTerm?.year_level_name || '—'}
        semesterLabel={nextPromotionTerm?.semester_name || '—'}
        rows={promotionTableRows}
        totalUnits={promotionModalTotalUnits}
        evaluatedBy={promoteEvaluatedBy}
        onEvaluatedByChange={(e) => setPromoteEvaluatedBy(e.target.value)}
      />
    </div>
  );
};

export default StudentEvaluationView;


