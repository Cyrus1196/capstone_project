import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { swalToast, swalError, swalConfirm } from '../../utils/swal';
import './StudentEvaluationView.css';

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

  const [listProgramFilter, setListProgramFilter] = useState('');
  const [evalFilterYearId, setEvalFilterYearId] = useState('');
  const [evalFilterSemesterId, setEvalFilterSemesterId] = useState('');
  const [evalFilterAyId, setEvalFilterAyId] = useState('');
  const getRowKey = (row) => {
    if (row.curriculum_id != null && row.curriculum_id !== '') {
      return `cur-${row.curriculum_id}`;
    }
    if (row.evaluation_id) {
      return `eval-${row.evaluation_id}`;
    }
    return `new-${row.subject_id}-${row.academic_year_id}-${row.semester_id}`;
  };

  /** Normalize grade for comparing draft vs saved row (handles 75 vs "75.0"). */
  const normalizeGradeForCompare = (g) => {
    if (g === '' || g == null) return '';
    const s = String(g).trim();
    const n = parseFloat(s);
    if (!Number.isNaN(n)) return String(n);
    return s.toLowerCase();
  };

  /** API may use incomplete; UI uses inc — treat as equivalent. */
  const normalizeStatusForCompare = (s) => {
    if (s === '' || s == null) return '';
    const t = String(s).trim().toLowerCase();
    if (t === 'inc' || t === 'incomplete') return 'incomplete';
    return t;
  };

  const draftMatchesSavedRow = (draftGrade, draftStatus, row) =>
    normalizeGradeForCompare(draftGrade) === normalizeGradeForCompare(row.grade) &&
    normalizeStatusForCompare(draftStatus) === normalizeStatusForCompare(row.status);

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

  const semesterOptionsForYear = useMemo(() => {
    if (!data?.rows?.length || !evalFilterYearId) return [];
    const m = new Map();
    data.rows
      .filter((r) => String(r.year_level_id) === String(evalFilterYearId))
      .forEach((r) => {
        if (r.semester_id == null || r.semester_id === '') return;
        const label = r.semester_name || `Semester ${r.semester_id}`;
        m.set(String(r.semester_id), { id: String(r.semester_id), label });
      });
    return [...m.values()].sort((a, b) => Number(a.id) - Number(b.id));
  }, [data, evalFilterYearId]);

  useEffect(() => {
    if (!data?.rows?.length) {
      setEvalFilterYearId('');
      setEvalFilterSemesterId('');
      setEvalFilterAyId('');
      return;
    }
    const rows = data.rows;
    const ySorted = [
      ...new Set(rows.map((r) => r.year_level_id).filter((x) => x != null && x !== '')),
    ].sort((a, b) => Number(a) - Number(b));
    const y0 = ySorted.length ? String(ySorted[0]) : '';
    setEvalFilterYearId(y0);
    if (y0) {
      const sSorted = [
        ...new Set(
          rows
            .filter((r) => String(r.year_level_id) === y0)
            .map((r) => r.semester_id)
            .filter((x) => x != null && x !== '')
        ),
      ].sort((a, b) => Number(a) - Number(b));
      setEvalFilterSemesterId(sSorted.length ? String(sSorted[0]) : '');
    } else {
      setEvalFilterSemesterId('');
    }
    setEvalFilterAyId('');
  }, [data?.student?.student_id]);

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
        grade: row.grade ?? '',
        status: row.status ?? '',
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
    const base = drafts[key] || { grade: '', status: '' };
    const merged = { ...base, ...patch };
    setDrafts({ ...drafts, [key]: merged });
    setModifiedKeys((prev) => {
      const next = new Set(prev);
      if (draftMatchesSavedRow(merged.grade, merged.status, row)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Batch update status for multiple rows
  const batchUpdateStatus = (rows, status) => {
    const gradable = rows.filter(
      (row) => isRowGradable(row) && !isTransferCreditRow(row)
    );
    if (gradable.length === 0) {
      swalToast(
        'info',
        'No rows to update here (elective slots need a subject, or all remaining rows are transfer-credited).'
      );
      return;
    }

    const nextDrafts = { ...drafts };
    for (const row of gradable) {
      const key = getRowKey(row);
      const currentDraft = nextDrafts[key] || {};
      let newGrade =
        currentDraft.grade === '' || currentDraft.grade == null
          ? ''
          : String(currentDraft.grade);

      if (status === '' || status === 'ongoing') {
        newGrade = '';
      } else if (!newGrade && (status === 'passed' || status === 'failed')) {
        newGrade = status === 'passed' ? '75' : '';
      }

      nextDrafts[key] = {
        ...currentDraft,
        status,
        grade: newGrade,
      };
    }

    const nextModified = new Set(modifiedKeys);
    for (const row of gradable) {
      const key = getRowKey(row);
      const d = nextDrafts[key];
      if (draftMatchesSavedRow(d.grade, d.status, row)) {
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
    if (!canEdit || !selectedStudent || !data?.student?.student_id) return;
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
        draft.status === '' || draft.status == null ? null : draft.status;
      const clearingOnly =
        gradeValue == null && evaluation_status == null && draft.evaluation_id;
      const hasValues = gradeValue != null || evaluation_status != null;
      // Allow save when clearing an existing evaluation (PUT nulls). Skip POST with no data.
      if (!hasValues && !clearingOnly) continue;

      const savePromise = (async () => {
        try {
          if (draft.evaluation_id) {
            await api.put(`/evaluation/${draft.evaluation_id}`, {
              grade: gradeValue,
              evaluation_status,
            });
          } else {
            await api.post('/evaluation', {
              student_id: data.student.student_id,
              subject_id: draft.subject_id,
              academic_year_id: draft.academic_year_id,
              semester_id: draft.semester_id,
              grade: gradeValue,
              evaluation_status,
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
    if (modifiedKeys.size === 0) return;

    swalConfirm('Clear All Changes?', 'Reset all grades and statuses to original values?', 'Clear', 'Cancel')
      .then((confirmed) => {
        if (!confirmed) return;

        const resetDrafts = { ...drafts };
        data.rows.forEach((row) => {
          const key = getRowKey(row);
          resetDrafts[key] = {
            ...resetDrafts[key],
            grade: row.grade ?? '',
            status: row.status ?? '',
          };
        });
        setDrafts(resetDrafts);
        setModifiedKeys(new Set());
        swalToast('success', 'All changes cleared');
      });
  };

  const renderStudentHero = () => {
    if (!data) return null;

    const { student, summary } = data;
    const computed = data?.computed_academic_status;
    const reasons = data?.academic_status_reasons || [];
    const fullName =
      student?.full_name ||
      `${student?.last_name || ''}, ${student?.first_name || ''} ${student?.middle_name || ''}`.trim();

    const degree =
      student?.program?.program_name || student?.program?.program_code || '—';

    return (
      <div className="eval-hero">
        <div className="eval-hero__top">
          <div className="eval-hero__student-card">
            <div className="eval-hero__name">{fullName || 'N/A'}</div>
            <div className="eval-hero__degree">{degree}</div>
          </div>
          <div className="eval-hero__status-block">
            <span className="eval-hero__status-label">Status</span>
            <span className="eval-hero__status-pill">{student?.academic_status || '—'}</span>
            {computed ? (
              <span
                className={`eval-hero__computed-pill ${
                  computed === 'Irregular' ? 'eval-hero__computed-pill--irregular' : ''
                }`}
                title={reasons.length ? reasons.join(' ') : undefined}
              >
                Sequence: {computed}
              </span>
            ) : null}
          </div>
          <div className="eval-hero__title-pill">Curriculum Evaluation</div>
        </div>
        {reasons.length > 0 ? <div className="eval-hero__reasons">{reasons.join(' ')}</div> : null}
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
    const { years, academicYears, programLabel } = evaluationFilterOptions;
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

    /** Next term unlock uses only data already saved on the server — not draft form values. */
    const isEvalRowCompleteFromServer = (row) => {
      if (isTransferCreditRow(row)) return true;
      if (!isRowGradable(row)) return true;
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
    };

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

    let entriesToRender = orderedEntries;
    if (useSequentialTerms) {
      entriesToRender = [];
      for (let i = 0; i < orderedEntries.length; i++) {
        if (i === 0) {
          entriesToRender.push(orderedEntries[i]);
          continue;
        }
        const prevRows = orderedEntries[i - 1][1];
        if (prevRows.every((r) => isEvalRowCompleteFromServer(r))) {
          entriesToRender.push(orderedEntries[i]);
        } else {
          break;
        }
      }
    }

    const hiddenTermCount = orderedEntries.length - entriesToRender.length;

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
                {canEdit && (
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
                      className="batch-btn inc"
                      onClick={() => batchUpdateStatus(rows, 'inc')}
                      title="Mark all as INC"
                    >
                      All INC
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
                    const isModified = modifiedKeys.has(key);
                    const statusClass = draft.status || '';
                    const gradable = isRowGradable(row);
                    const transferCredit = isTransferCreditRow(row);

                    return (
                      <tr
                        key={key}
                        className={`${isModified ? 'modified' : ''} ${statusClass} ${!gradable ? 'eval-row-not-gradable' : ''} ${transferCredit ? 'eval-row-transfer-credit' : ''}`}
                        title={
                          transferCredit
                            ? 'Satisfied by approved transfer credit (not graded in class).'
                            : !gradable
                              ? 'Grades apply only after this curriculum row maps to a subject (track/elective slot).'
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
                          {isModified && <span className="modified-indicator" title="Unsaved changes">●</span>}
                        </td>
                        <td className="units-cell">
                          <span className="eval-units-pill">{row.units ?? 0}</span>
                        </td>
                        <td className="grade-cell">
                          {canEdit && gradable && transferCredit ? (
                            <span className="eval-transfer-credit-dash">—</span>
                          ) : canEdit && gradable ? (
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
                              placeholder="0-100"
                              disabled={savingAll}
                            />
                          ) : canEdit && !gradable ? (
                            <span className="eval-grade-na">—</span>
                          ) : (
                            row.grade ?? ''
                          )}
                        </td>
                        <td className="status-cell">
                          {canEdit && gradable && transferCredit ? (
                            <span className="status-badge-eval-credited" title="Approved transfer / advanced standing">
                              Credited
                            </span>
                          ) : canEdit && gradable ? (
                            <div className="status-buttons">
                              {['passed', 'failed', 'inc', 'ongoing', ''].map((s) => (
                                <button
                                  key={s || 'clear'}
                                  type="button"
                                  className={`status-btn ${draft.status === s ? s : ''} ${!s ? 'clear' : ''}`}
                                  onClick={() => updateDraft(row, { status: s })}
                                  disabled={savingAll}
                                  title={s || 'Clear'}
                                >
                                  {!s ? '×' : s.charAt(0).toUpperCase()}
                                </button>
                              ))}
                            </div>
                          ) : canEdit && !gradable ? (
                            <span className="eval-status-na">—</span>
                          ) : (
                            <span className={`status-display ${draft.status}`}>{draft.status || '-'}</span>
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
        {useSequentialTerms && hiddenTermCount > 0 ? (
          <p className="eval-sequential-term-hint" role="status">
            <strong>{hiddenTermCount}</strong> more term{hiddenTermCount !== 1 ? 's are' : ' is'} hidden until the
            previous term is fully saved: use <strong>Save All Changes</strong> so every course has a stored grade
            or status (Pass, Fail, or INC). Unsaved edits do not unlock the next term.
          </p>
        ) : null}
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
              disabled={storingRecord}
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
  const sectionLead =
    isCurriculumTracking && !isEvaluatedModule
      ? 'See each student’s program subjects, grades, and progress (earned vs remaining units). Filter by program, search, then select a student.'
      : isEvaluatedModule
        ? 'Students with a stored academic record evaluation on file. Select a row to review grades, history, or add another review entry.'
        : 'Filter by program, search by name or ID, then open a student to record curriculum evaluation.';
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
  const listIntro =
    isCurriculumTracking && !isEvaluatedModule
      ? 'All students in scope. Open one to review curriculum rows, prerequisites, and standing.'
      : isEvaluatedModule
        ? 'Search within students who already have a stored academic record evaluation.'
        : 'Use program and search to narrow the list. Save grades, then store the evaluation record when the review is complete.';

  return (
    <div
      className={`student-eval-section student-eval-section--cdoc${
        isCurriculumTracking ? ' student-eval-section--curriculum-tracking' : ''
      }`}
    >
      <div className="section-header section-header--academic-record">
        <div className="section-header-titles">
          <h2>{sectionTitle}</h2>
          <p className="student-eval-lead">{sectionLead}</p>
        </div>
        {canEdit && modifiedKeys.size > 0 && (
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
            <p className="eval-list-intro">{listIntro}</p>
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

          {modifiedKeys.size > 0 && (
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
              <div className="eval-need-store-cta">
                <p className="eval-need-store-cta__text">
                  When the review is finished, store it so this student moves to <strong>Evaluated students</strong>.
                </p>
                <button
                  type="button"
                  className="eval-need-store-cta__btn"
                  onClick={handleNeedViewStoreClick}
                  disabled={storingRecord}
                >
                  {storingRecord ? 'Storing…' : 'Store evaluation record'}
                </button>
              </div>
            )}
          {!loading && isEvaluatedModule && renderStoredRecordsPanel()}
          {!loading && renderTable()}

          {/* Floating Save Bar for unsaved changes */}
          {canEdit && modifiedKeys.size > 0 && (
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
    </div>
  );
};

export default StudentEvaluationView;


