import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { swalToast, swalError, swalConfirm, swalInfo } from '../../utils/swal';
import PromoteSemesterModal from './PromoteSemesterModal';
import SearchableSelect from './SearchableSelect';
import SubjectEquivalenceQuickModal from './SubjectEquivalenceQuickModal';
import {
  gradeMeetsPassingThreshold,
  isCompleteGrade,
  manualGradeToSavePayload,
  manualGradesEquivalentForRow,
  SIS_DEFAULT_FAIL_GRADE,
  SIS_DEFAULT_PASS_GRADE,
} from '../../utils/gradePercentageConversion';
import './StudentEvaluationView.css';

/** Row completion from server data only (matches sequential unlock in renderTable). */
function isRowGradableForTermGate(row) {
  return row.subject_id != null && row.subject_id !== '';
}

function isTransferCreditRowForTermGate(row) {
  return row?.passed_via_transfer_credit === true || String(row?.status || '').toLowerCase() === 'credit';
}

/** True when the row is “filled in” for term gates / promotion: failed, incomplete, dropped, etc. all count; only blank or ongoing blocks. */
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
    status === 'complete' ||
    status === 'completed' ||
    status === 'failed' ||
    status === 'fail' ||
    status === 'f' ||
    status === 'inc' ||
    status === 'incomplete' ||
    status === 'dropped' ||
    status === 'drop'
  ) {
    return true;
  }
  if (row.grade != null && String(row.grade).trim() !== '') return true;
  if (isCompleteGrade(row.grade)) return true;
  return false;
}

/** No grade and no remark — not taken this term (may take later: summer / next year). */
function isEvalRowUntakenBlank(row) {
  if (isTransferCreditRowForTermGate(row)) return false;
  if (!isRowGradableForTermGate(row)) return false;
  const status = String(row?.status || '')
    .toLowerCase()
    .trim();
  if (status === 'ongoing') return false;
  if (status !== '') return false;
  const grade = row?.grade;
  if (grade != null && String(grade).trim() !== '') return false;
  return true;
}

/**
 * True when a term has at least one recorded subject and every taken subject has a
 * final outcome. Untaken blanks alone do NOT unlock the next semester.
 */
function isCurriculumTermReadyToAdvance(rows, yearId, semId, deferredKeys = []) {
  const deferred = new Set((deferredKeys || []).map(String));
  const termRows = (rows || []).filter((r) => {
    if (deferred.has(getEvaluationRowKey(r))) return false;
    return (
      String(r.year_level_id) === String(yearId) && String(r.semester_id) === String(semId)
    );
  });
  const actionable = termRows.filter((r) => !isEvalRowUntakenBlank(r));
  if (actionable.length === 0) return false;
  return actionable.every((r) => isEvalRowCompleteFromServerRow(r));
}

/**
 * Earliest term within a year the student may stand on — never skip ahead when
 * earlier terms have no recorded grades/outcomes.
 */
function resolveStandingTermForYear(orderedTerms, rows, yearId, deferredKeys = []) {
  const yearTerms = (orderedTerms || []).filter(
    (t) => String(t.year_level_id) === String(yearId)
  );
  if (!yearTerms.length) return null;

  for (let i = 0; i < yearTerms.length; i += 1) {
    const term = yearTerms[i];
    if (
      !isCurriculumTermReadyToAdvance(
        rows,
        term.year_level_id,
        term.semester_id,
        deferredKeys
      )
    ) {
      return term;
    }
  }
  return yearTerms[yearTerms.length - 1];
}

function passingForEvalRow(row) {
  return row.passing_grade != null && row.passing_grade !== '' ? row.passing_grade : '50';
}

function formatEvalGradeReadonly(gradeRaw) {
  if (gradeRaw == null || String(gradeRaw).trim() === '') return '';
  return String(gradeRaw).trim();
}

function draftGradeFromRow(row) {
  if (row?.grade == null || String(row.grade).trim() === '') return '';
  return String(row.grade).trim();
}

function safeDownloadName(value) {
  return String(value || 'student-evaluation')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'student-evaluation';
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function evaluationTermKeyFromParts(yearLevelId, semesterId) {
  return `${yearLevelId ?? 'unknown'}|${semesterId ?? 'unknown'}`;
}

function evaluationTermKeyFromRow(row) {
  return evaluationTermKeyFromParts(row?.year_level_id, row?.semester_id);
}

/** UI uses `inc`; API stores `incomplete`. */
function normalizeStatusForUi(status) {
  if (status == null || status === '') return '';
  const t = String(status).trim().toLowerCase();
  if (t === 'incomplete') return 'inc';
  if (t === 'complete' || t === 'completed') return 'Complete';
  return String(status).trim();
}

function semesterSortValue(semesterId, semesterName = '') {
  const name = String(semesterName || '').trim().toLowerCase();
  if (name.includes('summer') || Number(semesterId) === 3) return 0;
  const numeric = Number(semesterId);
  return Number.isFinite(numeric) ? numeric : 99;
}

/** Curriculum term order for standing load (year major; 1st → 2nd → Summer). */
function evalTermSortKey(yearId, semesterId, semesterName = '') {
  const y = Number(yearId);
  const yearPart = Number.isFinite(y) ? y : 0;
  return yearPart * 100 + placementTermSortValue(semesterId, semesterName);
}

/** Passed / credited — leave out of Current subjects load pool. */
function isEvalRowAlreadyTaken(row) {
  if (isTransferCreditRowForTermGate(row)) return true;
  const status = String(row?.status || '')
    .toLowerCase()
    .trim();
  if (['passed', 'pass', 'complete', 'completed', 'credit'].includes(status)) return true;
  if (['failed', 'fail', 'f', 'dropped', 'drop', 'inc', 'incomplete', 'ongoing'].includes(status)) {
    return false;
  }
  if (row?.grade != null && String(row.grade).trim() !== '') {
    return gradeMeetsPassingThreshold(row.grade, passingForEvalRow(row), row.status);
  }
  return false;
}

/**
 * For next-sem mapping: hide anything already graded / passed.
 * Only blank untaken rows (and failed/incomplete retakes) belong in the map.
 */
function isEvalRowAvailableInNextSemMap(row) {
  if (isTransferCreditRowForTermGate(row)) return false;
  if (isEvalRowUntakenBlank(row)) return true;
  const status = String(row?.status || '')
    .toLowerCase()
    .trim();
  // Failed / incomplete may be retaken later.
  if (['failed', 'fail', 'f', 'dropped', 'drop', 'inc', 'incomplete'].includes(status)) {
    return true;
  }
  // Any other status or any recorded grade = already taken/graded.
  return false;
}

/** Classify semester as first / second / summer for placement preview move rules. */
function getEvalSemesterKind(semesterId, semesterName = '') {
  const name = String(semesterName || '').toLowerCase();
  if (/summer|mid\s*-?\s*year|midyear/.test(name)) return 'summer';
  if (/2nd|second/.test(name)) return 'second';
  if (/1st|first/.test(name)) return 'first';
  const id = String(semesterId ?? '');
  if (id === '3') return 'summer';
  if (id === '2') return 'second';
  if (id === '1') return 'first';
  return 'other';
}

/** Placement preview term order: 1st → 2nd → Summer. */
function placementTermSortValue(semesterId, semesterName = '') {
  const kind = getEvalSemesterKind(semesterId, semesterName);
  if (kind === 'first') return 1;
  if (kind === 'second') return 2;
  if (kind === 'summer') return 3;
  return 99;
}

const EVAL_SUMMER_UNIT_CAP = 9;
const EVAL_YEAR_UNIT_CAPS = {
  1: 23,
  2: 24,
  3: 19,
  4: 12,
};

function evalPlacementTermRank(yearId, semId, semName = '') {
  const y = Number(yearId);
  const yearRank = Number.isFinite(y) && y > 0 ? y : 99;
  return yearRank * 100 + placementTermSortValue(semId, semName);
}

function evalPlacementPrereqRuleYearRequirement(row) {
  const labels = Array.isArray(row?.prerequisite_rule_labels) ? row.prerequisite_rule_labels : [];
  for (const raw of labels) {
    if (!isStandingOrBulkPrerequisiteRule(raw)) continue;
    const normalized = formatEvalRequisiteRuleLabel(raw);
    const match = String(normalized).match(/(\d+)(?:st|nd|rd|th)?\s+year\s+standing/i);
    if (match) return Number(match[1]);
  }
  return null;
}

/**
 * Block moves into a term at/before an unmet prerequisite's placement.
 * Already-passed / credited prereqs (incl. FROM previous program) do not block.
 * Year/semester kind is unrestricted — only sequencing vs prereqs matters.
 */
function evalPlacementPrereqMoveGate(
  row,
  targetYearId,
  targetSemId,
  targetSemName,
  { allRows, placementMap },
) {
  if (!row) return { ok: true, note: '' };
  const targetRank = evalPlacementTermRank(targetYearId, targetSemId, targetSemName);

  const preCodes = Array.isArray(row?.prerequisite_subject_codes) ? row.prerequisite_subject_codes : [];
  const preSlots = Array.isArray(row?.prerequisite_elective_slots) ? row.prerequisite_elective_slots : [];

  for (const code of preCodes) {
    const preRow = findEvalRowBySubjectCode(allRows, code);
    if (!preRow || evalPrerequisiteRowPassed(preRow)) continue;
    const preKey = getEvaluationRowKey(preRow);
    const prePlacement = placementMap?.[preKey] || {
      yearId: preRow.year_level_id,
      semId: preRow.semester_id,
    };
    const preRank = evalPlacementTermRank(
      prePlacement.yearId,
      prePlacement.semId,
      preRow.semester_name
    );
    if (preRank >= targetRank) {
      const concise =
        formatPromotionPrerequisiteDisplay(row).replace(/^P:\s*/i, '').trim() ||
        String(code).trim();
      return { ok: false, note: `Needs ${concise} first.` };
    }
  }

  for (const req of preSlots) {
    const preRow = findEvalRowByElectiveSlotId(allRows, req?.elective_slot_id);
    if (!preRow || evalPrerequisiteRowPassed(preRow)) continue;
    const preKey = getEvaluationRowKey(preRow);
    const prePlacement = placementMap?.[preKey] || {
      yearId: preRow.year_level_id,
      semId: preRow.semester_id,
    };
    const preRank = evalPlacementTermRank(
      prePlacement.yearId,
      prePlacement.semId,
      preRow.semester_name
    );
    if (preRank >= targetRank) {
      const concise =
        formatPromotionPrerequisiteDisplay(row).replace(/^P:\s*/i, '').trim() ||
        (req?.slot_name ? String(req.slot_name) : `Elective slot ${req?.elective_slot_id ?? ''}`);
      return { ok: false, note: `Needs ${concise} first.` };
    }
  }

  const requiredYear = evalPlacementPrereqRuleYearRequirement(row);
  if (requiredYear && Number(targetYearId) < requiredYear) {
    return {
      ok: false,
      note: `Needs ${ordinalYearLabel(requiredYear)} year standing first.`,
    };
  }

  return { ok: true, note: '' };
}

/**
 * Current-subjects load: cannot TAKE a subject whose prerequisite is not yet passed.
 * (Taking the prereq in the same load does not unlock it — finish the prereq first.)
 */
function standingLoadBlockedByPrereq(row, allRows) {
  if (!row) return null;
  const preCodes = Array.isArray(row?.prerequisite_subject_codes)
    ? row.prerequisite_subject_codes
    : [];
  for (const code of preCodes) {
    const preRow = findEvalRowBySubjectCode(allRows, code);
    if (!preRow) continue;
    if (evalPrerequisiteRowPassed(preRow)) continue;
    const label = String(preRow.subject_code || code).trim() || String(code).trim();
    return `Needs ${label} first`;
  }
  const preSlots = Array.isArray(row?.prerequisite_elective_slots)
    ? row.prerequisite_elective_slots
    : [];
  for (const req of preSlots) {
    const preRow = findEvalRowByElectiveSlotId(allRows, req?.elective_slot_id);
    if (!preRow) continue;
    if (evalPrerequisiteRowPassed(preRow)) continue;
    const label =
      (req?.slot_name && String(req.slot_name).trim()) ||
      String(preRow.subject_code || preRow.elective_slot_name || '').trim() ||
      'prerequisite';
    return `Needs ${label} first`;
  }
  return null;
}

/**
 * Prior/backlog Take is allowed only when:
 * - listed in Offered subjects for this standing (OFFSEM), or
 * - home semester matches standing semester (true Semestral, e.g. prior 1st-sem
 *   subject while standing is also 1st sem).
 * A 2nd-sem subject during 1st-sem standing is not selectable unless offered.
 */
function standingPriorTakeGate(row, standingSemesterId, isOffered) {
  if (!row) return { ok: false, reason: 'Subject unavailable' };
  if (isOffered) return { ok: true, mode: 'offsem' };
  if (
    standingSemesterId != null &&
    standingSemesterId !== '' &&
    String(row.semester_id) === String(standingSemesterId)
  ) {
    return { ok: true, mode: 'semestral' };
  }
  const homeSem = row.semester_name || 'its home semester';
  return {
    ok: false,
    reason: `Not offered this standing — ${homeSem} subjects can only be taken if listed in Offered subjects`,
  };
}

function shouldShowOnlySubjectsToTake(student) {
  const entry = String(student?.student_entry_type || '')
    .trim()
    .toLowerCase();
  if (entry === 'shiftee' || entry === 'returnee' || entry === 'transferee') return true;
  if (student?.previous_program_id != null && student.previous_program_id !== '') return true;
  if (student?.previous_program) return true;
  return false;
}

/** Grade + status when choosing a remark button (P / F / clear). */
function gradeAndStatusForRemarkClick(status) {
  if (status === '') return { status: '', grade: '' };
  if (status === 'passed') return { status: 'passed', grade: SIS_DEFAULT_PASS_GRADE };
  if (status === 'failed') return { status: 'failed', grade: SIS_DEFAULT_FAIL_GRADE };
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
  return {
    ...row,
    status,
    grade,
    subject_id: d.subject_id ?? row.subject_id,
    subject_code: d.subject_code ?? row.subject_code,
    subject_name: d.subject_name ?? row.subject_name,
    units: d.units ?? row.units,
  };
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

function findEvalRowByElectiveSlotId(rows, slotId) {
  if (slotId == null || slotId === '') return null;
  return rows.find((r) => Number(r.elective_slot_id) === Number(slotId)) ?? null;
}

function normalizeItSubjectCode(code) {
  return String(code || '').replace(/\s+/g, '').toUpperCase();
}

const DIGITAL_ARTS_ELECTIVE_CODES = new Set(['ITE391', 'ITE392', 'ITE240', 'ITE388']);

function itTrackKeyFromStudent(student) {
  const text = `${student?.track?.track_name || ''} ${student?.track?.track_code || ''}`.toLowerCase();
  if (text.includes('digital') || text.includes('digi')) return 'digital';
  if (text.includes('cyber')) return 'cyber';
  if (text.includes('business') || text.includes('bam')) return 'business';
  if (text.includes('system') || text.includes('sys')) return 'sysdev';
  return '';
}

function isItElectivesFourRow(row) {
  const label = `${row?.elective_slot_name || ''} ${row?.subject_code || ''}`.toLowerCase();
  return label.includes('it electives 4');
}

function ordinalYearLabel(year) {
  const n = Number(year);
  if (!Number.isFinite(n) || n < 1) return '';
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

/**
 * Year standing from earned curriculum units (study-map thresholds):
 * ≥46 → 2nd, ≥94 → 3rd, ≥132 → 4th; otherwise 1st.
 */
function yearStandingFromEarnedUnits(earnedUnits) {
  const u = Number(earnedUnits);
  const earned = Number.isFinite(u) ? u : 0;
  if (earned >= 132) return 4;
  if (earned >= 94) return 3;
  if (earned >= 46) return 2;
  return 1;
}

/**
 * Calendar school year for standing display.
 * Curriculum Effective SY stays fixed (subject map); school year advances with year level:
 * Effective 2023 + 1st year → 2023-2024, 2nd year → 2024-2025, etc.
 */
function schoolYearLabelForStanding(curriculumEffectiveYearOrLabel, yearLevelNumber) {
  let base = Number(curriculumEffectiveYearOrLabel);
  if (!Number.isFinite(base) || base <= 0) {
    const m = String(curriculumEffectiveYearOrLabel || '').match(/(\d{4})/);
    base = m ? Number(m[1]) : NaN;
  }
  if (!Number.isFinite(base) || base <= 0) return null;
  const y = Number(yearLevelNumber);
  const offset = Number.isFinite(y) && y >= 1 ? y - 1 : 0;
  const start = base + offset;
  return `${start}-${start + 1}`;
}

function isRegularAcademicStatus(status) {
  return /^regular$/i.test(String(status || '').trim());
}

function isIrregularAcademicStatus(status) {
  return /^irregular$/i.test(String(status || '').trim());
}

function resolveYearOptionIdForStanding(years, standingYear, parseYearNumber) {
  const target = Number(standingYear);
  if (!Number.isFinite(target) || !Array.isArray(years) || years.length === 0) return '';
  const match = years.find((y) => {
    const n =
      typeof parseYearNumber === 'function'
        ? parseYearNumber(y.label, y.id)
        : Number(y.id);
    return Number(n) === target;
  });
  if (match) return String(match.id);
  // Fallback: year_level_id often equals 1..4
  const byId = years.find((y) => Number(y.id) === target);
  return byId ? String(byId.id) : String(years[0].id);
}

function formatEvalRequisiteRuleLabel(label) {
  const raw = String(label || '').trim();
  if (!raw) return '';

  // "all subjects from 1st year to 3rd year" → "4th year standing"
  const rangeMatch = raw.match(
    /^all\s+subjects?\s+from\s+(?:\d+(?:st|nd|rd|th)?|first|second|third|fourth|fifth)\s+year\s+to\s+(\d+)(?:st|nd|rd|th)?\s+year$/i
  );
  if (rangeMatch) {
    const throughYear = Number(rangeMatch[1]);
    if (Number.isFinite(throughYear) && throughYear >= 1) {
      return `${ordinalYearLabel(throughYear + 1)} year standing`;
    }
  }

  // "all subjects through 3rd year" / "all subjects up to 3rd year"
  const throughMatch = raw.match(
    /^all\s+subjects?\s+(?:through|upto|up\s+to|until)\s+(\d+)(?:st|nd|rd|th)?\s+year$/i
  );
  if (throughMatch) {
    const throughYear = Number(throughMatch[1]);
    if (Number.isFinite(throughYear) && throughYear >= 1) {
      return `${ordinalYearLabel(throughYear + 1)} year standing`;
    }
  }

  if (/^all\s+subjects?$/i.test(raw)) {
    return 'all prior subjects';
  }

  const standingMatch = raw.match(
    /^(2|2nd|second|3|3rd|third|4|4th|fourth|5|5th|fifth)\s+year\s+standing$/i
  );
  if (!standingMatch) return raw;

  const normalized = String(standingMatch[1]).toLowerCase();
  const year =
    normalized === '2' || normalized === '2nd' || normalized === 'second'
      ? '2nd'
      : normalized === '3' || normalized === '3rd' || normalized === 'third'
        ? '3rd'
        : normalized === '4' || normalized === '4th' || normalized === 'fourth'
          ? '4th'
          : '5th';
  return `${year} year standing`;
}

function isStandingOrBulkPrerequisiteRule(label) {
  const raw = String(label || '').trim();
  if (!raw) return false;
  if (/year\s+standing$/i.test(formatEvalRequisiteRuleLabel(raw))) return true;
  if (/^all\s+subjects?/i.test(raw)) return true;
  return false;
}

/**
 * Promote modal / summary text. StudentCurriculumEvaluationBuilder sets `prerequisite` null but
 * sends prerequisite codes in `prerequisite_subject_codes` (same data Curriculum Management shows as "P: …").
 */
function formatPreviousProgramTag(row, student) {
  const code =
    row?.previous_program_code ||
    student?.previous_program?.program_code ||
    '';
  const name =
    row?.previous_program_name ||
    student?.previous_program?.program_name ||
    '';
  const label = String(code || name || '').trim();
  if (!label) return 'From previous program';
  return `From ${label}`;
}

function formatPromotionPrerequisiteDisplay(row) {
  const direct = row?.prerequisite != null ? String(row.prerequisite).trim() : '';
  if (direct) return direct;
  const pre = row?.prerequisite_subject_codes;
  const co = row?.corequisite_subject_codes;
  const preRules = Array.isArray(row?.prerequisite_rule_labels)
    ? row.prerequisite_rule_labels.map(formatEvalRequisiteRuleLabel).filter(Boolean)
    : [];
  const coRules = Array.isArray(row?.corequisite_rule_labels)
    ? row.corequisite_rule_labels.map(formatEvalRequisiteRuleLabel).filter(Boolean)
    : [];
  const parts = [];
  if (preRules.length > 0) {
    parts.push(`P: ${[...new Set(preRules)].join(', ')}`);
  } else if (Array.isArray(pre) && pre.length > 0) {
    // Avoid dumping huge expanded standing lists when no rule label was sent.
    if (pre.length <= 8) {
      const list = pre.map((c) => String(c).trim()).filter(Boolean);
      if (list.length) parts.push(`P: ${list.join(', ')}`);
    } else {
      parts.push('P: year standing / prior subjects');
    }
  }
  if (coRules.length > 0) {
    parts.push(`Co: ${[...new Set(coRules)].join(', ')}`);
  } else if (Array.isArray(co) && co.length > 0) {
    const list = co.map((c) => String(c).trim()).filter(Boolean);
    if (list.length) parts.push(`Co: ${list.join(', ')}`);
  }
  if (parts.length) return parts.join(' · ');
  return '';
}

function isElectiveTrackPendingRow(row) {
  return row?.elective_pending === true && (row?.subject_id == null || row.subject_id === '');
}

function isTrackSelectableElectiveRow(row) {
  return row?.elective_slot_id != null && Array.isArray(row?.elective_choices) && row.elective_choices.length > 0;
}

function dedupeElectiveChoicesByTrack(choices) {
  const list = Array.isArray(choices) ? choices : [];
  const m = new Map();
  for (const c of list) {
    const k = c.track_id != null && c.track_id !== '' ? `t:${c.track_id}` : `s:${c.subject_id}`;
    if (!m.has(k)) m.set(k, c);
  }
  return [...m.values()];
}

function electiveChoiceLabel(c) {
  const tn = [c.track_name, c.track_code].filter(Boolean).join(' ').trim();
  const sn = (c.subject_name || '').trim();
  const sc = (c.subject_code || '').trim();
  if (tn && sn) return `${tn} — ${sn}${sc ? ` (${sc})` : ''}`;
  if (sn) return `${sn}${sc ? ` (${sc})` : ''}`;
  return sc || 'Elective option';
}

/** Same rule as student My Curriculum: only prerequisites block; corequisites are concurrent. */
function evalRowPrerequisitesMet(allRows, targetRow) {
  const pre = targetRow.prerequisite_subject_codes;
  const codes = [...(Array.isArray(pre) ? pre : [])];
  const slotPrereqs = Array.isArray(targetRow.prerequisite_elective_slots)
    ? targetRow.prerequisite_elective_slots
    : [];
  const seen = new Set();
  if (codes.length === 0 && slotPrereqs.length === 0) return true;
  for (const slotReq of slotPrereqs) {
    const pr = findEvalRowByElectiveSlotId(allRows, slotReq?.elective_slot_id);
    if (!pr) return false;
    if (pr.passed_via_transfer_credit === true) continue;
    const st = String(pr.status || '')
      .toLowerCase()
      .trim();
    if (st === 'inc' || st === 'incomplete') return false;
    if (st === 'passed' || st === 'pass' || st === 'credit') continue;
    const pgSlot =
      pr.passing_grade != null && pr.passing_grade !== '' && !Number.isNaN(parseFloat(pr.passing_grade))
        ? parseFloat(pr.passing_grade)
        : 50;
    const rawGSlot = pr.grade;
    if (gradeMeetsPassingThreshold(rawGSlot, pgSlot, st)) continue;
    if (st === 'failed' || st === 'fail' || st === 'f') return false;
    if (rawGSlot != null && String(rawGSlot).trim() !== '' && !isCompleteGrade(rawGSlot)) return false;
    return false;
  }
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
    if (gradeMeetsPassingThreshold(rawG, pg, st)) continue;
    if (st === 'failed' || st === 'fail' || st === 'f') return false;
    if (rawG != null && String(rawG).trim() !== '' && !isCompleteGrade(rawG)) return false;
    return false;
  }
  return true;
}

function evalPrerequisiteRowPassed(row) {
  if (!row) return false;
  if (row.passed_via_transfer_credit === true) return true;
  const status = String(row.status || '').toLowerCase().trim();
  if (status === 'passed' || status === 'pass' || status === 'credit') return true;
  if (status === 'inc' || status === 'incomplete' || status === 'failed' || status === 'fail' || status === 'f') {
    return false;
  }
  const passing = passingForEvalRow(row);
  return gradeMeetsPassingThreshold(row.grade, passing, status);
}

function unmetEvalPrerequisiteLabels(allRows, targetRow) {
  const preRules = Array.isArray(targetRow?.prerequisite_rule_labels)
    ? targetRow.prerequisite_rule_labels
    : [];
  const standingRuleLabels = [
    ...new Set(
      preRules
        .filter((label) => isStandingOrBulkPrerequisiteRule(label))
        .map((label) => formatEvalRequisiteRuleLabel(label))
        .filter(Boolean)
    ),
  ];

  const labels = [];
  const seen = new Set();
  const pre = Array.isArray(targetRow?.prerequisite_subject_codes)
    ? targetRow.prerequisite_subject_codes
    : [];
  pre.forEach((code) => {
    const normalized = normalizeEvalSubjectCode(code);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    const row = findEvalRowBySubjectCode(allRows, code);
    if (row && !evalPrerequisiteRowPassed(row)) {
      labels.push(String(code).trim());
    }
  });

  const slotPrereqs = Array.isArray(targetRow?.prerequisite_elective_slots)
    ? targetRow.prerequisite_elective_slots
    : [];
  slotPrereqs.forEach((slotReq) => {
    const slotId = slotReq?.elective_slot_id;
    if (slotId == null || slotId === '') return;
    const key = `slot:${slotId}`;
    if (seen.has(key)) return;
    seen.add(key);
    const row = findEvalRowByElectiveSlotId(allRows, slotId);
    if (row && !evalPrerequisiteRowPassed(row)) {
      labels.push(slotReq?.slot_name || row.elective_slot_name || `Elective slot ${slotId}`);
    }
  });

  // Standing / "all subjects through year N" → show "4th year standing", not dozens of codes.
  if (standingRuleLabels.length > 0 && labels.length > 0) {
    return standingRuleLabels;
  }

  // Huge expanded lists without a rule label still collapse.
  if (labels.length > 8) {
    return ['prior year standing not met'];
  }

  return labels;
}

/**
 * @param {object} props
 * @param {'need-evaluation'|'already-evaluated'} [props.listMode]
 * @param {'pending'|'completed'|'all'} [props.listScope] — API student list filter (default: completed for evaluated tab, all for need-evaluation tab).
 * @param {'default'|'curriculumTracking'} [props.variant] — Curriculum tab: Figma-style copy and all-student list.
 */
const EVALUATION_WORK_PERMS = [
  'Student Evaluation',
  'evaluation.view',
  'evaluation.create',
  'evaluation.edit',
  'evaluation.approve',
];

/** Subject equivalence create/edit (evaluation quick modal + catalog maintenance). */
const SUBJECT_EQUIV_MUTATE_PERMS = [
  'System Management',
  'Credit Evaluation',
  'credit_eval.create',
  'credit_eval.approve',
];

const StudentEvaluationView = ({
  listMode = 'need-evaluation',
  listScope: listScopeProp,
  variant = 'default',
}) => {
  const { user, isAdmin, isFaculty, isProgramHead, hasAnyPermission } = useAuth();
  const canEdit = !!(isAdmin || isFaculty || isProgramHead || hasAnyPermission(EVALUATION_WORK_PERMS));
  /** Former Evaluator role is now Adviser (Evaluator voided). */
  const isEvaluatorOnly = false;
  const canEditEvaluationRows = canEdit && !isEvaluatorOnly;
  const canEditNumericGrades = canEditEvaluationRows;
  const canManageSubjectEquivalences = isAdmin || hasAnyPermission(SUBJECT_EQUIV_MUTATE_PERMS);
  const isEvaluatedModule = listMode === 'already-evaluated';
  const isCurriculumTracking = variant === 'curriculumTracking';
  /** Need-evaluation tab loads the full roster (`all`) so students stay visible after a completion is logged; Evaluated tab still filters to `completed`. */
  const resolvedListScope =
    listScopeProp ?? (isEvaluatedModule ? 'completed' : 'all');

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [baselineData, setBaselineData] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const studentListAbortRef = useRef(null);
  const autoPromoteAttemptRef = useRef('');
  const offsemMigratedRef = useRef('');

  // Track all drafts and which ones have been modified
  const [drafts, setDrafts] = useState({});
  const [modifiedKeys, setModifiedKeys] = useState(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [, setSaveError] = useState('');
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteEvaluatedBy, setPromoteEvaluatedBy] = useState('');
  const [promoteModalTrackId, setPromoteModalTrackId] = useState('');
  const [promoteSaving, setPromoteSaving] = useState(false);
  const [electiveTrackSaving, setElectiveTrackSaving] = useState(false);
  const [pendingProgramId, setPendingProgramId] = useState(null);
  const [programPreviewLoading, setProgramPreviewLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [electiveTrackPopoverKey, setElectiveTrackPopoverKey] = useState(null);
  const [electiveSubjectPopoverKey, setElectiveSubjectPopoverKey] = useState(null);
  const [electiveTrackDrafts, setElectiveTrackDrafts] = useState({});
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadScope, setDownloadScope] = useState('all');
  const [downloadSelectedTermKeys, setDownloadSelectedTermKeys] = useState([]);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const electiveTrackPopoverRef = useRef(null);
  const [subjectEquivModalOpen, setSubjectEquivModalOpen] = useState(false);
  const [subjectEquivFixedLocal, setSubjectEquivFixedLocal] = useState(null);
  /** Preview-only placements for remaining subjects. */
  const [placementPreviewOpen, setPlacementPreviewOpen] = useState(false);
  const [placementPreviewMap, setPlacementPreviewMap] = useState({});
  const [placementPreviewConfirmedMap, setPlacementPreviewConfirmedMap] = useState({});
  const [placementPreviewInsertSlotKey, setPlacementPreviewInsertSlotKey] = useState(null);
  const placementPreviewStorageKey = useMemo(() => {
    const sid = data?.student?.student_id;
    return sid != null && sid !== '' ? `evaluation-placement-preview:${sid}` : null;
  }, [data?.student?.student_id]);

  const [listYearLevelFilter, setListYearLevelFilter] = useState('');
  const [evalFilterCurriculumId, setEvalFilterCurriculumId] = useState('');
  const [evalFilterYearId, setEvalFilterYearId] = useState('');
  const [evalFilterSemesterId, setEvalFilterSemesterId] = useState('');
  const [standingSaving, setStandingSaving] = useState(false);
  const [currentStandingPanelOpen, setCurrentStandingPanelOpen] = useState(false);
  const [standingLoadDeferred, setStandingLoadDeferred] = useState(() => new Set());
  const [standingLoadSaving, setStandingLoadSaving] = useState(false);
  const [standingLoadDirty, setStandingLoadDirty] = useState(false);
  /** Prior-term takes: OFFSEM/Semestral badge at curriculum home; Subject placement holds the standing-term move. */
  const [offSemesterTakeMap, setOffSemesterTakeMap] = useState({});
  /** After save load plan: map subjects for the following semester. */
  const [nextSemMapOpen, setNextSemMapOpen] = useState(false);
  const [nextSemSelectedKeys, setNextSemSelectedKeys] = useState(() => new Set());
  const [nextSemCurrentTakeKeys, setNextSemCurrentTakeKeys] = useState(() => new Set());
  const [nextSemMapNeedsInit, setNextSemMapNeedsInit] = useState(false);
  const getRowKey = getEvaluationRowKey;
  const offSemesterStorageKey = useMemo(() => {
    const sid = data?.student?.student_id;
    return sid != null && sid !== '' ? `evaluation-offsem-takes:${sid}` : null;
  }, [data?.student?.student_id]);
  const nextSemPlanStorageKey = useMemo(() => {
    const sid = data?.student?.student_id;
    return sid != null && sid !== '' ? `evaluation-next-sem-plan:${sid}` : null;
  }, [data?.student?.student_id]);

  const mergedRowsForPrereq = useMemo(() => {
    if (!data?.rows?.length) return [];
    return data.rows.map((row) => mergeEvalRowWithDrafts(row, drafts, getEvaluationRowKey));
  }, [data?.rows, drafts]);

  const mergedRowsByKey = useMemo(
    () => new Map(mergedRowsForPrereq.map((row) => [getEvaluationRowKey(row), row])),
    [mergedRowsForPrereq],
  );

  /** Earned / remaining that include unsaved grade & pass previews. */
  const previewSummary = useMemo(() => {
    const server = data?.summary || {};
    const curriculumFromServer = Number(server.total_units_in_curriculum);
    let curriculumUnits = Number.isFinite(curriculumFromServer) ? curriculumFromServer : 0;
    let earned = 0;
    let curriculumFromRows = 0;

    (mergedRowsForPrereq.length ? mergedRowsForPrereq : data?.rows || []).forEach((row) => {
      if (row?.previous_program_only === true) return;
      const units = Number(row?.units);
      const u = Number.isFinite(units) && units > 0 ? units : 0;
      curriculumFromRows += u;
      if (evalPrerequisiteRowPassed(row) || isTransferCreditRowForTermGate(row)) {
        earned += u;
      }
    });

    if (!curriculumUnits) curriculumUnits = curriculumFromRows;
    return {
      total_units_in_curriculum: curriculumUnits,
      total_units_earned: earned,
      lacking_units: Math.max(0, curriculumUnits - earned),
    };
  }, [data?.summary, data?.rows, mergedRowsForPrereq]);

  const showPlacementPreview = true;

  const placementPreviewSlots = useMemo(() => {
    if (!data?.rows?.length) return [];
    const map = new Map();
    const years = new Map();
    const kindMeta = {};

    data.rows.forEach((row) => {
      const yearId = row.year_level_id;
      const semId = row.semester_id;
      const yearLabel = row.year_level_name || `Year ${yearId ?? ''}`;
      const semesterLabel = row.semester_name || `Semester ${semId ?? ''}`;
      const key = `${yearId ?? '∅'}|${semId ?? '∅'}`;

      if (yearId != null && yearId !== '') {
        years.set(String(yearId), { yearId, yearLabel });
      }

      const kind = getEvalSemesterKind(semId, semesterLabel);
      if (kind !== 'other' && !kindMeta[kind]) {
        kindMeta[kind] = { semId, semesterLabel };
      }

      if (map.has(key)) return;
      map.set(key, {
        key,
        yearId,
        semId,
        yearLabel,
        semesterLabel,
        label: `${yearLabel} — ${semesterLabel}`,
      });
    });

    // Always expose 1st / 2nd / Summer per year (even when curriculum has no Summer rows).
    if (!kindMeta.first) kindMeta.first = { semId: 1, semesterLabel: '1st Semester' };
    if (!kindMeta.second) kindMeta.second = { semId: 2, semesterLabel: '2nd Semester' };
    if (!kindMeta.summer) kindMeta.summer = { semId: 3, semesterLabel: 'Summer' };

    years.forEach(({ yearId, yearLabel }) => {
      ['first', 'second', 'summer'].forEach((kind) => {
        const hasKind = [...map.values()].some(
          (s) =>
            String(s.yearId ?? '') === String(yearId ?? '') &&
            getEvalSemesterKind(s.semId, s.semesterLabel) === kind,
        );
        if (hasKind) return;
        const meta = kindMeta[kind];
        const key = `${yearId ?? '∅'}|${meta.semId ?? '∅'}`;
        if (map.has(key)) return;
        map.set(key, {
          key,
          yearId,
          semId: meta.semId,
          yearLabel,
          semesterLabel: meta.semesterLabel,
          label: `${yearLabel} — ${meta.semesterLabel}`,
        });
      });
    });

    return [...map.values()].sort((a, b) => {
      const ay = Number(a.yearId ?? 0) - Number(b.yearId ?? 0);
      if (ay !== 0) return ay;
      return (
        placementTermSortValue(a.semId, a.semesterLabel) -
        placementTermSortValue(b.semId, b.semesterLabel)
      );
    });
  }, [data?.rows]);

  const parseYearNumberFromLabel = useCallback((yearLabel, yearId) => {
    const txt = String(yearLabel || '').toLowerCase();
    if (/(^|\D)(1|1st|first)(\D|$)/.test(txt)) return 1;
    if (/(^|\D)(2|2nd|second)(\D|$)/.test(txt)) return 2;
    if (/(^|\D)(3|3rd|third)(\D|$)/.test(txt)) return 3;
    if (/(^|\D)(4|4th|fourth)(\D|$)/.test(txt)) return 4;
    const idNum = Number(yearId);
    return Number.isFinite(idNum) && idNum >= 1 && idNum <= 4 ? idNum : null;
  }, []);

  const getPlacementSlotMeta = useCallback(
    (yearId, semId) =>
      placementPreviewSlots.find(
        (s) =>
          String(s.yearId ?? '') === String(yearId ?? '') &&
          String(s.semId ?? '') === String(semId ?? ''),
      ) || null,
    [placementPreviewSlots],
  );

  const getPlacementSlotUnitCap = useCallback(
    (yearId, semId, slotMeta) => {
      const semLabel = slotMeta?.semesterLabel || '';
      const semKind = getEvalSemesterKind(semId, semLabel);
      if (semKind === 'summer') return EVAL_SUMMER_UNIT_CAP;

      const yearLabel = slotMeta?.yearLabel || '';
      const yn = parseYearNumberFromLabel(yearLabel, yearId);
      if (yn && EVAL_YEAR_UNIT_CAPS[yn]) return EVAL_YEAR_UNIT_CAPS[yn];
      return EVAL_YEAR_UNIT_CAPS[1];
    },
    [parseYearNumberFromLabel],
  );

  const placementPreviewRemainingRows = useMemo(() => {
    return mergedRowsForPrereq.filter((row) => !evalPrerequisiteRowPassed(row));
  }, [mergedRowsForPrereq]);

  const placementPreviewYears = useMemo(() => {
    const byYear = new Map();
    placementPreviewSlots.forEach((slot) => {
      const yearKey = String(slot.yearId ?? 'unknown');
      if (!byYear.has(yearKey)) {
        byYear.set(yearKey, {
          key: yearKey,
          yearId: slot.yearId,
          yearLabel: slot.yearLabel,
          sections: [],
        });
      }
      byYear.get(yearKey).sections.push({
        ...slot,
        rows: [],
      });
    });

    placementPreviewRemainingRows.forEach((row) => {
      const rowKey = getEvaluationRowKey(row);
      const placement = placementPreviewMap[rowKey] || {
        yearId: row.year_level_id,
        semId: row.semester_id,
      };
      const yearKey = String(placement.yearId ?? 'unknown');
      const sectionKey = `${placement.yearId ?? '∅'}|${placement.semId ?? '∅'}`;
      let yearGroup = byYear.get(yearKey);
      if (!yearGroup) {
        yearGroup = {
          key: yearKey,
          yearId: placement.yearId,
          yearLabel: row.year_level_name || `Year ${placement.yearId ?? ''}`,
          sections: [],
        };
        byYear.set(yearKey, yearGroup);
      }
      let section = yearGroup.sections.find((s) => s.key === sectionKey);
      if (!section) {
        const slotMeta = placementPreviewSlots.find((s) => s.key === sectionKey);
        section = {
          key: sectionKey,
          yearId: placement.yearId,
          semId: placement.semId,
          yearLabel: slotMeta?.yearLabel || row.year_level_name || `Year ${placement.yearId ?? ''}`,
          semesterLabel: slotMeta?.semesterLabel || row.semester_name || `Semester ${placement.semId ?? ''}`,
          label: slotMeta?.label || `${placement.yearId} — ${placement.semId}`,
          rows: [],
        };
        yearGroup.sections.push(section);
      }
      section.rows.push(row);
    });

    return [...byYear.values()]
      .map((year) => ({
        ...year,
        sections: year.sections.sort(
          (a, b) =>
            placementTermSortValue(a.semId, a.semesterLabel) -
            placementTermSortValue(b.semId, b.semesterLabel),
        ),
      }))
      .sort((a, b) => Number(a.yearId ?? 0) - Number(b.yearId ?? 0));
  }, [placementPreviewSlots, placementPreviewRemainingRows, placementPreviewMap]);

  const movePlacementPreviewSubject = useCallback(
    (rowKey, yearId, semId) => {
      const movingRow = placementPreviewRemainingRows.find(
        (r) => getEvaluationRowKey(r) === String(rowKey),
      );
      if (!movingRow) return false;

      const candidateMap = {
        ...placementPreviewMap,
        [rowKey]: { yearId, semId },
      };
      const slotMeta = getPlacementSlotMeta(yearId, semId);
      const prereqGate = evalPlacementPrereqMoveGate(
        movingRow,
        yearId,
        semId,
        slotMeta?.semesterLabel || '',
        {
          allRows: mergedRowsForPrereq,
          placementMap: candidateMap,
        },
      );
      if (!prereqGate.ok) {
        swalToast('warning', prereqGate.note || 'Take the prerequisite first.');
        return false;
      }
      const cap = getPlacementSlotUnitCap(yearId, semId, slotMeta);
      const targetUnits = placementPreviewRemainingRows.reduce((acc, row) => {
        const key = getEvaluationRowKey(row);
        const placement = candidateMap[key] || {
          yearId: row.year_level_id,
          semId: row.semester_id,
        };
        if (
          String(placement.yearId ?? '') === String(yearId ?? '') &&
          String(placement.semId ?? '') === String(semId ?? '')
        ) {
          const u = Number(row.units);
          return acc + (Number.isFinite(u) ? u : 0);
        }
        return acc;
      }, 0);

      if (targetUnits > cap) {
        const label = slotMeta?.semesterLabel || 'this term';
        swalToast('warning', `Cannot exceed ${cap} units in ${label}.`);
        return false;
      }

      setPlacementPreviewMap(candidateMap);
      return true;
    },
    [
      placementPreviewRemainingRows,
      placementPreviewMap,
      mergedRowsForPrereq,
      getPlacementSlotMeta,
      getPlacementSlotUnitCap,
    ],
  );

  const placementPreviewSubjectOptions = useMemo(() => {
    return placementPreviewRemainingRows.map((row) => {
      const id = getEvaluationRowKey(row);
      const code = row.subject_code || row.elective_slot_name || '—';
      const title =
        row.subject_name || (row.elective_pending ? 'Pending track selection' : '—');
      const placement = placementPreviewMap[id] || {
        yearId: row.year_level_id,
        semId: row.semester_id,
      };
      const slotKey = `${placement.yearId ?? ''}|${placement.semId ?? ''}`;
      const slot = placementPreviewSlots.find((s) => s.key === slotKey);
      return {
        id,
        label: `${code} — ${title}`,
        where: slot ? slot.label : 'Unplaced',
        slotKey,
        homeSemId: row.semester_id,
        homeSemName: row.semester_name,
      };
    });
  }, [placementPreviewRemainingRows, placementPreviewMap, placementPreviewSlots]);

  const insertPlacementPreviewSubjectIntoSlot = useCallback(
    (rowKey, yearId, semId) => {
      if (!rowKey) return;
      const row = placementPreviewRemainingRows.find(
        (r) => getEvaluationRowKey(r) === String(rowKey),
      );
      if (!row) return;
      const moved = movePlacementPreviewSubject(String(rowKey), yearId, semId);
      if (moved) {
        setPlacementPreviewInsertSlotKey(null);
      }
    },
    [placementPreviewRemainingRows, movePlacementPreviewSubject],
  );

  const getPlacementMoveOptionsForRow = useCallback(
    (row, currentKey) => {
      return placementPreviewSlots.filter((slot) => {
        if (slot.key === currentKey) return true;
        const rowKey = getEvaluationRowKey(row);
        const candidateMap = {
          ...placementPreviewMap,
          [rowKey]: { yearId: slot.yearId, semId: slot.semId },
        };
        return evalPlacementPrereqMoveGate(
          row,
          slot.yearId,
          slot.semId,
          slot.semesterLabel,
          {
            allRows: mergedRowsForPrereq,
            placementMap: candidateMap,
          },
        ).ok;
      });
    },
    [placementPreviewSlots, placementPreviewMap, mergedRowsForPrereq],
  );

  const placementPreviewHasPendingChanges = useMemo(() => {
    const current = JSON.stringify(placementPreviewMap);
    const confirmed = JSON.stringify(placementPreviewConfirmedMap);
    return current !== confirmed;
  }, [placementPreviewMap, placementPreviewConfirmedMap]);

  const placementPreviewPendingCount = useMemo(() => {
    if (!placementPreviewHasPendingChanges) return 0;
    const keys = new Set([
      ...Object.keys(placementPreviewMap),
      ...Object.keys(placementPreviewConfirmedMap),
    ]);
    let count = 0;
    keys.forEach((key) => {
      const cur = placementPreviewMap[key];
      const conf = placementPreviewConfirmedMap[key];
      if (JSON.stringify(cur ?? null) !== JSON.stringify(conf ?? null)) count += 1;
    });
    return count;
  }, [placementPreviewHasPendingChanges, placementPreviewMap, placementPreviewConfirmedMap]);

  const handleConfirmPlacementPreview = useCallback(() => {
    if (!placementPreviewHasPendingChanges) return;
    setPlacementPreviewConfirmedMap(placementPreviewMap);
    setPlacementPreviewInsertSlotKey(null);
    if (placementPreviewStorageKey) {
      try {
        window.localStorage.setItem(
          placementPreviewStorageKey,
          JSON.stringify(placementPreviewMap || {}),
        );
      } catch {
        // Ignore storage failures; preview still works in-memory.
      }
    }
    swalToast('success', 'Preview placement confirmed.');
  }, [placementPreviewHasPendingChanges, placementPreviewMap, placementPreviewStorageKey]);

  const handleDiscardPlacementPreview = useCallback(() => {
    setPlacementPreviewMap(placementPreviewConfirmedMap);
    setPlacementPreviewInsertSlotKey(null);
    if (placementPreviewStorageKey) {
      try {
        window.localStorage.setItem(
          placementPreviewStorageKey,
          JSON.stringify(placementPreviewConfirmedMap || {}),
        );
      } catch {
        // Ignore storage failures; preview still works in-memory.
      }
    }
    swalToast('info', 'Preview changes discarded.');
  }, [placementPreviewConfirmedMap, placementPreviewStorageKey]);

  /** API may use incomplete; UI uses inc — treat as equivalent. */
  const normalizeStatusForCompare = (s) => {
    if (s === '' || s == null) return '';
    const t = String(s).trim().toLowerCase();
    if (t === 'inc' || t === 'incomplete') return 'incomplete';
    return t;
  };

  const draftMatchesSavedRow = (draftGrade, draftStatus, row, draftDeadline = '') => {
    const gradeOk =
      manualGradesEquivalentForRow(draftGrade, row.grade) &&
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

  /** Transfer credit on an active evaluation (pending with mapped subject, or approved). */
  const isTransferCreditRow = (row) =>
    row?.passed_via_transfer_credit === true ||
    String(row?.status || '').toLowerCase() === 'credit';

  const fetchStudentList = useCallback(
    async (search = '') => {
      // Cancel any in-flight list request so typing stays responsive.
      if (studentListAbortRef.current) {
        studentListAbortRef.current.abort();
      }
      const controller = new AbortController();
      studentListAbortRef.current = controller;

      setLoadingList(true);
      try {
        const trimmed = String(search || '').trim();
        const params = {
          search: trimmed || undefined,
          // Smaller first paint; typing refetches with a tighter search set.
          limit: trimmed ? 80 : 150,
        };
        if (resolvedListScope !== 'all') {
          params.academic_record = resolvedListScope;
        }
        const response = await api.get('/evaluation/students', {
          params,
          signal: controller.signal,
          skipLoading: true,
        });
        const list = response.data.students || [];
        setStudents(list);
        setSelectedStudent((prev) => {
          if (!prev) return prev;
          const found = list.find((s) => s.student_id === prev.student_id);
          return found || prev;
        });
      } catch (err) {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
          return;
        }
        console.error('Error fetching student list:', err);
        setStudents([]);
      } finally {
        if (studentListAbortRef.current === controller) {
          setLoadingList(false);
        }
      }
    },
    [resolvedListScope]
  );

  /** After grades are saved, ensure one academic-record completion exists so the student appears under Evaluated students (no separate "Store" step). */
  const syncStudentToEvaluatedListIfNeeded = useCallback(
    async (studentId) => {
      if (!canEdit || isEvaluatedModule || !studentId) return;
      try {
        const res = await api.get('/evaluation/academic-record/completions', {
          params: { student_id: studentId },
          skipLoading: true,
        });
        const already = (res.data.completions || []).length > 0;
        if (!already) {
          await api.post('/evaluation/academic-record/complete', {
            student_id: studentId,
          });
        }
        await fetchStudentList(searchTerm);
      } catch (e) {
        console.warn('Could not sync evaluated-students list', e);
      }
    },
    [canEdit, isEvaluatedModule, fetchStudentList, searchTerm]
  );

  useEffect(() => {
    const delay = searchTerm.trim() ? 200 : 0;
    const timeoutId = setTimeout(() => {
      fetchStudentList(searchTerm);
    }, delay);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchStudentList]);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const response = await api.get('/lookup/programs', { skipLoading: true });
        const programsData = Array.isArray(response.data)
          ? response.data
          : response.data?.data || response.data || [];
        setPrograms(Array.isArray(programsData) ? programsData : []);
      } catch (err) {
        console.warn('Could not fetch programs:', err);
        setPrograms([]);
      }
    };
    loadPrograms();
  }, []);

  const persistStudentStanding = useCallback(
    async ({ yearId, semesterId }) => {
      const studentId = data?.student?.student_id;
      if (!canEditEvaluationRows || !studentId || !yearId || !semesterId) return;
      setStandingSaving(true);
      try {
        const response = await api.post('/evaluation/student/standing', {
          student_id: Number(studentId),
          year_level_id: Number(yearId),
          semester_id: Number(semesterId),
        });
        const nextStudent = response.data?.student;
        const nextCurriculum = response.data?.curriculum;
        if (nextStudent || nextCurriculum) {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  student: nextStudent ? { ...prev.student, ...nextStudent } : prev.student,
                  curriculum: nextCurriculum || prev.curriculum,
                }
              : prev
          );
          setBaselineData((prev) =>
            prev
              ? {
                  ...prev,
                  student: nextStudent ? { ...prev.student, ...nextStudent } : prev.student,
                  curriculum: nextCurriculum || prev.curriculum,
                }
              : prev
          );
        }
      } catch (err) {
        await swalError(
          'Could not update standing',
          err.response?.data?.message || 'Request failed'
        );
      } finally {
        setStandingSaving(false);
      }
    },
    [canEditEvaluationRows, data?.student?.student_id]
  );

  const programOptions = useMemo(
    () =>
      programs.map((program) => ({
        value: String(program.program_id),
        label: program.program_code
          ? `${program.program_name || 'Unnamed Program'} (${program.program_code})`
          : program.program_name || `Program ${program.program_id}`,
      })),
    [programs],
  );

  const savedProgramId = baselineData?.student?.program?.program_id ?? null;
  const hasPendingProgramChange =
    pendingProgramId != null &&
    Number(pendingProgramId) !== Number(savedProgramId ?? '');
  const unsavedChangeCount = modifiedKeys.size + (hasPendingProgramChange ? 1 : 0);
  const hasUnsavedChanges = unsavedChangeCount > 0;
  const displayProgramId = hasPendingProgramChange ? pendingProgramId : savedProgramId;

  const yearLevelOptions = useMemo(() => {
    const m = new Map();
    let hasUnassigned = false;
    students.forEach((s) => {
      const id = s.year_level_id;
      if (id == null || id === '') {
        hasUnassigned = true;
        return;
      }
      const name = s.year_level_name || `Year ${id}`;
      m.set(String(id), name);
    });
    const opts = [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => Number(a.id) - Number(b.id));
    if (hasUnassigned) {
      opts.push({ id: '__unassigned__', name: 'Unassigned' });
    }
    return opts;
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!listYearLevelFilter) return students;
    if (listYearLevelFilter === '__unassigned__') {
      return students.filter((s) => s.year_level_id == null || s.year_level_id === '');
    }
    return students.filter((s) => String(s.year_level_id ?? '') === listYearLevelFilter);
  }, [students, listYearLevelFilter]);

  const evaluationFilterOptions = useMemo(() => {
    if (!data?.rows?.length) {
      return { years: [], curricula: [], programLabel: '' };
    }
    const rows = data.rows;
    const yearsMap = new Map();
    rows.forEach((r) => {
      if (r.year_level_id != null && r.year_level_id !== '') {
        const label = r.year_level_name || `Year ${r.year_level_id}`;
        yearsMap.set(String(r.year_level_id), { id: String(r.year_level_id), label });
      }
    });
    const years = [...yearsMap.values()].sort((a, b) => Number(a.id) - Number(b.id));

    // Curriculum dropdown = student's assigned curriculum version only (e.g. 2018-19).
    const curricula = [];
    const curriculumMeta = data?.curriculum;
    if (curriculumMeta?.curriculum_header_id != null) {
      curricula.push({
        id: String(curriculumMeta.curriculum_header_id),
        label: curriculumMeta.label || String(curriculumMeta.effective_year || curriculumMeta.curriculum_header_id),
      });
    }

    const programLabel =
      data.student?.program?.program_name ||
      data.student?.program?.program_code ||
      'Program';
    return { years, curricula, programLabel };
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
      return (
        semesterSortValue(a.semester_id, a.semester_name) -
        semesterSortValue(b.semester_id, b.semester_name)
      );
    });
  }, [data?.rows]);

  const downloadTermOptions = useMemo(() => {
    if (!data?.rows?.length) return [];
    const rowCountByTerm = data.rows.reduce((acc, row) => {
      const key = evaluationTermKeyFromRow(row);
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());

    return orderedCurriculumTerms.map((term) => {
      const key = evaluationTermKeyFromParts(term.year_level_id, term.semester_id);
      return {
        key,
        label: `${term.year_level_name || `Year ${term.year_level_id}`} - ${
          term.semester_name || `Semester ${term.semester_id}`
        }`,
        rowCount: rowCountByTerm.get(key) || 0,
        year_level_id: term.year_level_id,
        semester_id: term.semester_id,
      };
    });
  }, [data?.rows, orderedCurriculumTerms]);

  const currentDownloadTermKey = useMemo(() => {
    if (!evalFilterYearId || !evalFilterSemesterId) return '';
    return evaluationTermKeyFromParts(evalFilterYearId, evalFilterSemesterId);
  }, [evalFilterYearId, evalFilterSemesterId]);

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

  const currentYearFirstTermIndex = useMemo(() => {
    if (!orderedCurriculumTerms.length || data?.student?.year_level_id == null) return -1;
    const idx = orderedCurriculumTerms.findIndex(
      (t) => String(t.year_level_id) === String(data.student.year_level_id)
    );
    return idx >= 0 ? idx : -1;
  }, [data?.student?.year_level_id, orderedCurriculumTerms]);

  /**
   * Deepest term index the user may view. Grades alone must not unlock the next
   * semester; only the explicit Promote action extends access to the target term.
   */
  const maxSelectableTermIndex = useMemo(() => {
    if (!orderedCurriculumTerms.length) return -1;
    const last = orderedCurriculumTerms.length - 1;
    return Math.min(Math.max(0, currentYearFirstTermIndex, promotionTargetTermIndex), last);
  }, [orderedCurriculumTerms, currentYearFirstTermIndex, promotionTargetTermIndex]);

  const allowedTerms = useMemo(() => {
    if (maxSelectableTermIndex < 0 || !orderedCurriculumTerms.length) return [];
    return orderedCurriculumTerms.slice(0, maxSelectableTermIndex + 1);
  }, [orderedCurriculumTerms, maxSelectableTermIndex]);

  const allowedTermKeySet = useMemo(
    () => new Set(allowedTerms.map((t) => `${t.year_level_id}-${t.semester_id}`)),
    [allowedTerms]
  );

  const firstIncompleteAllowedTerm = useMemo(() => {
    if (!allowedTerms.length || !data?.rows?.length) return allowedTerms[allowedTerms.length - 1] || null;
    return (
      allowedTerms.find((term) => {
        const termRows = data.rows.filter(
          (row) =>
            String(row.year_level_id) === term.year_level_id &&
            String(row.semester_id) === term.semester_id
        );
        return termRows.length > 0 && !termRows.every((row) => isEvalRowCompleteFromServerRow(row));
      }) ||
      allowedTerms[allowedTerms.length - 1] ||
      null
    );
  }, [allowedTerms, data?.rows]);

  /** Standing load: recorded subjects must be complete. Untaken blanks (e.g. Prog 2 for summer) do not block. */
  const currentTermCompleteForPromotion = useMemo(() => {
    if (!data?.rows?.length || !evalFilterYearId || !evalFilterSemesterId) return false;

    const deferred = new Set(
      (Array.isArray(data?.student?.standing_deferred_keys)
        ? data.student.standing_deferred_keys
        : []
      ).map(String)
    );

    const tr = data.rows.filter((r) => {
      const rowKey = getEvaluationRowKey(r);
      if (deferred.has(rowKey)) return false;
      const placement = placementPreviewConfirmedMap[rowKey];
      const y = placement?.yearId ?? r.year_level_id;
      const s = placement?.semId ?? r.semester_id;
      return (
        String(y) === String(evalFilterYearId) &&
        String(s) === String(evalFilterSemesterId)
      );
    });

    const actionable = tr.filter((r) => {
      const merged = mergedRowsByKey.get(getEvaluationRowKey(r)) || r;
      return !isEvalRowUntakenBlank(merged);
    });

    // Need at least one recorded subject this standing; blanks are optional later.
    if (actionable.length === 0) return false;
    return actionable.every((r) => {
      const merged = mergedRowsByKey.get(getEvaluationRowKey(r)) || r;
      return isEvalRowCompleteFromServerRow(merged);
    });
  }, [
    data?.rows,
    data?.student?.standing_deferred_keys,
    evalFilterYearId,
    evalFilterSemesterId,
    placementPreviewConfirmedMap,
    mergedRowsByKey,
  ]);

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

  const studentAcademicStatus = useMemo(() => {
    return String(
      data?.computed_academic_status || data?.student?.academic_status || ''
    ).trim();
  }, [data?.computed_academic_status, data?.student?.academic_status]);

  const isRegularStudent = useMemo(
    () => isRegularAcademicStatus(studentAcademicStatus),
    [studentAcademicStatus]
  );

  const isIrregularStudent = useMemo(
    () => isIrregularAcademicStatus(studentAcademicStatus),
    [studentAcademicStatus]
  );

  const yearsAllowedForFilter = useMemo(() => evaluationFilterOptions.years, [evaluationFilterOptions.years]);

  const unitsBasedYearStanding = useMemo(
    () => yearStandingFromEarnedUnits(data?.summary?.total_units_earned),
    [data?.summary?.total_units_earned]
  );

  /** School year shown in standing (advances with year level; curriculum Effective SY stays fixed). */
  const standingSchoolYearLabel = useMemo(() => {
    const years = yearsAllowedForFilter.length
      ? yearsAllowedForFilter
      : evaluationFilterOptions.years;
    const yearLabel =
      years.find((y) => String(y.id) === String(evalFilterYearId))?.label || '';
    const yearNum =
      parseYearNumberFromLabel(yearLabel, evalFilterYearId) ||
      unitsBasedYearStanding ||
      1;
    return (
      schoolYearLabelForStanding(
        data?.curriculum?.effective_year ?? data?.curriculum?.label,
        yearNum
      ) ||
      data?.student?.academic_year_name ||
      data?.curriculum?.label ||
      null
    );
  }, [
    yearsAllowedForFilter,
    evaluationFilterOptions.years,
    evalFilterYearId,
    parseYearNumberFromLabel,
    unitsBasedYearStanding,
    data?.curriculum?.effective_year,
    data?.curriculum?.label,
    data?.student?.academic_year_name,
  ]);

  const unitsBasedYearId = useMemo(() => {
    const years = yearsAllowedForFilter.length
      ? yearsAllowedForFilter
      : evaluationFilterOptions.years;
    return resolveYearOptionIdForStanding(years, unitsBasedYearStanding, parseYearNumberFromLabel);
  }, [
    yearsAllowedForFilter,
    evaluationFilterOptions.years,
    unitsBasedYearStanding,
    parseYearNumberFromLabel,
  ]);

  const yearOrdinalForStandingId = useCallback(
    (yearId) => {
      if (yearId == null || yearId === '') return 0;
      const years = yearsAllowedForFilter.length
        ? yearsAllowedForFilter
        : evaluationFilterOptions.years;
      const opt = years.find((y) => String(y.id) === String(yearId));
      return (
        parseYearNumberFromLabel(opt?.label, yearId) ||
        Number(yearId) ||
        0
      );
    },
    [
      yearsAllowedForFilter,
      evaluationFilterOptions.years,
      parseYearNumberFromLabel,
    ]
  );

  const findCurriculumTerm = useCallback(
    (yearId, semId) => {
      if (yearId == null || yearId === '' || semId == null || semId === '') return null;
      return (
        orderedCurriculumTerms.find(
          (t) =>
            String(t.year_level_id) === String(yearId) &&
            String(t.semester_id) === String(semId)
        ) || null
      );
    },
    [orderedCurriculumTerms]
  );

  /**
   * Current standing term for filters / Current subjects / school-year label.
   * After Promote, use the promotion target (e.g. 2nd Yr 1st Sem) even when
   * earned units still say 1st year. Otherwise profile standing, else units + Lookup.
   */
  const activeSemesterStandingTerm = useMemo(() => {
    if (!orderedCurriculumTerms.length) return null;

    const ty = data?.student?.promotion_target_year_level_id;
    const ts = data?.student?.promotion_target_semester_id;
    if (
      data?.student?.promoted_next_sem_at &&
      ty != null &&
      ty !== '' &&
      ts != null &&
      ts !== ''
    ) {
      const promotedTerm = findCurriculumTerm(ty, ts);
      if (promotedTerm) return promotedTerm;
    }

    // Profile year/sem after promote (may be ahead of units-based year).
    const py = data?.student?.year_level_id;
    const ps =
      data?.student?.semester_id != null && data.student.semester_id !== ''
        ? data.student.semester_id
        : null;
    if (py != null && py !== '' && ps != null) {
      const profileTerm = findCurriculumTerm(py, ps);
      const profileOrd = yearOrdinalForStandingId(py);
      const unitsOrd = yearOrdinalForStandingId(unitsBasedYearId);
      // Also accept when profile year standing is ahead (promotion before units catch up).
      if (profileTerm && profileOrd >= unitsOrd) {
        return profileTerm;
      }
    }

    if (!unitsBasedYearId) return null;
    const activeSemId = data?.active_semester?.semester_id;
    if (activeSemId != null && activeSemId !== '') {
      const activeTerm = findCurriculumTerm(unitsBasedYearId, activeSemId);
      if (activeTerm) return activeTerm;
    }
    return (
      orderedCurriculumTerms.find(
        (t) => String(t.year_level_id) === String(unitsBasedYearId)
      ) || null
    );
  }, [
    orderedCurriculumTerms,
    data?.student?.promoted_next_sem_at,
    data?.student?.promotion_target_year_level_id,
    data?.student?.promotion_target_semester_id,
    data?.student?.year_level_id,
    data?.student?.semester_id,
    unitsBasedYearId,
    data?.active_semester?.semester_id,
    findCurriculumTerm,
    yearOrdinalForStandingId,
  ]);

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
    return [...m.values()].sort(
      (a, b) => semesterSortValue(a.id, a.label) - semesterSortValue(b.id, b.label)
    );
  }, [data, evalFilterYearId]);

  const currentStandingSubjects = useMemo(() => {
    if (!data?.rows?.length || !evalFilterYearId || !evalFilterSemesterId) return [];

    const termIndexOf = (yearId, semId) =>
      orderedCurriculumTerms.findIndex(
        (t) =>
          String(t.year_level_id) === String(yearId) &&
          String(t.semester_id) === String(semId)
      );

    const standingIdx = termIndexOf(evalFilterYearId, evalFilterSemesterId);
    const standingYearLabel =
      (yearsAllowedForFilter.length ? yearsAllowedForFilter : evaluationFilterOptions.years).find(
        (y) => String(y.id) === String(evalFilterYearId)
      )?.label || '';
    const standingYearOrd = parseYearNumberFromLabel(standingYearLabel, evalFilterYearId);
    const standingKeyFallback = evalTermSortKey(
      evalFilterYearId,
      evalFilterSemesterId,
      semesterOptionsForYear.find((s) => s.id === evalFilterSemesterId)?.label || ''
    );

    return data.rows
      .map((r) => mergedRowsByKey.get(getEvaluationRowKey(r)) || r)
      .filter((r) => {
        if (r?.previous_program_only === true) return false;
        if (r?.from_previous_program === true) return false;
        if (isTransferCreditRowForTermGate(r)) return false;
        if (isEvalRowAlreadyTaken(r)) return false;

        // Never include a later year than standing (name/id ordinal guard).
        const rowYearOrd = parseYearNumberFromLabel(r.year_level_name, r.year_level_id);
        if (
          standingYearOrd != null &&
          rowYearOrd != null &&
          rowYearOrd > standingYearOrd
        ) {
          return false;
        }

        // Only this standing term + earlier untaken (never later terms like 2nd sem
        // while standing is still 1st sem).
        const idx = termIndexOf(r.year_level_id, r.semester_id);
        if (standingIdx >= 0) {
          if (idx < 0) return false;
          if (idx > standingIdx) return false;
        } else {
          const rowKey = evalTermSortKey(r.year_level_id, r.semester_id, r.semester_name);
          if (rowKey > standingKeyFallback) return false;
        }

        // Current-standing rows with unmet prereqs stay in the pool (shown as Blocked).
        return true;
      })
      .sort((a, b) => {
        const aCur =
          String(a.year_level_id) === String(evalFilterYearId) &&
          String(a.semester_id) === String(evalFilterSemesterId);
        const bCur =
          String(b.year_level_id) === String(evalFilterYearId) &&
          String(b.semester_id) === String(evalFilterSemesterId);
        // This standing first, then untaken / prior terms.
        if (aCur !== bCur) return aCur ? -1 : 1;
        const ia = termIndexOf(a.year_level_id, a.semester_id);
        const ib = termIndexOf(b.year_level_id, b.semester_id);
        if (ia >= 0 && ib >= 0 && ia !== ib) return ia - ib;
        const ka = evalTermSortKey(a.year_level_id, a.semester_id, a.semester_name);
        const kb = evalTermSortKey(b.year_level_id, b.semester_id, b.semester_name);
        if (ka !== kb) return ka - kb;
        return String(a.subject_code || '').localeCompare(String(b.subject_code || ''));
      });
  }, [
    data?.rows,
    evalFilterYearId,
    evalFilterSemesterId,
    mergedRowsByKey,
    semesterOptionsForYear,
    orderedCurriculumTerms,
    yearsAllowedForFilter,
    evaluationFilterOptions.years,
    parseYearNumberFromLabel,
    mergedRowsForPrereq,
  ]);

  useEffect(() => {
    const termLoad = data?.student?.standing_term_load;
    const savedDeferred = Array.isArray(data?.student?.standing_deferred_keys)
      ? data.student.standing_deferred_keys.map(String)
      : [];

    // Hydrate OFFSEM / Semestral flags from server term load when present.
    if (termLoad && typeof termLoad === 'object' && termLoad.prior_flags) {
      const flags = termLoad.prior_flags;
      if (flags && typeof flags === 'object' && !Array.isArray(flags)) {
        setOffSemesterTakeMap(flags);
        if (offSemesterStorageKey) {
          try {
            window.localStorage.setItem(offSemesterStorageKey, JSON.stringify(flags));
          } catch {
            // ignore
          }
        }
      }
    }

    // Irregular first visit (no saved term load): current standing checked,
    // prior backlog unchecked so they pick what to take.
    if (
      !termLoad &&
      isIrregularStudent &&
      currentStandingSubjects.length > 0 &&
      evalFilterYearId &&
      evalFilterSemesterId
    ) {
      const deferred = new Set();
      currentStandingSubjects.forEach((row) => {
        const key = getEvaluationRowKey(row);
        const isCurrent =
          String(row.year_level_id) === String(evalFilterYearId) &&
          String(row.semester_id) === String(evalFilterSemesterId);
        if (!isCurrent) deferred.add(key);
        if (standingLoadBlockedByPrereq(row, mergedRowsForPrereq)) {
          deferred.add(key);
        }
      });
      setStandingLoadDeferred(deferred);
      setStandingLoadDirty(false);
      return;
    }

    setStandingLoadDeferred(new Set(savedDeferred));
    setStandingLoadDirty(false);
  }, [
    data?.student?.student_id,
    JSON.stringify(data?.student?.standing_deferred_keys || []),
    JSON.stringify(data?.student?.standing_term_load || null),
    isIrregularStudent,
    currentStandingSubjects,
    evalFilterYearId,
    evalFilterSemesterId,
    mergedRowsForPrereq,
    offSemesterStorageKey,
  ]);

  /** Subject IDs actively offered for this standing semester (Lookup → Offered subjects). */
  const offeredSubjectIdsForStanding = useMemo(() => {
    const list = Array.isArray(data?.offered_subjects) ? data.offered_subjects : [];
    const standingSem = String(
      evalFilterSemesterId || data?.active_semester?.semester_id || ''
    );
    const trackId =
      data?.student?.track_id != null && data.student.track_id !== ''
        ? String(data.student.track_id)
        : '';
    const ids = new Set();
    list.forEach((o) => {
      if (String(o?.status || 'active').toLowerCase() !== 'active') return;
      if (standingSem && o.semester_id != null && String(o.semester_id) !== standingSem) {
        return;
      }
      if (
        o.track_id != null &&
        o.track_id !== '' &&
        trackId &&
        String(o.track_id) !== trackId
      ) {
        return;
      }
      if (o.subject_id != null && o.subject_id !== '') {
        ids.add(String(o.subject_id));
      }
    });
    return ids;
  }, [
    data?.offered_subjects,
    data?.active_semester?.semester_id,
    data?.student?.track_id,
    evalFilterSemesterId,
  ]);

  const isSubjectOfferedForStanding = useCallback(
    (row) => {
      const sid = row?.subject_id;
      if (sid == null || sid === '') return false;
      return offeredSubjectIdsForStanding.has(String(sid));
    },
    [offeredSubjectIdsForStanding]
  );

  const priorStandingTakeGate = useCallback(
    (row) =>
      standingPriorTakeGate(
        row,
        evalFilterSemesterId,
        isSubjectOfferedForStanding(row)
      ),
    [evalFilterSemesterId, isSubjectOfferedForStanding]
  );

  const isSubjectOfferedForSemester = useCallback(
    (row, semesterId) => {
      const sid = row?.subject_id;
      if (sid == null || sid === '') return false;
      const list = Array.isArray(data?.offered_subjects) ? data.offered_subjects : [];
      const standingSem = String(semesterId || '');
      const trackId =
        data?.student?.track_id != null && data.student.track_id !== ''
          ? String(data.student.track_id)
          : '';
      return list.some((o) => {
        if (String(o?.status || 'active').toLowerCase() !== 'active') return false;
        if (String(o.subject_id) !== String(sid)) return false;
        if (standingSem && o.semester_id != null && String(o.semester_id) !== standingSem) {
          return false;
        }
        if (
          o.track_id != null &&
          o.track_id !== '' &&
          trackId &&
          String(o.track_id) !== trackId
        ) {
          return false;
        }
        return true;
      });
    },
    [data?.offered_subjects, data?.student?.track_id]
  );

  /** Curriculum term immediately after the student's current standing. */
  const nextStandingTerm = useMemo(() => {
    if (!orderedCurriculumTerms.length || !evalFilterYearId || !evalFilterSemesterId) {
      return null;
    }
    const curIdx = orderedCurriculumTerms.findIndex(
      (t) =>
        String(t.year_level_id) === String(evalFilterYearId) &&
        String(t.semester_id) === String(evalFilterSemesterId)
    );
    if (curIdx < 0 || curIdx >= orderedCurriculumTerms.length - 1) return null;
    return orderedCurriculumTerms[curIdx + 1];
  }, [orderedCurriculumTerms, evalFilterYearId, evalFilterSemesterId]);

  const nextStandingTermLabel = useMemo(() => {
    if (!nextStandingTerm) return '';
    const years = yearsAllowedForFilter.length
      ? yearsAllowedForFilter
      : evaluationFilterOptions.years;
    const yearLabel =
      years.find((y) => String(y.id) === String(nextStandingTerm.year_level_id))?.label ||
      nextStandingTerm.year_level_name ||
      `Year ${nextStandingTerm.year_level_id}`;
    const semLabel = nextStandingTerm.semester_name || `Semester ${nextStandingTerm.semester_id}`;
    const yearNum =
      parseYearNumberFromLabel(yearLabel, nextStandingTerm.year_level_id) ||
      Number(nextStandingTerm.year_level_id) ||
      1;
    const schoolYear =
      schoolYearLabelForStanding(
        data?.curriculum?.effective_year ?? data?.curriculum?.label,
        yearNum
      ) || data?.curriculum?.label;
    return [schoolYear, yearLabel, semLabel].filter(Boolean).join(' — ');
  }, [
    nextStandingTerm,
    yearsAllowedForFilter,
    evaluationFilterOptions.years,
    parseYearNumberFromLabel,
    data?.curriculum?.effective_year,
    data?.curriculum?.label,
  ]);

  const nextStandingTermIndex = useMemo(() => {
    if (!nextStandingTerm || !orderedCurriculumTerms.length) return -1;
    return orderedCurriculumTerms.findIndex(
      (t) =>
        String(t.year_level_id) === String(nextStandingTerm.year_level_id) &&
        String(t.semester_id) === String(nextStandingTerm.semester_id)
    );
  }, [nextStandingTerm, orderedCurriculumTerms]);

  const nextSemTermIndexOf = useCallback(
    (yearId, semId) =>
      orderedCurriculumTerms.findIndex(
        (t) => String(t.year_level_id) === String(yearId) && String(t.semester_id) === String(semId)
      ),
    [orderedCurriculumTerms]
  );

  /**
   * Remaining subjects for next-sem mapping: blank untaken (+ failed/incomplete retakes).
   * Already graded/passed subjects never appear. Current standing TAKE subjects excluded.
   */
  const nextSemMappingSubjects = useMemo(() => {
    if (!data?.rows?.length) return [];

    return data.rows
      .map((r) => {
        // Prefer live draft merge so unsaved grades/pass marks are respected.
        return mergeEvalRowWithDrafts(r, drafts, getEvaluationRowKey);
      })
      .filter((r) => {
        if (r?.previous_program_only === true) return false;
        if (r?.from_previous_program === true) return false;
        if (!isEvalRowAvailableInNextSemMap(r)) return false;
        const key = getEvaluationRowKey(r);
        // Already in this standing's TAKE plan — not remaining to map.
        if (nextSemCurrentTakeKeys.has(key)) return false;
        // OFFSEM this standing = already planned for current load.
        if (offSemesterTakeMap[key]) return false;
        return true;
      })
      .sort((a, b) => {
        const ia = nextSemTermIndexOf(a.year_level_id, a.semester_id);
        const ib = nextSemTermIndexOf(b.year_level_id, b.semester_id);
        if (ia !== ib) return ia - ib;
        return String(a.subject_code || '').localeCompare(String(b.subject_code || ''));
      });
  }, [
    data?.rows,
    nextSemTermIndexOf,
    nextSemCurrentTakeKeys,
    drafts,
    offSemesterTakeMap,
  ]);

  /** Earlier untaken than the next standing — clear these first to proceed cleanly. */
  const nextSemPriorityBacklog = useMemo(() => {
    if (nextStandingTermIndex < 0) return [];
    return nextSemMappingSubjects.filter((row) => {
      const idx = nextSemTermIndexOf(row.year_level_id, row.semester_id);
      return idx >= 0 && idx < nextStandingTermIndex;
    });
  }, [nextSemMappingSubjects, nextStandingTermIndex, nextSemTermIndexOf]);

  /** Subjects whose curriculum home is the next standing term. */
  const nextSemTargetTermSubjects = useMemo(() => {
    if (!nextStandingTerm) return [];
    return nextSemMappingSubjects.filter(
      (row) =>
        String(row.year_level_id) === String(nextStandingTerm.year_level_id) &&
        String(row.semester_id) === String(nextStandingTerm.semester_id)
    );
  }, [nextSemMappingSubjects, nextStandingTerm]);

  /** Later than next standing (shown after priority + next term). */
  const nextSemLaterSubjects = useMemo(() => {
    if (nextStandingTermIndex < 0) return nextSemMappingSubjects;
    return nextSemMappingSubjects.filter((row) => {
      const idx = nextSemTermIndexOf(row.year_level_id, row.semester_id);
      return idx > nextStandingTermIndex;
    });
  }, [
    nextSemMappingSubjects,
    nextStandingTermIndex,
    nextSemTermIndexOf,
  ]);

  const nextSemCurrentTakeCodes = useMemo(() => {
    const codes = new Set();
    nextSemCurrentTakeKeys.forEach((key) => {
      const row = (data?.rows || []).find((r) => getEvaluationRowKey(r) === key);
      const code = normalizeEvalSubjectCode(row?.subject_code);
      if (code) codes.add(code);
    });
    return codes;
  }, [nextSemCurrentTakeKeys, data?.rows]);

  const isNextSemMapRowEligible = useCallback(
    (row) => {
      const preCodes = Array.isArray(row?.prerequisite_subject_codes)
        ? row.prerequisite_subject_codes
        : [];
      for (const code of preCodes) {
        const preRow = findEvalRowBySubjectCode(mergedRowsForPrereq, code);
        if (!preRow) continue;
        if (evalPrerequisiteRowPassed(preRow)) continue;
        if (nextSemCurrentTakeCodes.has(normalizeEvalSubjectCode(code))) continue;
        return false;
      }
      const preSlots = Array.isArray(row?.prerequisite_elective_slots)
        ? row.prerequisite_elective_slots
        : [];
      for (const req of preSlots) {
        const preRow = findEvalRowByElectiveSlotId(
          mergedRowsForPrereq,
          req?.elective_slot_id
        );
        if (!preRow) continue;
        if (evalPrerequisiteRowPassed(preRow)) continue;
        if (nextSemCurrentTakeCodes.has(normalizeEvalSubjectCode(preRow.subject_code))) {
          continue;
        }
        return false;
      }
      return true;
    },
    [mergedRowsForPrereq, nextSemCurrentTakeCodes]
  );

  const nextSemMapUnmetLabels = useCallback(
    (row) => {
      const preRules = Array.isArray(row?.prerequisite_rule_labels)
        ? row.prerequisite_rule_labels
        : [];
      const standingRuleLabels = [
        ...new Set(
          preRules
            .filter((label) => isStandingOrBulkPrerequisiteRule(label))
            .map((label) => formatEvalRequisiteRuleLabel(label))
            .filter(Boolean)
        ),
      ];

      const labels = [];
      const seen = new Set();
      const preCodes = Array.isArray(row?.prerequisite_subject_codes)
        ? row.prerequisite_subject_codes
        : [];
      for (const code of preCodes) {
        const normalized = normalizeEvalSubjectCode(code);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        const preRow = findEvalRowBySubjectCode(mergedRowsForPrereq, code);
        if (!preRow) continue;
        if (evalPrerequisiteRowPassed(preRow)) continue;
        if (nextSemCurrentTakeCodes.has(normalized)) continue;
        labels.push(String(code).trim() || normalized);
      }
      const preSlots = Array.isArray(row?.prerequisite_elective_slots)
        ? row.prerequisite_elective_slots
        : [];
      for (const req of preSlots) {
        const preRow = findEvalRowByElectiveSlotId(
          mergedRowsForPrereq,
          req?.elective_slot_id
        );
        if (!preRow) continue;
        if (evalPrerequisiteRowPassed(preRow)) continue;
        if (nextSemCurrentTakeCodes.has(normalizeEvalSubjectCode(preRow.subject_code))) {
          continue;
        }
        labels.push(
          (req?.slot_name && String(req.slot_name).trim()) ||
            normalizeEvalSubjectCode(preRow.subject_code) ||
            preRow.elective_slot_name ||
            'elective'
        );
      }

      // Standing / bulk rules → show "4th year standing", not every expanded code.
      if (standingRuleLabels.length > 0 && labels.length > 0) {
        return standingRuleLabels;
      }
      if (labels.length > 8) {
        return ['prior year standing not met'];
      }
      return labels;
    },
    [mergedRowsForPrereq, nextSemCurrentTakeCodes]
  );

  /** Group remaining subjects like the main evaluation year/semester tables. */
  const groupNextSemSubjectsByYear = useCallback((rows) => {
    if (!rows?.length) return [];
    const groups = new Map();
    rows.forEach((row) => {
      const yearKey = String(row.year_level_id ?? row.year_level_name ?? 'unknown');
      const termKey = `${yearKey}::${row.semester_id ?? row.semester_name ?? 'unknown'}`;
      if (!groups.has(yearKey)) {
        groups.set(yearKey, {
          id: yearKey,
          label: row.year_level_name || `Year ${row.year_level_id}`,
          yearId: row.year_level_id,
          terms: new Map(),
        });
      }
      const year = groups.get(yearKey);
      if (!year.terms.has(termKey)) {
        year.terms.set(termKey, {
          id: termKey,
          label: row.semester_name || `Semester ${row.semester_id}`,
          semId: row.semester_id,
          rows: [],
        });
      }
      year.terms.get(termKey).rows.push(row);
    });

    return [...groups.values()]
      .sort((a, b) => Number(a.yearId ?? 0) - Number(b.yearId ?? 0))
      .map((year) => ({
        ...year,
        terms: [...year.terms.values()].sort(
          (a, b) =>
            semesterSortValue(a.semId, a.label) - semesterSortValue(b.semId, b.label)
        ),
      }));
  }, []);

  const nextSemPriorityYearSections = useMemo(
    () => groupNextSemSubjectsByYear(nextSemPriorityBacklog),
    [groupNextSemSubjectsByYear, nextSemPriorityBacklog]
  );

  const nextSemTargetYearSections = useMemo(
    () => groupNextSemSubjectsByYear(nextSemTargetTermSubjects),
    [groupNextSemSubjectsByYear, nextSemTargetTermSubjects]
  );

  const nextSemLaterYearSections = useMemo(
    () => groupNextSemSubjectsByYear(nextSemLaterSubjects),
    [groupNextSemSubjectsByYear, nextSemLaterSubjects]
  );

  const nextSemMapMeta = useMemo(() => {
    if (!nextStandingTerm) {
      return {
        units: 0,
        toTakeCount: 0,
        poolCount: 0,
        eligibleCount: 0,
        unitCap: null,
        backlogCount: 0,
        backlogEligibleCount: 0,
        targetEligibleCount: 0,
        blockedCount: 0,
      };
    }
    const eligible = nextSemMappingSubjects.filter((row) => isNextSemMapRowEligible(row));
    const backlogEligible = nextSemPriorityBacklog.filter((row) =>
      isNextSemMapRowEligible(row)
    );
    const targetEligible = nextSemTargetTermSubjects.filter((row) =>
      isNextSemMapRowEligible(row)
    );
    const selected = nextSemMappingSubjects.filter((row) =>
      nextSemSelectedKeys.has(getEvaluationRowKey(row))
    );
    const units = selected.reduce((sum, row) => sum + (Number(row.units) || 0), 0);
    const yearNum = Number(nextStandingTerm.year_level_id);
    const unitCap =
      Number.isFinite(yearNum) && EVAL_YEAR_UNIT_CAPS[yearNum] != null
        ? EVAL_YEAR_UNIT_CAPS[yearNum]
        : null;
    return {
      units,
      toTakeCount: selected.length,
      poolCount: nextSemMappingSubjects.length,
      eligibleCount: eligible.length,
      unitCap,
      backlogCount: nextSemPriorityBacklog.length,
      backlogEligibleCount: backlogEligible.length,
      targetEligibleCount: targetEligible.length,
      blockedCount: nextSemMappingSubjects.length - eligible.length,
    };
  }, [
    nextStandingTerm,
    nextSemMappingSubjects,
    nextSemPriorityBacklog,
    nextSemTargetTermSubjects,
    nextSemSelectedKeys,
    isNextSemMapRowEligible,
  ]);

  useEffect(() => {
    if (!nextSemMapOpen || !nextSemMapNeedsInit || !nextStandingTerm) return;

    const nextY = String(nextStandingTerm.year_level_id);
    const nextS = String(nextStandingTerm.semester_id);
    const candidateKeys = new Set(
      nextSemMappingSubjects.map((r) => getEvaluationRowKey(r))
    );

    let selected = null;
    if (nextSemPlanStorageKey) {
      try {
        const raw = window.localStorage.getItem(nextSemPlanStorageKey);
        const parsed = raw ? JSON.parse(raw) : null;
        if (
          parsed &&
          String(parsed.nextYearId) === nextY &&
          String(parsed.nextSemId) === nextS &&
          Array.isArray(parsed.selectedKeys)
        ) {
          selected = parsed.selectedKeys
            .map(String)
            .filter((k) => {
              if (!candidateKeys.has(k)) return false;
              const row = nextSemMappingSubjects.find(
                (r) => getEvaluationRowKey(r) === k
              );
              return row ? isNextSemMapRowEligible(row) : false;
            });
        }
      } catch {
        // ignore
      }
    }

    if (!selected) {
      // Default: check eligible subjects up through the next semester only
      // (later-year untaken rows stay visible but unchecked).
      const nextIdx = orderedCurriculumTerms.findIndex(
        (t) =>
          String(t.year_level_id) === nextY && String(t.semester_id) === nextS
      );
      selected = nextSemMappingSubjects
        .filter((r) => {
          if (!isNextSemMapRowEligible(r)) return false;
          if (nextIdx < 0) return true;
          const idx = orderedCurriculumTerms.findIndex(
            (t) =>
              String(t.year_level_id) === String(r.year_level_id) &&
              String(t.semester_id) === String(r.semester_id)
          );
          return idx < 0 || idx <= nextIdx;
        })
        .map((r) => getEvaluationRowKey(r));
    }

    setNextSemSelectedKeys(new Set(selected));
    setNextSemMapNeedsInit(false);
  }, [
    nextSemMapOpen,
    nextSemMapNeedsInit,
    nextStandingTerm,
    nextSemMappingSubjects,
    nextSemPlanStorageKey,
    isNextSemMapRowEligible,
    orderedCurriculumTerms,
  ]);

  const toggleNextSemMapTake = useCallback((rowKey) => {
    const row = nextSemMappingSubjects.find((r) => getEvaluationRowKey(r) === rowKey);
    if (row && !isNextSemMapRowEligible(row)) return;
    setNextSemSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  }, [nextSemMappingSubjects, isNextSemMapRowEligible]);

  const persistNextSemMapPlan = useCallback(() => {
    if (!nextStandingTerm) {
      setNextSemMapOpen(false);
      return;
    }
    const yearNum = Number(nextStandingTerm.year_level_id);
    const unitCap =
      Number.isFinite(yearNum) && EVAL_YEAR_UNIT_CAPS[yearNum] != null
        ? EVAL_YEAR_UNIT_CAPS[yearNum]
        : null;
    if (unitCap != null && nextSemMapMeta.units > unitCap) {
      swalToast(
        'warning',
        `Next-sem plan is ${nextSemMapMeta.units} units — over the ${unitCap} unit cap.`
      );
      return;
    }

    const payload = {
      standingYearId: String(evalFilterYearId),
      standingSemId: String(evalFilterSemesterId),
      nextYearId: String(nextStandingTerm.year_level_id),
      nextSemId: String(nextStandingTerm.semester_id),
      selectedKeys: [...nextSemSelectedKeys],
      savedAt: new Date().toISOString(),
    };
    if (nextSemPlanStorageKey) {
      try {
        window.localStorage.setItem(nextSemPlanStorageKey, JSON.stringify(payload));
      } catch {
        // ignore
      }
    }
    setNextSemMapOpen(false);
    swalToast('success', 'Next-semester subject map saved');
  }, [
    nextStandingTerm,
    nextSemMapMeta.units,
    evalFilterYearId,
    evalFilterSemesterId,
    nextSemSelectedKeys,
    nextSemPlanStorageKey,
  ]);

  const renderNextSemMapSections = useCallback(
    (yearSections, planKind) => {
      if (!yearSections?.length) return null;
      return (
        <div className="eval-table-container eval-next-sem-map-tables">
          {yearSections.map((yearSection) => (
            <section key={`${planKind}-${yearSection.id}`} className="eval-year-section">
              <div className="eval-year-section__title">{yearSection.label}</div>
              <div className="eval-year-term-grid">
                {yearSection.terms.map((term) => {
                  const termName = String(term.label || '').toLowerCase();
                  const termClass = termName.includes('summer')
                    ? 'eval-term-block--summer'
                    : termName.includes('first') || termName.includes('1st')
                      ? 'eval-term-block--first-sem'
                      : termName.includes('second') || termName.includes('2nd')
                        ? 'eval-term-block--second-sem'
                        : 'eval-term-block--other-sem';
                  const termUnits = term.rows
                    .filter((r) => isNextSemMapRowEligible(r))
                    .reduce((sum, r) => sum + (Number(r.units) || 0), 0);
                  return (
                    <div key={term.id} className={`eval-term-block ${termClass}`}>
                      <div className="eval-term-header">
                        <span>{term.label}</span>
                      </div>
                      <div className="eval-responsive-table-wrap">
                        <table className="data-table eval-course-table">
                          <thead>
                            <tr>
                              <th>Pen Code</th>
                              <th>Descriptive Title</th>
                              <th>Units</th>
                              <th>Grade</th>
                              <th>Plan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {term.rows.map((row) => {
                              const rowKey = getEvaluationRowKey(row);
                              const code =
                                row.subject_code || row.elective_slot_name || '—';
                              const title = row.subject_name || '—';
                              const eligible = isNextSemMapRowEligible(row);
                              const unmet = eligible ? [] : nextSemMapUnmetLabels(row);
                              const unmetAreStandingOnly =
                                unmet.length > 0 &&
                                unmet.every((label) =>
                                  /year standing|prior subjects|prior year/i.test(label)
                                );
                              const requisiteLabel =
                                formatPromotionPrerequisiteDisplay(row);
                              const planLabel = eligible
                                ? planKind === 'priority'
                                  ? 'Take first'
                                  : planKind === 'next'
                                    ? 'Can be taken next'
                                    : 'Later term'
                                : null;
                              return (
                                <tr
                                  key={rowKey}
                                  className={
                                    eligible
                                      ? planKind === 'priority'
                                        ? 'eval-next-sem-map-row--priority'
                                        : 'eval-next-sem-map-row--take'
                                      : 'eval-row-prereq-blocked'
                                  }
                                >
                                  <td className="code-cell" data-label="Pen Code">
                                    <div className="eval-code-cell-inner">
                                      <span className="eval-code-pill">{code}</span>
                                    </div>
                                  </td>
                                  <td data-label="Descriptive Title">
                                    <div className="eval-title-cell">
                                      <span>{title}</span>
                                      {!eligible || requisiteLabel ? (
                                        <span
                                          className={`eval-requisite-line${
                                            !eligible
                                              ? ' eval-requisite-line--blocked'
                                              : ''
                                          }`}
                                        >
                                          {[
                                            row.year_level_name,
                                            row.semester_name,
                                          ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                          {requisiteLabel ? ` · ${requisiteLabel}` : ''}
                                          {!eligible &&
                                          unmet.length &&
                                          !unmetAreStandingOnly ? (
                                            <span className="eval-requisite-missing">
                                              {' '}
                                              Missing: {unmet.join(', ')}
                                            </span>
                                          ) : null}
                                        </span>
                                      ) : (
                                        <span className="eval-requisite-line">
                                          {[row.year_level_name, row.semester_name]
                                            .filter(Boolean)
                                            .join(' · ')}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td data-label="Units">
                                    <span className="eval-units-pill">
                                      {row.units ?? '—'}
                                    </span>
                                  </td>
                                  <td className="grade-cell" data-label="Grade">
                                    {formatEvalGradeReadonly(row.grade) || (
                                      <span className="eval-next-sem-map-grade-blank">
                                        —
                                      </span>
                                    )}
                                  </td>
                                  <td className="status-cell" data-label="Plan">
                                    {eligible ? (
                                      <span
                                        className={
                                          planKind === 'priority'
                                            ? 'eval-next-sem-map-take-first'
                                            : 'eval-next-sem-map-can-take'
                                        }
                                      >
                                        {planLabel}
                                      </span>
                                    ) : (
                                      <div
                                        className="eval-prereq-locked"
                                        title={
                                          unmet.length
                                            ? unmetAreStandingOnly
                                              ? `Not eligible — requires ${unmet.join(', ')}`
                                              : `Not eligible — missing: ${unmet.join(', ')}`
                                            : 'Not eligible'
                                        }
                                      >
                                        <span className="eval-prereq-locked-badge">
                                          Not eligible
                                        </span>
                                        {unmet.length ? (
                                          <span className="eval-prereq-locked-detail">
                                            {unmetAreStandingOnly
                                              ? 'Requires: '
                                              : 'Needs: '}
                                            {unmet.join(', ')}
                                          </span>
                                        ) : null}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={5} className="eval-term-footer__cell">
                                {planKind === 'priority'
                                  ? `Priority backlog eligible: ${termUnits} units`
                                  : planKind === 'next'
                                    ? `Can be taken next standing: ${termUnits} units`
                                    : `Later eligible: ${termUnits} units`}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      );
    },
    [isNextSemMapRowEligible, nextSemMapUnmetLabels]
  );

  // Drop stale placements that pinned future-term subjects into an earlier standing.
  useEffect(() => {
    if (!orderedCurriculumTerms.length || !evalFilterYearId || !evalFilterSemesterId) return;
    const standingIdx = orderedCurriculumTerms.findIndex(
      (t) =>
        String(t.year_level_id) === String(evalFilterYearId) &&
        String(t.semester_id) === String(evalFilterSemesterId)
    );
    if (standingIdx < 0) return;

    const termIndexOf = (yearId, semId) =>
      orderedCurriculumTerms.findIndex(
        (t) =>
          String(t.year_level_id) === String(yearId) &&
          String(t.semester_id) === String(semId)
      );

    const scrub = (map) => {
      if (!map || typeof map !== 'object') return map;
      let changed = false;
      const next = { ...map };
      Object.keys(next).forEach((rowKey) => {
        const row = data?.rows?.find((r) => getEvaluationRowKey(r) === rowKey);
        if (!row) return;
        const homeIdx = termIndexOf(row.year_level_id, row.semester_id);
        if (homeIdx > standingIdx) {
          delete next[rowKey];
          changed = true;
        }
      });
      return changed ? next : map;
    };

    setPlacementPreviewMap((prev) => scrub(prev));
    setPlacementPreviewConfirmedMap((prev) => scrub(prev));
  }, [
    data?.rows,
    orderedCurriculumTerms,
    evalFilterYearId,
    evalFilterSemesterId,
  ]);

  const currentStandingMeta = useMemo(() => {
    const years = yearsAllowedForFilter.length
      ? yearsAllowedForFilter
      : evaluationFilterOptions.years;
    const yearLabel =
      years.find((y) => String(y.id) === String(evalFilterYearId))?.label || '—';
    const semLabel =
      semesterOptionsForYear.find((s) => String(s.id) === String(evalFilterSemesterId))
        ?.label || '—';
    const curriculumLabel = standingSchoolYearLabel || data?.curriculum?.label || null;
    const standingKey = evalTermSortKey(
      evalFilterYearId,
      evalFilterSemesterId,
      semLabel === '—' ? '' : semLabel
    );
    const toTake = currentStandingSubjects.filter(
      (row) => !standingLoadDeferred.has(getEvaluationRowKey(row))
    );
    const units = toTake.reduce((sum, row) => sum + (Number(row.units) || 0), 0);
    const yearNum = Number(evalFilterYearId);
    const unitCap =
      Number.isFinite(yearNum) && EVAL_YEAR_UNIT_CAPS[yearNum] != null
        ? EVAL_YEAR_UNIT_CAPS[yearNum]
        : null;
    return {
      yearLabel,
      semLabel,
      curriculumLabel,
      schoolYearLabel: curriculumLabel,
      effectiveCurriculumLabel: data?.curriculum?.label || null,
      units,
      toTakeCount: toTake.length,
      poolCount: currentStandingSubjects.length,
      unitCap,
      standingKey,
    };
  }, [
    yearsAllowedForFilter,
    evaluationFilterOptions.years,
    evalFilterYearId,
    semesterOptionsForYear,
    evalFilterSemesterId,
    standingSchoolYearLabel,
    data?.curriculum?.label,
    currentStandingSubjects,
    standingLoadDeferred,
  ]);

  const savedTermLoadSummary = useMemo(() => {
    const load = data?.student?.standing_term_load;
    if (!load || typeof load !== 'object') return null;
    const takeKeys = Array.isArray(load.take_keys) ? load.take_keys.map(String) : [];
    if (!takeKeys.length && !Array.isArray(load.deferred_keys)) return null;
    const codes = takeKeys
      .map((key) => {
        const row = (data?.rows || []).find((r) => getEvaluationRowKey(r) === key);
        return row?.subject_code || row?.elective_slot_name || null;
      })
      .filter(Boolean);
    const priorCount = load.prior_flags
      ? Object.keys(load.prior_flags).length
      : 0;
    return {
      takeCount: takeKeys.length,
      priorCount,
      codes,
      yearId: load.year_level_id != null ? String(load.year_level_id) : '',
      semId: load.semester_id != null ? String(load.semester_id) : '',
      savedAt: load.saved_at || null,
    };
  }, [data?.student?.standing_term_load, data?.rows]);

  // Auto-DROP subjects blocked by prereq, or prior subjects not offered / not same-semester.
  useEffect(() => {
    if (!currentStandingSubjects.length) return;
    setStandingLoadDeferred((prev) => {
      let changed = false;
      const next = new Set(prev);
      currentStandingSubjects.forEach((row) => {
        const key = getEvaluationRowKey(row);
        if (next.has(key)) return;
        if (standingLoadBlockedByPrereq(row, mergedRowsForPrereq)) {
          next.add(key);
          changed = true;
          return;
        }
        const isCurrent =
          String(row.year_level_id) === String(evalFilterYearId) &&
          String(row.semester_id) === String(evalFilterSemesterId);
        if (!isCurrent && !priorStandingTakeGate(row).ok) {
          next.add(key);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [
    currentStandingSubjects,
    mergedRowsForPrereq,
    evalFilterYearId,
    evalFilterSemesterId,
    priorStandingTakeGate,
  ]);

  const toggleStandingLoadTake = useCallback(
    (rowKey) => {
      const row = currentStandingSubjects.find((r) => getEvaluationRowKey(r) === rowKey);
      setStandingLoadDeferred((prev) => {
        const next = new Set(prev);
        const currentlyDropped = next.has(rowKey);
        if (currentlyDropped) {
          // Trying to TAKE
          const block = standingLoadBlockedByPrereq(row, mergedRowsForPrereq);
          if (block) {
            swalToast('warning', block);
            return prev;
          }
          const isCurrent =
            row &&
            String(row.year_level_id) === String(evalFilterYearId) &&
            String(row.semester_id) === String(evalFilterSemesterId);
          if (!isCurrent) {
            const gate = priorStandingTakeGate(row);
            if (!gate.ok) {
              swalToast('warning', gate.reason);
              return prev;
            }
          }
          next.delete(rowKey);
        } else {
          // DROP this subject — also drop dependents that need it
          next.add(rowKey);
          const droppedCode = normalizeEvalSubjectCode(row?.subject_code);
          if (droppedCode) {
            currentStandingSubjects.forEach((other) => {
              const oKey = getEvaluationRowKey(other);
              if (oKey === rowKey) return;
              const needs = Array.isArray(other.prerequisite_subject_codes)
                ? other.prerequisite_subject_codes
                : [];
              if (needs.some((c) => normalizeEvalSubjectCode(c) === droppedCode)) {
                next.add(oKey);
              }
            });
          }
        }
        // Enforce prereq / prior-offer drops for anything still marked TAKE
        currentStandingSubjects.forEach((other) => {
          const oKey = getEvaluationRowKey(other);
          if (next.has(oKey)) return;
          if (standingLoadBlockedByPrereq(other, mergedRowsForPrereq)) {
            next.add(oKey);
            return;
          }
          const isCurrent =
            String(other.year_level_id) === String(evalFilterYearId) &&
            String(other.semester_id) === String(evalFilterSemesterId);
          if (!isCurrent && !priorStandingTakeGate(other).ok) {
            next.add(oKey);
          }
        });
        return next;
      });
      setStandingLoadDirty(true);
    },
    [
      currentStandingSubjects,
      mergedRowsForPrereq,
      evalFilterYearId,
      evalFilterSemesterId,
      priorStandingTakeGate,
    ]
  );

  const persistStandingLoadPlan = useCallback(async () => {
    const studentId = data?.student?.student_id;
    if (!canEditEvaluationRows || !studentId) return;
    if (!evalFilterYearId || !evalFilterSemesterId) {
      await swalError('Could not save load plan', 'Set year / semester standing first.');
      return;
    }

    // Force-drop subjects blocked by unmet prerequisites or prior-offer gate.
    const deferred = new Set(standingLoadDeferred);
    currentStandingSubjects.forEach((row) => {
      const key = getEvaluationRowKey(row);
      if (standingLoadBlockedByPrereq(row, mergedRowsForPrereq)) {
        deferred.add(key);
        return;
      }
      const isCurrent =
        String(row.year_level_id) === String(evalFilterYearId) &&
        String(row.semester_id) === String(evalFilterSemesterId);
      if (!isCurrent && !priorStandingTakeGate(row).ok) {
        deferred.add(key);
      }
    });

    const toTake = currentStandingSubjects.filter(
      (row) => !deferred.has(getEvaluationRowKey(row))
    );
    const takeUnits = toTake.reduce((sum, row) => sum + (Number(row.units) || 0), 0);
    const yearNum = Number(evalFilterYearId);
    const unitCap =
      Number.isFinite(yearNum) && EVAL_YEAR_UNIT_CAPS[yearNum] != null
        ? EVAL_YEAR_UNIT_CAPS[yearNum]
        : null;
    if (unitCap != null && takeUnits > unitCap) {
      swalToast('warning', `Load is ${takeUnits} units — over the ${unitCap} unit cap.`);
      return;
    }

    const yearLabel =
      yearsAllowedForFilter.find((y) => y.id === String(evalFilterYearId))?.label ||
      evaluationFilterOptions.years.find((y) => y.id === String(evalFilterYearId))?.label ||
      `Year ${evalFilterYearId}`;
    const semLabel =
      semesterOptionsForYear.find((s) => s.id === String(evalFilterSemesterId))?.label ||
      `Semester ${evalFilterSemesterId}`;

    setStandingLoadSaving(true);
    try {
      const nextPlacement = { ...placementPreviewConfirmedMap };
      const nextOffsem = { ...offSemesterTakeMap };
      const priorFlags = {};
      currentStandingSubjects.forEach((row) => {
        const key = getEvaluationRowKey(row);
        const home =
          (data?.rows || []).find((r) => getEvaluationRowKey(r) === key) || row;
        if (deferred.has(key)) {
          delete nextPlacement[key];
          delete nextOffsem[key];
          return;
        }
        const isOffSemester =
          String(home.year_level_id) !== String(evalFilterYearId) ||
          String(home.semester_id) !== String(evalFilterSemesterId);
        if (isOffSemester) {
          // Subject placement: MOVE TO standing term. Main curriculum grid keeps
          // them at home with OFFSEM/Semestral badge only.
          nextPlacement[key] = {
            yearId: String(evalFilterYearId),
            semId: String(evalFilterSemesterId),
          };
          const gate = priorStandingTakeGate(home);
          const mode =
            gate.mode ||
            (isSubjectOfferedForStanding(home) ? 'offsem' : 'semestral');
          const flag = {
            standingYearId: String(evalFilterYearId),
            standingSemId: String(evalFilterSemesterId),
            standingYearLabel: yearLabel,
            standingSemLabel: semLabel,
            homeYearLabel: home.year_level_name || null,
            homeSemLabel: home.semester_name || null,
            mode,
          };
          nextOffsem[key] = flag;
          priorFlags[key] = flag;
        } else {
          delete nextOffsem[key];
          delete nextPlacement[key];
        }
      });

      const takeKeysList = toTake.map((row) => getEvaluationRowKey(row));
      const response = await api.post('/evaluation/student/standing-load', {
        student_id: Number(studentId),
        deferred_keys: [...deferred],
        take_keys: takeKeysList,
        year_level_id: Number(evalFilterYearId) || null,
        semester_id: Number(evalFilterSemesterId) || null,
        prior_flags: priorFlags,
      });
      const nextStudent = response.data?.student;
      if (nextStudent) {
        setData((prev) =>
          prev ? { ...prev, student: { ...prev.student, ...nextStudent } } : prev
        );
        setBaselineData((prev) =>
          prev ? { ...prev, student: { ...prev.student, ...nextStudent } } : prev
        );
      }

      setPlacementPreviewMap(nextPlacement);
      setPlacementPreviewConfirmedMap(nextPlacement);
      setOffSemesterTakeMap(nextOffsem);
      if (placementPreviewStorageKey) {
        try {
          window.localStorage.setItem(
            placementPreviewStorageKey,
            JSON.stringify(nextPlacement || {})
          );
        } catch {
          // ignore storage errors
        }
      }
      if (offSemesterStorageKey) {
        try {
          window.localStorage.setItem(
            offSemesterStorageKey,
            JSON.stringify(nextOffsem || {})
          );
        } catch {
          // ignore storage errors
        }
      }

      setStandingLoadDeferred(deferred);
      setStandingLoadDirty(false);
      setCurrentStandingPanelOpen(false);

      setNextSemCurrentTakeKeys(new Set(takeKeysList));

      if (nextStandingTerm) {
        swalToast(
          'success',
          'Load plan saved — map subjects for the next semester'
        );
        setNextSemMapNeedsInit(true);
        setNextSemMapOpen(true);
      } else {
        swalToast(
          'success',
          'Load plan saved — prior subjects stay on curriculum home (OFFSEM / Semestral); Subject placement shows where they are taken'
        );
      }
    } catch (err) {
      await swalError(
        'Could not save load plan',
        err.response?.data?.message || 'Request failed'
      );
    } finally {
      setStandingLoadSaving(false);
    }
  }, [
    canEditEvaluationRows,
    data?.student?.student_id,
    data?.rows,
    standingLoadDeferred,
    currentStandingSubjects,
    mergedRowsForPrereq,
    evalFilterYearId,
    evalFilterSemesterId,
    yearsAllowedForFilter,
    evaluationFilterOptions.years,
    semesterOptionsForYear,
    placementPreviewConfirmedMap,
    placementPreviewStorageKey,
    offSemesterTakeMap,
    offSemesterStorageKey,
    isSubjectOfferedForStanding,
    priorStandingTakeGate,
    nextStandingTerm,
  ]);

  const promotionModalRows = useMemo(() => {
    if (!nextPromotionTerm || !data?.rows?.length) return [];
    return data.rows.filter(
      (r) =>
        String(r.year_level_id) === nextPromotionTerm.year_level_id &&
        String(r.semester_id) === nextPromotionTerm.semester_id
    );
  }, [data?.rows, nextPromotionTerm]);

  const promotionTrackSelectOptions = useMemo(() => {
    const raw = promotionModalRows.flatMap((r) => r.elective_choices || []);
    return dedupeElectiveChoicesByTrack(raw).filter((c) => c.track_id != null && c.track_id !== '');
  }, [promotionModalRows]);

  const promotionTrackPickRequired = useMemo(() => {
    if (!promotionTrackSelectOptions.length) return false;
    const hasTrack = data?.student?.track_id != null && data.student.track_id !== '';
    return !hasTrack;
  }, [promotionTrackSelectOptions, data?.student?.track_id]);

  const promoteModalTrackOptions = useMemo(
    () =>
      promotionTrackSelectOptions.map((c) => ({
        value: String(c.track_id),
        label: electiveChoiceLabel(c),
      })),
    [promotionTrackSelectOptions]
  );

  const promotionTableRows = useMemo(() => {
    const tid =
      promoteModalTrackId !== '' && promoteModalTrackId != null
        ? Number(promoteModalTrackId)
        : null;
    return promotionModalRows.map((r) => {
      const unmetPrerequisites = unmetEvalPrerequisiteLabels(data?.rows || [], r);
      const eligible = unmetPrerequisites.length === 0 && evalRowPrerequisitesMet(data?.rows || [], r);
      if (!isElectiveTrackPendingRow(r)) {
        return {
          penCode: r.subject_code || '—',
          title: r.subject_name || '—',
          units: r.units ?? 0,
          prerequisite: eligible ? formatPromotionPrerequisiteDisplay(r) || 'NONE' : 'Not eligible',
          eligible,
          unmetPrerequisites,
          electivePending: false,
        };
      }
      const choices = r.elective_choices || [];
      const electiveChoices = dedupeElectiveChoicesByTrack(choices).filter(
        (c) => c.track_id != null && c.track_id !== ''
      );
      let picked = null;
      if (tid != null && !Number.isNaN(tid)) {
        picked = choices.find((c) => Number(c.track_id) === tid) || null;
      }
      if (!picked && data?.student?.track_id != null && data.student.track_id !== '') {
        picked =
          choices.find((c) => Number(c.track_id) === Number(data.student.track_id)) || null;
      }
      if (picked) {
        return {
          penCode: picked.subject_code || r.subject_code || '—',
          title: picked.subject_name || r.subject_name || '—',
          units: picked.units ?? r.units ?? 0,
          prerequisite: eligible ? formatPromotionPrerequisiteDisplay(r) || 'NONE' : 'Not eligible',
          eligible,
          unmetPrerequisites,
          electivePending: false,
        };
      }
      return {
        penCode: r.subject_code || '—',
        title: r.subject_name || '—',
        units: r.units ?? 0,
        prerequisite: eligible ? formatPromotionPrerequisiteDisplay(r) || 'NONE' : 'Not eligible',
        eligible,
        unmetPrerequisites,
        electivePending: electiveChoices.length > 0,
        electiveChoices,
      };
    });
  }, [promotionModalRows, promoteModalTrackId, data?.student?.track_id, data?.rows]);

  const promotionModalTotalUnits = useMemo(
    () => promotionTableRows.reduce((acc, r) => acc + (Number(r.units) || 0), 0),
    [promotionTableRows]
  );

  const promotionCurriculumLabel = useMemo(() => {
    // Standing school year for the promotion target (e.g. 2nd year → 2024-2025),
    // not the fixed curriculum Effective SY (2023-2024).
    if (nextPromotionTerm) {
      const yearNum =
        yearOrdinalForStandingId(nextPromotionTerm.year_level_id) ||
        Number(nextPromotionTerm.year_level_id) ||
        1;
      const schoolYear = schoolYearLabelForStanding(
        data?.curriculum?.effective_year ?? data?.curriculum?.label,
        yearNum
      );
      if (schoolYear) return schoolYear;
    }
    return (
      standingSchoolYearLabel ||
      data?.curriculum?.label ||
      (promotionModalRows.length ? '—' : '—')
    );
  }, [
    nextPromotionTerm,
    yearOrdinalForStandingId,
    data?.curriculum?.effective_year,
    data?.curriculum?.label,
    standingSchoolYearLabel,
    promotionModalRows.length,
  ]);

  useEffect(() => {
    if (!data?.rows?.length || !orderedCurriculumTerms.length) {
      setEvalFilterYearId('');
      setEvalFilterSemesterId('');
      setEvalFilterCurriculumId('');
      return;
    }

    const curriculumId =
      data?.curriculum?.curriculum_header_id != null
        ? String(data.curriculum.curriculum_header_id)
        : '';
    setEvalFilterCurriculumId(curriculumId);

    // Prefer promotion / profile standing term (may be ahead of earned-units year).
    if (activeSemesterStandingTerm) {
      setEvalFilterYearId(String(activeSemesterStandingTerm.year_level_id));
      setEvalFilterSemesterId(String(activeSemesterStandingTerm.semester_id));
      return;
    }

    const yearFromUnits = unitsBasedYearId;
    if (!yearFromUnits) {
      setEvalFilterYearId('');
      setEvalFilterSemesterId('');
      return;
    }

    setEvalFilterYearId(yearFromUnits);
    setEvalFilterSemesterId('');
  }, [
    data?.student?.student_id,
    data?.rows,
    data?.curriculum,
    data?.summary?.total_units_earned,
    data?.active_semester?.semester_id,
    data?.student?.promoted_next_sem_at,
    data?.student?.promotion_target_year_level_id,
    data?.student?.promotion_target_semester_id,
    data?.student?.year_level_id,
    data?.student?.semester_id,
    orderedCurriculumTerms,
    unitsBasedYearId,
    activeSemesterStandingTerm,
  ]);

  // Keep profile standing aligned with the active standing term (promotion wins over units).
  useEffect(() => {
    if (!canEditEvaluationRows || !activeSemesterStandingTerm || !data?.student?.student_id) {
      return;
    }

    const nextYear = String(activeSemesterStandingTerm.year_level_id);
    const nextSem = String(activeSemesterStandingTerm.semester_id);

    if (String(evalFilterYearId) !== nextYear) setEvalFilterYearId(nextYear);
    if (String(evalFilterSemesterId) !== nextSem) setEvalFilterSemesterId(nextSem);

    const storedYear = data?.student?.year_level_id;
    const storedSem = data?.student?.semester_id;
    const targetYear = data?.student?.promotion_target_year_level_id;
    const targetSem = data?.student?.promotion_target_semester_id;

    // Never write a standing earlier than an existing promotion target.
    if (
      data?.student?.promoted_next_sem_at &&
      targetYear != null &&
      targetYear !== '' &&
      targetSem != null &&
      targetSem !== ''
    ) {
      const nextIdx = orderedCurriculumTerms.findIndex(
        (t) =>
          String(t.year_level_id) === nextYear && String(t.semester_id) === nextSem
      );
      const targetIdx = orderedCurriculumTerms.findIndex(
        (t) =>
          String(t.year_level_id) === String(targetYear) &&
          String(t.semester_id) === String(targetSem)
      );
      if (targetIdx >= 0 && nextIdx >= 0 && nextIdx < targetIdx) {
        return;
      }
    }

    if (
      nextSem &&
      (String(storedYear ?? '') !== nextYear || String(storedSem ?? '') !== nextSem)
    ) {
      persistStudentStanding({
        yearId: nextYear,
        semesterId: nextSem,
      });
    }
  }, [
    canEditEvaluationRows,
    activeSemesterStandingTerm,
    evalFilterYearId,
    evalFilterSemesterId,
    data?.student?.student_id,
    data?.student?.year_level_id,
    data?.student?.semester_id,
    data?.student?.promoted_next_sem_at,
    data?.student?.promotion_target_year_level_id,
    data?.student?.promotion_target_semester_id,
    orderedCurriculumTerms,
    persistStudentStanding,
  ]);
  useEffect(() => {
    if (!orderedCurriculumTerms.length || !evalFilterYearId || !evalFilterSemesterId) return;
    const exists = orderedCurriculumTerms.some(
      (t) =>
        String(t.year_level_id) === String(evalFilterYearId) &&
        String(t.semester_id) === String(evalFilterSemesterId)
    );
    if (exists) return;
    const t =
      activeSemesterStandingTerm ||
      orderedCurriculumTerms.find(
        (term) => String(term.year_level_id) === String(unitsBasedYearId || evalFilterYearId)
      ) ||
      orderedCurriculumTerms[Math.max(0, currentYearFirstTermIndex)] ||
      orderedCurriculumTerms[0];
    setEvalFilterYearId(t.year_level_id);
    setEvalFilterSemesterId(t.semester_id);
  }, [
    orderedCurriculumTerms,
    currentYearFirstTermIndex,
    evalFilterYearId,
    evalFilterSemesterId,
    unitsBasedYearId,
    activeSemesterStandingTerm,
  ]);

  useEffect(() => {
    if (!evalFilterYearId) return;
    if (!semesterOptionsForYear.length) return;
    const ok = semesterOptionsForYear.some((o) => o.id === evalFilterSemesterId);
    if (ok) return;
    const activeSem = String(data?.active_semester?.semester_id ?? '');
    const activeOk = semesterOptionsForYear.find((o) => o.id === activeSem);
    setEvalFilterSemesterId(activeOk?.id || semesterOptionsForYear[0].id);
  }, [
    semesterOptionsForYear,
    evalFilterSemesterId,
    evalFilterYearId,
    data?.active_semester?.semester_id,
  ]);

  // Initialize drafts when student evaluation data changes
  useEffect(() => {
    setElectiveTrackPopoverKey(null);
    setElectiveSubjectPopoverKey(null);
    setElectiveTrackDrafts({});
    setCurrentStandingPanelOpen(false);
  }, [data?.student?.student_id]);

  useEffect(() => {
    if (!electiveTrackPopoverKey && !electiveSubjectPopoverKey) return undefined;
    const onDoc = (e) => {
      const el = electiveTrackPopoverRef.current;
      if (el && !el.contains(e.target)) {
        setElectiveTrackPopoverKey(null);
        setElectiveSubjectPopoverKey(null);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setElectiveTrackPopoverKey(null);
        setElectiveSubjectPopoverKey(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [electiveTrackPopoverKey, electiveSubjectPopoverKey]);

  useEffect(() => {
    if (!data?.rows) return;

    const next = {};
    data.rows.forEach((row) => {
      const key = getRowKey(row);
      next[key] = {
        grade: draftGradeFromRow(row),
        status: normalizeStatusForUi(row.status ?? ''),
        inc_compliance_deadline: row.inc_compliance_deadline
          ? String(row.inc_compliance_deadline).slice(0, 10)
          : '',
        subject_id: row.subject_id,
        subject_code: row.subject_code,
        subject_name: row.subject_name,
        units: row.units,
        elective_slot_id: row.elective_slot_id,
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
  }, [data, getRowKey]);

  const applySavedEvaluation = useCallback((evaluationPayload) => {
    setBaselineData(evaluationPayload);
    setData(evaluationPayload);
    setPendingProgramId(null);
  }, []);

  useEffect(() => {
    if (!placementPreviewStorageKey) return;
    try {
      const raw = window.localStorage.getItem(placementPreviewStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setPlacementPreviewMap(parsed);
        setPlacementPreviewConfirmedMap(parsed);
      }
    } catch {
      // Ignore parse/storage issues; fallback is empty preview state.
    }
  }, [placementPreviewStorageKey]);

  useEffect(() => {
    if (!offSemesterStorageKey) {
      setOffSemesterTakeMap({});
      return;
    }
    try {
      const raw = window.localStorage.getItem(offSemesterStorageKey);
      if (!raw) {
        setOffSemesterTakeMap({});
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setOffSemesterTakeMap(parsed);
      } else {
        setOffSemesterTakeMap({});
      }
    } catch {
      setOffSemesterTakeMap({});
    }
  }, [offSemesterStorageKey]);

  /**
   * Existing OFFSEM/Semestral flags (badge-only) → also MOVE into the standing term
   * so Subject placement lists them where they were taken.
   */
  useEffect(() => {
    if (!data?.rows?.length || !evalFilterYearId || !evalFilterSemesterId) return;
    const studentId = data?.student?.student_id;
    if (studentId == null || studentId === '') return;
    const migrateKey = `${studentId}:${evalFilterYearId}:${evalFilterSemesterId}`;
    if (offsemMigratedRef.current === migrateKey) return;

    let changed = false;
    const nextPlacement = { ...placementPreviewConfirmedMap };
    const homeByKey = new Map(
      (data.rows || []).map((row) => [getEvaluationRowKey(row), row])
    );

    Object.entries(offSemesterTakeMap || {}).forEach(([key, flag]) => {
      if (!flag || typeof flag !== 'object') return;
      const home = homeByKey.get(key);
      if (!home) return;
      const standingY = String(flag.standingYearId || evalFilterYearId);
      const standingS = String(flag.standingSemId || evalFilterSemesterId);
      const existing = nextPlacement[key];
      if (
        existing &&
        String(existing.yearId ?? '') === standingY &&
        String(existing.semId ?? '') === standingS
      ) {
        return;
      }
      nextPlacement[key] = { yearId: standingY, semId: standingS };
      changed = true;
    });

    offsemMigratedRef.current = migrateKey;
    if (!changed) return;
    setPlacementPreviewMap(nextPlacement);
    setPlacementPreviewConfirmedMap(nextPlacement);
    if (placementPreviewStorageKey) {
      try {
        window.localStorage.setItem(
          placementPreviewStorageKey,
          JSON.stringify(nextPlacement || {})
        );
      } catch {
        // ignore
      }
    }
  }, [
    data?.student?.student_id,
    data?.rows,
    evalFilterYearId,
    evalFilterSemesterId,
    placementPreviewConfirmedMap,
    offSemesterTakeMap,
    placementPreviewStorageKey,
  ]);

  // Handle student selection from list
  const handleStudentSelect = async (student) => {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = await swalConfirm(
        'Unsaved Changes',
        `You have ${unsavedChangeCount} unsaved change(s). Discard them?`,
        'Discard',
        'Cancel'
      );
      if (!confirmed) return;
    }

    setSelectedStudent(student);
    setError('');
    setLoading(true);

    try {
      const response = await api.get(`/evaluation/student/${encodeURIComponent(student.student_id_number)}`);
      applySavedEvaluation(response.data);
    } catch (err) {
      console.error('Error fetching student evaluation:', err);
      setBaselineData(null);
      setData(null);
      const msg = err.response?.data?.message || 'Failed to load student evaluation';
      setError(msg);
      await swalError('Could not load evaluation', msg);
    } finally {
      setLoading(false);
    }
  };

  const refreshSelectedStudentEvaluation = useCallback(async () => {
    if (!selectedStudent?.student_id_number) return;
    try {
      const response = await api.get(`/evaluation/student/${encodeURIComponent(selectedStudent.student_id_number)}`);
      applySavedEvaluation(response.data);
    } catch (err) {
      console.error('Error refreshing evaluation after equivalence save', err);
    }
  }, [applySavedEvaluation, selectedStudent?.student_id_number]);

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
      const subjectChanged =
        Object.prototype.hasOwnProperty.call(merged, 'subject_id') &&
        String(merged.subject_id ?? '') !== String(row.subject_id ?? '');
      if (!subjectChanged && draftMatchesSavedRow(merged.grade, merged.status, row, merged.inc_compliance_deadline)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const electiveSubjectChoicesForRow = (row) => {
    if (!isItElectivesFourRow(row)) return [];

    const seen = new Set();
    const trackKey = itTrackKeyFromStudent(data?.student);
    const choices = Array.isArray(row?.elective_choices) ? row.elective_choices : [];

    return choices
      .filter((choice) => {
        const subjectCode = normalizeItSubjectCode(choice.subject_code);
        if (!subjectCode || seen.has(subjectCode)) return false;
        if (trackKey === 'digital' && !DIGITAL_ARTS_ELECTIVE_CODES.has(subjectCode)) {
          return false;
        }
        seen.add(subjectCode);
        return true;
      })
      .map((choice) => ({
        ...choice,
        label: `${choice.subject_code || ''} - ${choice.subject_name || 'Elective subject'}`.trim(),
      }));
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
        newGrade = SIS_DEFAULT_PASS_GRADE;
      } else if (status === 'failed') {
        newGrade = SIS_DEFAULT_FAIL_GRADE;
      } else {
        newGrade =
          currentDraft.grade === '' || currentDraft.grade == null
            ? ''
            : String(currentDraft.grade);
      }

      const nextStatus = status;

      nextDrafts[key] = {
        ...currentDraft,
        status: nextStatus,
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
    if (!hasUnsavedChanges) {
      swalToast('info', 'No changes to save');
      return;
    }

    if (hasPendingProgramChange) {
      const oldLabel =
        baselineData?.student?.program?.program_name ||
        baselineData?.student?.program?.program_code ||
        'current program';
      const newLabel =
        programOptions.find((option) => Number(option.value) === Number(pendingProgramId))
          ?.label || 'new program';

      const confirmed = await swalConfirm(
        'Shift student program?',
        `Move this student from ${oldLabel} to ${newLabel}? Only subjects that also exist in the new program will keep their grades.`,
        'Save & shift program',
        'Cancel'
      );
      if (!confirmed) return;
    }

    setSavingAll(true);
    setSaveError('');

    const savePromises = [];
    const results = { success: 0, failed: 0, errors: [] };

    for (const key of modifiedKeys) {
      const draft = drafts[key];
      if (!draft || draft.subject_id == null || draft.subject_id === '') continue;
      if (draft.passed_via_transfer_credit) continue;

      const savePayload = manualGradeToSavePayload(draft.grade, draft.status);
      const gradeValue = savePayload.grade;
      const evaluation_status = savePayload.evaluation_status;
      const rowForKey = data.rows.find((r) => getRowKey(r) === key);
      const clearingOnly =
        gradeValue == null && evaluation_status == null && draft.evaluation_id;
      const hasValues = gradeValue != null || evaluation_status != null;
      if (!rowForKey) continue;
      const subjectChanged =
        rowForKey &&
        String(draft.subject_id ?? '') !== String(rowForKey.subject_id ?? '');
      // Allow save when clearing an existing evaluation or choosing a subject for an elective slot.
      if (!hasValues && !clearingOnly && !subjectChanged) continue;

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
          if (draft.evaluation_id && !subjectChanged) {
            await api.put(`/evaluation/${draft.evaluation_id}`, {
              grade: gradeValue,
              evaluation_status,
              ...incPayload,
            });
          } else {
            await api.post('/evaluation', {
              student_id: data.student.student_id,
              subject_id: draft.subject_id,
              elective_slot_id: draft.elective_slot_id || null,
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

    if (results.failed > 0) {
      setSavingAll(false);
      setSaveError(`${results.failed} of ${modifiedKeys.size} saves failed`);
      swalError('Partial Save Failure', `${results.failed} evaluations could not be saved`);
      return;
    }

    try {
      if (hasPendingProgramChange) {
        const response = await api.post('/evaluation/student/change-program', {
          student_id: data.student.student_id,
          program_id: Number(pendingProgramId),
        });
        const evaluation = response.data?.evaluation ?? response.data;
        applySavedEvaluation(evaluation);
        setDrafts({});
        setModifiedKeys(new Set());
        setSelectedStudent((prev) =>
          prev
            ? {
                ...prev,
                program_id: Number(pendingProgramId),
                program: evaluation?.student?.program ?? prev.program,
              }
            : prev
        );
        const sid = evaluation?.student?.student_id;
        if (sid) {
          await syncStudentToEvaluatedListIfNeeded(sid);
        }
        if (results.success > 0) {
          swalToast(
            'success',
            `Saved ${results.success} evaluation(s) and shifted program.`
          );
        } else {
          swalToast('success', response.data?.message || 'Program updated.');
        }
      } else {
        swalToast('success', `Saved ${results.success} evaluation(s)`);
        setModifiedKeys(new Set());
        const response = await api.get(
          `/evaluation/student/${encodeURIComponent(selectedStudent.student_id_number)}`
        );
        applySavedEvaluation(response.data);
        const sid = response.data?.student?.student_id;
        if (sid) {
          await syncStudentToEvaluatedListIfNeeded(sid);
        }
      }
    } catch (err) {
      await swalError(
        'Could not change program',
        err.response?.data?.message || 'Request failed'
      );
    } finally {
      setSavingAll(false);
    }
  };

  // Clear all drafts
  const handleClearAll = () => {
    if (!canEditEvaluationRows || !hasUnsavedChanges) return;

    const clearMessage = hasPendingProgramChange
      ? 'Reset all grades, statuses, and the pending program change to original values?'
      : 'Reset all grades and statuses to original values?';

    swalConfirm('Clear All Changes?', clearMessage, 'Clear', 'Cancel')
      .then((confirmed) => {
        if (!confirmed) return;

        setPendingProgramId(null);
        setPlacementPreviewMap({});
        setPlacementPreviewConfirmedMap({});
        setPlacementPreviewInsertSlotKey(null);
        setOffSemesterTakeMap({});
        if (placementPreviewStorageKey) {
          try {
            window.localStorage.removeItem(placementPreviewStorageKey);
          } catch {
            // Ignore storage failures.
          }
        }
        if (offSemesterStorageKey) {
          try {
            window.localStorage.removeItem(offSemesterStorageKey);
          } catch {
            // Ignore storage failures.
          }
        }

        const source = baselineData || data;
        if (!source?.rows) {
          setModifiedKeys(new Set());
          swalToast('success', 'All changes cleared');
          return;
        }

        // Always clone — baselineData and data often share the same reference after load,
        // so setData(baselineData) would no-op and leave dirty drafts in place.
        const restored = {
          ...source,
          rows: source.rows.map((row) => ({ ...row })),
          student: source.student ? { ...source.student } : source.student,
          summary: source.summary ? { ...source.summary } : source.summary,
        };

        const nextDrafts = {};
        restored.rows.forEach((row) => {
          const key = getRowKey(row);
          nextDrafts[key] = {
            grade: draftGradeFromRow(row),
            status: normalizeStatusForUi(row.status ?? ''),
            inc_compliance_deadline: row.inc_compliance_deadline
              ? String(row.inc_compliance_deadline).slice(0, 10)
              : '',
            subject_id: row.subject_id,
            subject_code: row.subject_code,
            subject_name: row.subject_name,
            units: row.units,
            elective_slot_id: row.elective_slot_id,
            curriculum_id: row.curriculum_id,
            academic_year_id: row.academic_year_id,
            semester_id: row.semester_id,
            evaluation_id: row.evaluation_id,
            passed_via_transfer_credit: row.passed_via_transfer_credit === true,
          };
        });

        setData(restored);
        setDrafts(nextDrafts);
        setModifiedKeys(new Set());
        setSaveError('');
        swalToast('success', 'All changes cleared');
      });
  };

  const applyElectiveTrack = useCallback(
    async (trackIdRaw) => {
      if (!data?.student?.student_id || !selectedStudent?.student_id_number) return;
      const track_id =
        trackIdRaw === '' || trackIdRaw == null ? null : Number(trackIdRaw);
      if (track_id != null && Number.isNaN(track_id)) return;
      setElectiveTrackSaving(true);
      try {
        await api.post('/evaluation/student/track', {
          student_id: data.student.student_id,
          track_id,
        });
        const res = await api.get(
          `/evaluation/student/${encodeURIComponent(selectedStudent.student_id_number)}`
        );
        applySavedEvaluation(res.data);
        setElectiveTrackPopoverKey(null);
        setElectiveTrackDrafts({});
        swalToast('success', 'Track updated — elective row will show the matching subject.');
      } catch (err) {
        await swalError('Could not update track', err.response?.data?.message || 'Request failed');
      } finally {
        setElectiveTrackSaving(false);
      }
    },
    [data?.student?.student_id, selectedStudent, applySavedEvaluation]
  );

  const handleProgramChange = useCallback(
    async (nextProgramId) => {
      if (!canEditEvaluationRows || !selectedStudent?.student_id_number) return;

      const currentId = String(savedProgramId ?? '');
      const nextId = String(nextProgramId ?? '');
      if (!nextId || nextId === currentId) {
        setPendingProgramId(null);
        if (baselineData) {
          setData(baselineData);
        }
        return;
      }

      if (modifiedKeys.size > 0) {
        const confirmed = await swalConfirm(
          'Unsaved subject changes',
          `You have ${modifiedKeys.size} unsaved subject change(s). Switch program preview anyway?`,
          'Preview program',
          'Cancel'
        );
        if (!confirmed) return;
      }

      setPendingProgramId(Number(nextId));
      setProgramPreviewLoading(true);
      setError('');
      try {
        const response = await api.get(
          `/evaluation/student/${encodeURIComponent(selectedStudent.student_id_number)}/program-preview`,
          { params: { program_id: Number(nextId) } }
        );
        setData(response.data);
      } catch (err) {
        setPendingProgramId(null);
        if (baselineData) {
          setData(baselineData);
        }
        await swalError(
          'Could not preview program',
          err.response?.data?.message || 'Request failed'
        );
      } finally {
        setProgramPreviewLoading(false);
      }
    },
    [
      canEditEvaluationRows,
      baselineData,
      modifiedKeys.size,
      savedProgramId,
      selectedStudent?.student_id_number,
    ]
  );

  const openRowSubjectEquivalence = useCallback(
    (row) => {
      if (!canManageSubjectEquivalences) return;
      const sid = row.subject_id;
      if (sid == null || sid === '') {
        swalToast(
          'warning',
          'This row is not linked to a catalog subject yet. Assign a track or elective mapping first, then map an external course.'
        );
        return;
      }
      const idNum = Number(sid);
      if (!Number.isInteger(idNum) || idNum < 1) {
        swalToast('warning', 'Invalid catalog subject on this row.');
        return;
      }
      setSubjectEquivFixedLocal({
        id: idNum,
        code: row.subject_code || '',
        name: row.subject_name || '',
        transfer_credit_other_subject_id:
          row.transfer_credit_other_subject_id ?? row.transferCreditOtherSubjectId ?? null,
      });
      setSubjectEquivModalOpen(true);
    },
    [canManageSubjectEquivalences]
  );

  const openSubjectEquivModalCatalog = useCallback(() => {
    if (!canManageSubjectEquivalences) return;
    setSubjectEquivFixedLocal(null);
    setSubjectEquivModalOpen(true);
  }, [canManageSubjectEquivalences]);

  const runPromoteNextSemester = useCallback(
    async ({ evaluatedBy, trackId, successToast, silentIfAlreadyPromoted = false } = {}) => {
      if (!data?.student?.student_id || !selectedStudent?.student_id_number || !nextPromotionTerm) {
        return false;
      }
      const body = {
        student_id: data.student.student_id,
        evaluated_by: String(evaluatedBy || user?.email || '').trim(),
        target_year_level_id: Number(nextPromotionTerm.year_level_id),
        target_semester_id: Number(nextPromotionTerm.semester_id),
      };
      if (!body.evaluated_by) return false;
      if (trackId !== '' && trackId != null) {
        body.track_id = Number(trackId);
      }
      setPromoteSaving(true);
      try {
        const promoteRes = await api.post('/evaluation/student/promote-next-semester', body);
        const res = await api.get(
          `/evaluation/student/${encodeURIComponent(selectedStudent.student_id_number)}`
        );
        applySavedEvaluation(res.data);
        setPromoteModalOpen(false);
        await fetchStudentList(searchTerm);
        const alreadyStored = promoteRes?.data?.already_stored === true;
        if (alreadyStored) {
          if (!silentIfAlreadyPromoted) {
            swalToast('info', 'Already promoted — standing refreshed to that year/semester.');
          }
        } else {
          swalToast('success', successToast || 'Promotion saved and logged for Evaluated students.');
        }
        return true;
      } catch (err) {
        const msg = String(err.response?.data?.message || err.message || 'Request failed');
        const alreadyStored = /already stored in your evaluated students/i.test(msg);
        if (alreadyStored) {
          try {
            const res = await api.get(
              `/evaluation/student/${encodeURIComponent(selectedStudent.student_id_number)}`
            );
            applySavedEvaluation(res.data);
          } catch {
            // ignore refresh failure
          }
          setPromoteModalOpen(false);
          if (!silentIfAlreadyPromoted) {
            swalToast('info', 'Already promoted for this target — standing refreshed.');
          }
          return true;
        }
        await swalError('Could not save promotion', msg);
        return false;
      } finally {
        setPromoteSaving(false);
      }
    },
    [
      data?.student?.student_id,
      nextPromotionTerm,
      selectedStudent,
      user?.email,
      fetchStudentList,
      searchTerm,
      applySavedEvaluation,
    ]
  );

  const openPromoteModal = useCallback(() => {
    if (!currentTermCompleteForPromotion) {
      void swalInfo(
        'Current term not ready to promote',
        'Record an outcome for every subject the student actually took this standing. Subjects with no grade (not taken — e.g. Programming 2 saved for summer or next year) do not block promotion. Save unsaved grade changes first.'
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
    const alreadyAtTarget =
      data?.student?.promoted_next_sem_at &&
      String(data?.student?.promotion_target_year_level_id ?? '') ===
        String(nextPromotionTerm.year_level_id) &&
      String(data?.student?.promotion_target_semester_id ?? '') ===
        String(nextPromotionTerm.semester_id);
    if (alreadyAtTarget) {
      // Re-post: backend refreshes standing to the target without duplicating the log.
      void runPromoteNextSemester({
        evaluatedBy: String(user?.email || '').trim() || 'dean',
        trackId: data?.student?.track_id,
        silentIfAlreadyPromoted: false,
      });
      return;
    }
    setPromoteEvaluatedBy(String(user?.email || '').trim());
    setPromoteModalTrackId(
      data?.student?.track_id != null && data.student.track_id !== ''
        ? String(data.student.track_id)
        : ''
    );
    setPromoteModalOpen(true);
  }, [
    currentTermCompleteForPromotion,
    nextPromotionTerm,
    user?.email,
    data?.student?.track_id,
    data?.student?.promoted_next_sem_at,
    data?.student?.promotion_target_year_level_id,
    data?.student?.promotion_target_semester_id,
    runPromoteNextSemester,
  ]);

  const handlePromoteSave = useCallback(async () => {
    if (
      promotionTrackPickRequired &&
      (!promoteModalTrackId || String(promoteModalTrackId).trim() === '')
    ) {
      await swalError(
        'Track required',
        'This term includes a track-based elective. Choose the student’s track before saving promotion.'
      );
      return;
    }
    await runPromoteNextSemester({
      evaluatedBy: promoteEvaluatedBy,
      trackId: promoteModalTrackId,
    });
  }, [
    promotionTrackPickRequired,
    promoteModalTrackId,
    promoteEvaluatedBy,
    runPromoteNextSemester,
  ]);

  // TEMP: auto-promotion disabled — use manual "Promote to next semester" only.
  // Regular students: auto-promote when the current standing is complete.
  // Irregular students stay on manual "Promote to next semester".
  // useEffect(() => {
  //   if (!canEdit || isEvaluatedModule || !isRegularStudent) return;
  //   if (!currentTermCompleteForPromotion || !nextPromotionTerm) return;
  //   if (hasUnsavedChanges || savingAll || promoteSaving || standingSaving) return;
  //   if (promotionTrackPickRequired) return;
  //   // Already promoted this cycle — never re-post (avoids the "already stored" popup).
  //   if (data?.student?.promoted_next_sem_at) return;
  //
  //   const studentId = data?.student?.student_id;
  //   if (!studentId || !selectedStudent?.student_id_number) return;
  //
  //   const targetY = String(nextPromotionTerm.year_level_id);
  //   const targetS = String(nextPromotionTerm.semester_id);
  //   const alreadyAtTarget =
  //     String(data?.student?.year_level_id ?? '') === targetY &&
  //     String(data?.student?.semester_id ?? '') === targetS;
  //   if (alreadyAtTarget) return;
  //
  //   const attemptKey = `${studentId}:${targetY}:${targetS}`;
  //   if (autoPromoteAttemptRef.current === attemptKey) return;
  //   autoPromoteAttemptRef.current = attemptKey;
  //
  //   void runPromoteNextSemester({
  //     evaluatedBy: user?.email,
  //     trackId: data?.student?.track_id,
  //     successToast: 'Regular student auto-promoted to the next semester.',
  //     silentIfAlreadyPromoted: true,
  //   }).then((ok) => {
  //     if (!ok && autoPromoteAttemptRef.current === attemptKey) {
  //       autoPromoteAttemptRef.current = '';
  //     }
  //   });
  // }, [
  //   canEdit,
  //   isEvaluatedModule,
  //   isRegularStudent,
  //   currentTermCompleteForPromotion,
  //   nextPromotionTerm,
  //   hasUnsavedChanges,
  //   savingAll,
  //   promoteSaving,
  //   standingSaving,
  //   promotionTrackPickRequired,
  //   data?.student?.student_id,
  //   data?.student?.year_level_id,
  //   data?.student?.semester_id,
  //   data?.student?.promoted_next_sem_at,
  //   data?.student?.track_id,
  //   selectedStudent?.student_id_number,
  //   user?.email,
  //   runPromoteNextSemester,
  // ]);

  // Reset auto-promote / offsem migration guards when switching students.
  useEffect(() => {
    autoPromoteAttemptRef.current = '';
    offsemMigratedRef.current = '';
  }, [data?.student?.student_id]);

  const handleDownloadEvaluation = useCallback(() => {
    if (!data?.student || !Array.isArray(data.rows) || data.rows.length === 0) {
      swalToast('info', 'Select a student with curriculum rows first.');
      return;
    }
    setDownloadScope('all');
    setDownloadSelectedTermKeys(downloadTermOptions.map((option) => option.key));
    setDownloadModalOpen(true);
  }, [data?.rows, data?.student, downloadTermOptions]);

  const handleDownloadEvaluationPdf = useCallback(async () => {
    if (!data?.student || !Array.isArray(data.rows) || data.rows.length === 0) {
      swalToast('info', 'Select a student with curriculum rows first.');
      return;
    }

    const student = data.student;
    const studentName =
      student.full_name ||
      [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ') ||
      selectedStudent?.full_name ||
      'Student';
    const studentNumber =
      student.student_id_number || selectedStudent?.student_id_number || 'N/A';
    const programLabel =
      student.program?.program_name ||
      student.program?.program_code ||
      selectedStudent?.program?.program_name ||
      selectedStudent?.program_name ||
      'N/A';
    const trackLabel = student.track?.track_name || student.track?.track_code || 'Not assigned';
    const generatedAt = new Date().toLocaleString();
    const allTermKeys = downloadTermOptions.map((option) => option.key);
    let selectedKeys = allTermKeys;
    if (downloadScope === 'current') {
      selectedKeys = currentDownloadTermKey ? [currentDownloadTermKey] : [];
    } else if (downloadScope === 'specific') {
      selectedKeys = downloadSelectedTermKeys;
    }
    const selectedKeySet = new Set(selectedKeys);
    const selectedLabel =
      downloadScope === 'all'
        ? 'All terms'
        : selectedKeys
            .map((key) => downloadTermOptions.find((option) => option.key === key)?.label)
            .filter(Boolean)
            .join(', ') || 'No selected terms';

    const rows = data.rows
      .map((row) => mergeEvalRowWithDrafts(row, drafts, getEvaluationRowKey))
      .filter((row) => selectedKeySet.has(evaluationTermKeyFromRow(row)))
      .sort((a, b) => {
        const ay = Number(a.year_level_id ?? 0);
        const by = Number(b.year_level_id ?? 0);
        if (ay !== by) return ay - by;
        const sem =
          semesterSortValue(a.semester_id, a.semester_name) -
          semesterSortValue(b.semester_id, b.semester_name);
        if (sem !== 0) return sem;
        return Number(a.curriculum_id ?? 0) - Number(b.curriculum_id ?? 0);
      });

    if (rows.length === 0) {
      swalToast('info', 'No curriculum rows found for the selected download option.');
      return;
    }

    const grouped = rows.reduce((acc, row) => {
      const key = evaluationTermKeyFromRow(row);
      if (!acc.has(key)) {
        acc.set(key, {
          key,
          label: `${row.year_level_name || `Year ${row.year_level_id || ''}`} - ${
            row.semester_name || `Semester ${row.semester_id || ''}`
          }`,
          rows: [],
        });
      }
      acc.get(key).rows.push(row);
      return acc;
    }, new Map());

    const termBlocks = [...grouped.values()]
      .map((group) => {
        const body = group.rows
          .map((row) => {
            const transferCredit = isTransferCreditRow(row);
            const grade = transferCredit ? '-' : formatEvalGradeReadonly(row.grade) || '-';
            const status = transferCredit ? 'Credited' : normalizeStatusForUi(row.status ?? '') || '-';
            return `
              <tr>
                <td class="code">${htmlEscape(row.subject_code || '-')}</td>
                <td>${htmlEscape(row.subject_name || '-')}</td>
                <td class="center">${htmlEscape(row.units ?? 0)}</td>
                <td class="center">${htmlEscape(grade)}</td>
                <td>${htmlEscape(status)}</td>
              </tr>
            `;
          })
          .join('');
        const totalUnits = group.rows.reduce((sum, row) => sum + (Number(row.units) || 0), 0);
        return `
          <section class="term-block">
            <h2>${htmlEscape(group.label)}</h2>
            <table>
              <thead>
                <tr>
                  <th>Pen Code</th>
                  <th>Descriptive Title</th>
                  <th>Units</th>
                  <th>Grade</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>${body}</tbody>
              <tfoot>
                <tr>
                  <td colspan="5">Total units: <strong>${htmlEscape(totalUnits)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </section>
        `;
      })
      .join('');

    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'fixed',
      left: '-12000px',
      top: '0',
      width: '980px',
      background: '#ffffff',
    });
    el.innerHTML = `
      <style>
        .eval-pdf {
          box-sizing: border-box;
          width: 980px;
          padding: 28px;
          background: #fff;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }
        .eval-pdf * { box-sizing: border-box; }
        .eval-pdf__header {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          border-bottom: 3px solid #245f93;
          padding-bottom: 14px;
          margin-bottom: 16px;
        }
        .eval-pdf__school {
          font-size: 19px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .eval-pdf__sub {
          margin-top: 3px;
          color: #475569;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .eval-pdf__title {
          text-align: right;
          font-size: 22px;
          font-weight: 800;
          color: #245f93;
        }
        .eval-pdf__meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 18px;
          padding: 12px;
          border: 1px solid #dbe7f3;
          background: #f8fbff;
          border-radius: 10px;
          margin-bottom: 14px;
        }
        .eval-pdf__meta div span {
          display: block;
          color: #64748b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .eval-pdf__meta div strong {
          display: block;
          color: #111827;
          margin-top: 2px;
        }
        .eval-pdf__summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 14px;
        }
        .eval-pdf__summary div {
          border: 1px solid #dbe7f3;
          border-radius: 9px;
          padding: 8px 10px;
          text-align: center;
          background: #ffffff;
        }
        .eval-pdf__summary span {
          display: block;
          color: #64748b;
          font-size: 10px;
          margin-bottom: 3px;
        }
        .eval-pdf__summary strong {
          font-size: 14px;
          color: #245f93;
        }
        .term-block {
          margin: 0 0 14px;
          page-break-inside: avoid;
        }
        .term-block h2 {
          margin: 0;
          padding: 8px 10px;
          background: #eaf4ff;
          border: 1px solid #bfdbfe;
          border-bottom: 0;
          border-radius: 8px 8px 0 0;
          color: #123d63;
          font-size: 13px;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        th, td {
          border: 1px solid #d7e3ef;
          padding: 7px 8px;
          vertical-align: top;
          word-break: break-word;
        }
        th {
          background: #f1f7fd;
          color: #334155;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
        }
        th:nth-child(1), td:nth-child(1) { width: 14%; }
        th:nth-child(3), td:nth-child(3) { width: 9%; }
        th:nth-child(4), td:nth-child(4) { width: 10%; }
        th:nth-child(5), td:nth-child(5) { width: 13%; }
        tfoot td {
          background: #f8fafc;
          text-align: right;
        }
        .code {
          color: #1d4ed8;
          font-weight: 700;
        }
        .center {
          text-align: center;
        }
        .eval-pdf__footer {
          margin-top: 16px;
          color: #64748b;
          font-size: 10px;
          text-align: right;
        }
      </style>
      <div class="eval-pdf">
        <header class="eval-pdf__header">
          <div>
            <p class="eval-pdf__school">Cagayan de Oro College</p>
            <div class="eval-pdf__sub">PHINMA Education</div>
          </div>
          <div class="eval-pdf__title">Student Evaluation</div>
        </header>
        <section class="eval-pdf__meta">
          <div><span>Student Name</span><strong>${htmlEscape(studentName)}</strong></div>
          <div><span>Student ID Number</span><strong>${htmlEscape(studentNumber)}</strong></div>
          <div><span>Program</span><strong>${htmlEscape(programLabel)}</strong></div>
          <div><span>Track</span><strong>${htmlEscape(trackLabel)}</strong></div>
          <div><span>Academic Status</span><strong>${htmlEscape(data.computed_academic_status || student.academic_status || 'N/A')}</strong></div>
          ${student.student_entry_type ? `<div><span>Student Type</span><strong>${htmlEscape(student.student_entry_type)}</strong></div>` : ''}
          <div><span>Downloaded Terms</span><strong>${htmlEscape(selectedLabel)}</strong></div>
        </section>
        <section class="eval-pdf__summary">
          <div><span>Curriculum Units</span><strong>${htmlEscape(data.summary?.total_units_in_curriculum ?? 0)}</strong></div>
          <div><span>Earned</span><strong>${htmlEscape(data.summary?.total_units_earned ?? 0)}</strong></div>
          <div><span>Remaining</span><strong>${htmlEscape(data.summary?.lacking_units ?? 0)}</strong></div>
        </section>
        ${termBlocks}
        <div class="eval-pdf__footer">
          Generated by ${htmlEscape(user?.email || 'N/A')} on ${htmlEscape(generatedAt)}
        </div>
      </div>
    `;

    document.body.appendChild(el);
    setDownloadingPdf(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
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
        pdf.addPage(undefined, 'landscape');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const scopeSuffix =
        downloadScope === 'all'
          ? 'all'
          : downloadScope === 'current'
            ? 'current-term'
            : 'selected-terms';
      const filename = `${safeDownloadName(`${studentNumber}-${studentName}`)}-evaluation-${scopeSuffix}.pdf`;
      pdf.save(filename);
      setDownloadModalOpen(false);
      swalToast('success', 'Student evaluation PDF downloaded.');
    } catch (err) {
      await swalError('Could not create PDF', err?.message || 'Unknown error');
    } finally {
      setDownloadingPdf(false);
      document.body.removeChild(el);
    }
  }, [
    currentDownloadTermKey,
    data,
    downloadScope,
    downloadSelectedTermKeys,
    downloadTermOptions,
    drafts,
    selectedStudent,
    user?.email,
  ]);

  /** ST-403: spreadsheet export (CSV opens in Excel). */
  const handleDownloadEvaluationCsv = useCallback(() => {
    if (!data?.student || !Array.isArray(data.rows) || data.rows.length === 0) {
      swalToast('info', 'Select a student with curriculum rows first.');
      return;
    }

    const student = data.student;
    const studentName =
      student.full_name ||
      [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ') ||
      selectedStudent?.full_name ||
      'Student';
    const studentNumber =
      student.student_id_number || selectedStudent?.student_id_number || 'N/A';
    const programLabel =
      student.program?.program_name ||
      student.program?.program_code ||
      selectedStudent?.program?.program_name ||
      selectedStudent?.program_name ||
      'N/A';
    const trackLabel = student.track?.track_name || student.track?.track_code || 'Not assigned';
    const allTermKeys = downloadTermOptions.map((option) => option.key);
    let selectedKeys = allTermKeys;
    if (downloadScope === 'current') {
      selectedKeys = currentDownloadTermKey ? [currentDownloadTermKey] : [];
    } else if (downloadScope === 'specific') {
      selectedKeys = downloadSelectedTermKeys;
    }
    const selectedKeySet = new Set(selectedKeys);

    const rows = data.rows
      .map((row) => mergeEvalRowWithDrafts(row, drafts, getEvaluationRowKey))
      .filter((row) => selectedKeySet.has(evaluationTermKeyFromRow(row)))
      .sort((a, b) => {
        const ay = Number(a.year_level_id ?? 0);
        const by = Number(b.year_level_id ?? 0);
        if (ay !== by) return ay - by;
        const sem =
          semesterSortValue(a.semester_id, a.semester_name) -
          semesterSortValue(b.semester_id, b.semester_name);
        if (sem !== 0) return sem;
        return Number(a.curriculum_id ?? 0) - Number(b.curriculum_id ?? 0);
      });

    if (rows.length === 0) {
      swalToast('info', 'No curriculum rows found for the selected download option.');
      return;
    }

    const csvEscape = (value) => {
      const s = String(value ?? '');
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const meta = [
      ['Report', 'Student Evaluation'],
      ['Student Name', studentName],
      ['Student ID Number', studentNumber],
      ['Program', programLabel],
      ['Track', trackLabel],
      ['Academic Status', data.computed_academic_status || student.academic_status || 'N/A'],
      ['Curriculum Units', data.summary?.total_units_in_curriculum ?? 0],
      ['Earned', data.summary?.total_units_earned ?? 0],
      ['Remaining', data.summary?.lacking_units ?? 0],
      ['Generated At', new Date().toLocaleString()],
      ['Generated By', user?.email || 'N/A'],
      [],
      [
        'Year Level',
        'Semester',
        'Subject Code',
        'Subject Title',
        'Units',
        'Grade',
        'Status',
      ],
    ];

    const body = rows.map((row) => {
      const transferCredit = isTransferCreditRow(row);
      const grade = transferCredit ? '-' : formatEvalGradeReadonly(row.grade) || '-';
      const status = transferCredit ? 'Credited' : normalizeStatusForUi(row.status ?? '') || '-';
      return [
        row.year_level_name || `Year ${row.year_level_id || ''}`,
        row.semester_name || `Semester ${row.semester_id || ''}`,
        row.subject_code || '-',
        row.subject_name || '-',
        row.units ?? 0,
        grade,
        status,
      ];
    });

    setDownloadingCsv(true);
    try {
      const lines = [...meta, ...body].map((cols) =>
        Array.isArray(cols) ? cols.map(csvEscape).join(',') : ''
      );
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const scopeSuffix =
        downloadScope === 'all'
          ? 'all'
          : downloadScope === 'current'
            ? 'current-term'
            : 'selected-terms';
      link.href = url;
      link.download = `${safeDownloadName(`${studentNumber}-${studentName}`)}-evaluation-${scopeSuffix}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadModalOpen(false);
      swalToast('success', 'Student evaluation CSV downloaded (opens in Excel).');
    } catch (err) {
      swalError('Could not create CSV', err?.message || 'Unknown error');
    } finally {
      setDownloadingCsv(false);
    }
  }, [
    currentDownloadTermKey,
    data,
    downloadScope,
    downloadSelectedTermKeys,
    downloadTermOptions,
    drafts,
    selectedStudent,
    user?.email,
  ]);

  const toggleDownloadTermKey = useCallback((termKey) => {
    setDownloadSelectedTermKeys((prev) =>
      prev.includes(termKey)
        ? prev.filter((key) => key !== termKey)
        : [...prev, termKey]
    );
  }, []);

  const currentDownloadTermLabel = useMemo(() => {
    return downloadTermOptions.find((option) => option.key === currentDownloadTermKey)?.label || '';
  }, [currentDownloadTermKey, downloadTermOptions]);

  const selectedDownloadCount =
    downloadScope === 'all'
      ? downloadTermOptions.length
      : downloadScope === 'current'
        ? currentDownloadTermLabel
          ? 1
          : 0
        : downloadSelectedTermKeys.length;

  const renderStudentHero = () => {
    if (!data) return null;

    const { student } = data;
    const summary = previewSummary;
    const computed = data?.computed_academic_status;
    const enrolledStatus = student?.academic_status?.trim() || '';
    const displayStatus = (computed || enrolledStatus || '—').trim();
    const entryType = String(student?.student_entry_type || '').trim();
    const statusTitleParts = [];
    if (computed && enrolledStatus && computed !== enrolledStatus) {
      statusTitleParts.push(`Profile: ${enrolledStatus}. Curriculum evaluation: ${computed}.`);
    }
    if (entryType) {
      statusTitleParts.push(`Student type: ${entryType} (set at account creation).`);
    }
    const statusTitle = statusTitleParts.length ? statusTitleParts.join(' ') : undefined;
    const fullName =
      student?.full_name ||
      `${student?.last_name || ''}, ${student?.first_name || ''} ${student?.middle_name || ''}`.trim();

    const programCode = student?.program?.program_code || student?.program_code || '';
    const programName = student?.program?.program_name || student?.program_name || '';
    const degree = programName || programCode || '—';
    const pendingProgramLabel = hasPendingProgramChange
      ? programOptions.find((option) => Number(option.value) === Number(pendingProgramId))?.label
      : null;
    const displayDegree = pendingProgramLabel || degree;
    const previousProgramName =
      student?.previous_program?.program_name ||
      student?.previous_program?.program_code ||
      '';
    const isItProgram =
      /\bBSIT\b/i.test(programCode) ||
      /^IT$/i.test(String(programCode).trim()) ||
      /information\s+technology/i.test(programName);

    const trackLine = student?.track
      ? `${student.track.track_name || 'Track'}${student.track.track_code ? ` (${student.track.track_code})` : ''}`
      : null;

    const isPromotedNextSem = (() => {
      if (!student?.promoted_next_sem_at) return false;
      const targetY = student.promotion_target_year_level_id;
      const targetS = student.promotion_target_semester_id;
      if (targetY == null || targetS == null) return false;
      const terms = orderedCurriculumTerms;
      const targetIdx = terms.findIndex(
        (t) =>
          String(t.year_level_id) === String(targetY) &&
          String(t.semester_id) === String(targetS)
      );
      if (targetIdx < 1) return false;
      const prev = terms[targetIdx - 1];
      const deferredKeys = Array.isArray(student.standing_deferred_keys)
        ? student.standing_deferred_keys
        : [];
      // Badge only if the previous term actually has recorded outcomes.
      return isCurriculumTermReadyToAdvance(
        data?.rows,
        prev.year_level_id,
        prev.semester_id,
        deferredKeys
      );
    })();

    const selectedIdNumber = selectedStudent?.student_id_number || student?.student_id_number || '';

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
            <div className="eval-hero__name-row">
              <div className="eval-hero__name">{fullName || 'N/A'}</div>
              <button
                type="button"
                className="eval-hero__name-link"
                onClick={() => {
                  if (!selectedIdNumber) return;
                  const url = `/dean/student-records/${encodeURIComponent(String(selectedIdNumber))}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                title="Open full student records in a new tab"
              >
                Curriculum / Evaluation
              </button>
            </div>
            <div
              className={`eval-hero__degree${
                hasPendingProgramChange ? ' eval-hero__degree--pending' : ''
              }`}
            >
              {displayDegree}
              {hasPendingProgramChange ? (
                <span className="eval-unsaved-program-tag">unsaved shift</span>
              ) : null}
            </div>
            {previousProgramName ? (
              <div className="eval-hero__previous-program">
                Previous program: <strong>{previousProgramName}</strong>
              </div>
            ) : null}
            {isItProgram ? (
              trackLine ? (
                <div className="eval-hero__track">
                  Track: <strong>{trackLine}</strong>
                </div>
              ) : (
                <div className="eval-hero__track eval-hero__track--none">
                  Track: <em>not set — assign for track-based electives (e.g. IT Electives 1)</em>
                </div>
              )
            ) : null}
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
            {entryType ? (
              <>
                <span className="eval-hero__status-label">Student type</span>
                <span className="eval-hero__entry-type-pill" title="Set when the student account was created">
                  {entryType}
                </span>
              </>
            ) : null}
          </div>
          <div className="eval-hero__title-actions">
            <button
              type="button"
              className="eval-hero__title-pill eval-hero__download-btn"
              onClick={handleDownloadEvaluation}
              disabled={!selectedStudent || !data?.rows?.length}
              title="Download this student's evaluation as PDF or Excel/CSV"
            >
              Download Evaluation
            </button>
            {canEdit &&
            selectedStudent &&
            !isEvaluatedModule &&
            (isIrregularStudent || isRegularStudent) ? (
              <button
                type="button"
                className="eval-hero__promote-btn"
                onClick={openPromoteModal}
                disabled={!nextPromotionTerm || !currentTermCompleteForPromotion || promoteSaving}
                title={
                  isRegularStudent && promotionTrackPickRequired
                    ? 'Assign a track first, then promote (required for track-based electives).'
                    : !currentTermCompleteForPromotion
                      ? 'Complete recorded subjects this standing. Untaken subjects (no grade) can be taken later (summer / next year) and do not block promotion.'
                      : !nextPromotionTerm
                        ? 'No next term in the curriculum after this year/semester.'
                        : isRegularStudent
                          ? 'Promote this student to the next semester (manual — auto-promote is temporarily off).'
                          : 'Irregular students must be promoted manually'
                }
              >
                Promote to next semester
              </button>
            ) : null}
            {/* TEMP: auto-promotion UI disabled
            {canEdit &&
            selectedStudent &&
            !isEvaluatedModule &&
            isRegularStudent &&
            !promotionTrackPickRequired &&
            currentTermCompleteForPromotion &&
            nextPromotionTerm &&
            promoteSaving ? (
              <span className="eval-hero__auto-promote-note" role="status">
                Auto-promoting…
              </span>
            ) : null}
            */}
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
          {savedTermLoadSummary ? (
            <span
              className="eval-metrics-strip__term-load"
              title={
                savedTermLoadSummary.codes.length
                  ? `This term load: ${savedTermLoadSummary.codes.join(', ')}`
                  : 'Saved Current subjects load plan'
              }
            >
              This term load:{' '}
              <strong>
                {savedTermLoadSummary.takeCount} subject
                {savedTermLoadSummary.takeCount === 1 ? '' : 's'}
              </strong>
              {savedTermLoadSummary.priorCount > 0
                ? ` · ${savedTermLoadSummary.priorCount} backlog`
                : ''}
              {isIrregularStudent ? ' · Irregular pick' : ''}
            </span>
          ) : isIrregularStudent ? (
            <span className="eval-metrics-strip__term-load eval-metrics-strip__term-load--hint">
              Irregular: open <strong>Current subjects</strong> to pick this term’s load
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const renderFilterRail = () => {
    if (!data || !selectedStudent || !data.rows?.length) return null;
    const { curricula, programLabel } = evaluationFilterOptions;
    const years = yearsAllowedForFilter.length ? yearsAllowedForFilter : evaluationFilterOptions.years;
    const currentYearLabel =
      years.find((y) => String(y.id) === String(evalFilterYearId))?.label || '—';
    const currentSemLabel =
      semesterOptionsForYear.find((s) => String(s.id) === String(evalFilterSemesterId))
        ?.label || '—';
    const curriculumEffectiveLabel = data?.curriculum?.label || curricula[0]?.label || null;
    const schoolYearLabel = standingSchoolYearLabel || curriculumEffectiveLabel;
    const standingBanner = [schoolYearLabel, currentYearLabel, currentSemLabel]
      .filter((part) => part && part !== '—')
      .join(' — ');

    return (
      <>
        <div className="eval-filter-rail" role="toolbar" aria-label="Curriculum filters">
          <label className="eval-filter-field">
            <i className="fa-regular fa-calendar eval-filter-field__icon" aria-hidden />
            <span className="eval-filter-field__label">Curriculum</span>
            <select
              className="eval-filter-field__control"
              value={evalFilterCurriculumId}
              onChange={(e) => setEvalFilterCurriculumId(e.target.value)}
              disabled={curricula.length <= 1}
              title={
                curriculumEffectiveLabel
                  ? `Subject map: Effective SY ${curriculumEffectiveLabel}${
                      schoolYearLabel && schoolYearLabel !== curriculumEffectiveLabel
                        ? ` · Standing school year: ${schoolYearLabel}`
                        : ''
                    }`
                  : 'Student curriculum'
              }
            >
              {curricula.length === 0 ? (
                <option value="">—</option>
              ) : (
                curricula.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="eval-filter-field eval-filter-field--program">
            <i className="fa-solid fa-graduation-cap eval-filter-field__icon" aria-hidden />
            <span className="eval-filter-field__label">Program</span>
            {canEditEvaluationRows ? (
              <SearchableSelect
                id="eval-program-select"
                value={String(displayProgramId ?? '')}
                onChange={handleProgramChange}
                options={programOptions}
                emptyLabel="Select program"
                placeholder="Search program..."
                className={`eval-filter-program-select${
                  hasPendingProgramChange ? ' eval-filter-program-select--pending' : ''
                }`}
                disabled={programOptions.length === 0 || savingAll || programPreviewLoading}
                aria-label="Program"
              />
            ) : (
              <select className="eval-filter-field__control" value="" disabled title={programLabel}>
                <option value="">{programLabel}</option>
              </select>
            )}
          </label>
          <label className="eval-filter-field">
            <i className="fa-regular fa-clock eval-filter-field__icon" aria-hidden />
            <span className="eval-filter-field__label">Year</span>
            <select
              className="eval-filter-field__control"
              value={evalFilterYearId}
              disabled
              title={
                activeSemesterStandingTerm
                  ? `Standing: ${activeSemesterStandingTerm.year_level_name || ''} ${
                      activeSemesterStandingTerm.semester_name || ''
                    }`.trim() +
                    (data?.student?.promoted_next_sem_at
                      ? ' (from promotion)'
                      : ` · earned units ${data?.summary?.total_units_earned ?? 0}`)
                  : `Calculated from earned units (${data?.summary?.total_units_earned ?? 0}): 46→2nd, 94→3rd, 132→4th`
              }
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
              disabled
              title={
                data?.student?.promoted_next_sem_at
                  ? 'Follows promotion target semester'
                  : data?.active_semester?.semester_name
                    ? `Follows Lookup active semester: ${data.active_semester.semester_name}`
                    : 'Follows Lookup → Semesters active row'
              }
            >
              {semesterOptionsForYear.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasPendingProgramChange ? (
          <div className="eval-program-preview-banner" role="status">
            <i className="fa-solid fa-eye" aria-hidden />
            <span>
              Previewing{' '}
              <strong>
                {programOptions.find((option) => Number(option.value) === Number(pendingProgramId))
                  ?.label || 'selected program'}
              </strong>
              . Shared subjects keep their grades with a <strong>FROM</strong> tag. Subjects only in
              the previous program stay visible for review and are removed when you click{' '}
              <strong>Save All Changes</strong> to confirm the shift.
            </span>
          </div>
        ) : null}
        <p className="eval-filter-context" aria-live="polite">
          {String(standingBanner || `${currentYearLabel} — ${currentSemLabel}`).toUpperCase()}
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

    // Placement MOVE TO remaps term for Subject placement.
    // OFFSEM / Semestral takes stay at curriculum home here (badge only).
    const activePlacementMap = placementPreviewHasPendingChanges
      ? placementPreviewMap
      : placementPreviewConfirmedMap;
    const rowsForDisplay = data.rows.map((row) => {
      const key = getRowKey(row);
      const offsem = offSemesterTakeMap[key];
      if (offsem) {
        return {
          ...row,
          off_semester: true,
          off_semester_standing: offsem,
        };
      }
      const placement = activePlacementMap[key];
      if (!placement) return row;
      const slotMeta = placementPreviewSlots.find(
        (s) =>
          String(s.yearId ?? '') === String(placement.yearId ?? '') &&
          String(s.semId ?? '') === String(placement.semId ?? ''),
      );
      return {
        ...row,
        year_level_id: placement.yearId ?? row.year_level_id,
        semester_id: placement.semId ?? row.semester_id,
        year_level_name: slotMeta?.yearLabel || row.year_level_name,
        semester_name: slotMeta?.semesterLabel || row.semester_name,
      };
    });

    // Group rows by year level & semester similar to the spreadsheet layout
    const groups = {};
    rowsForDisplay.forEach((row) => {
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
      return semesterSortValue(a.semester_id, a.semester_name) -
        semesterSortValue(b.semester_id, b.semester_name);
    });

    const entriesToRender = orderedEntries;
    // Student tab: for confirmed shiftee/returnee/transferee, show only remaining
    // current-program subjects to take — hide previous-program-only rows AND
    // shared subjects already taken under the previous program (FROM tags).
    // During an unsaved program-shift preview, keep those rows visible for review.
    const isProgramShiftPreview =
      hasPendingProgramChange || data?.preview_program_shift === true;
    const showOnlySubjectsToTake =
      !isEvaluatedModule &&
      !isProgramShiftPreview &&
      shouldShowOnlySubjectsToTake(data?.student);
    // Always show the full curriculum. Year/Semester dropdowns only mark current standing.
    const matchesTermFilters = ([, rows]) => rows.length > 0;
    const termFilteredEntries = entriesToRender.filter(matchesTermFilters);
    const filteredEntries = termFilteredEntries
      .map(([groupKey, rows]) => {
        if (!showOnlySubjectsToTake) return [groupKey, rows];
        const visibleRows = rows.filter((row) => {
          const merged = mergedRowsByKey.get(getRowKey(row)) || row;
          if (merged?.previous_program_only === true) return false;
          if (merged?.from_previous_program === true) return false;
          return !isTransferCreditRowForTermGate(merged);
        });
        return [groupKey, visibleRows];
      })
      .filter(([, rows]) => rows.length > 0);
    const yearSections = filteredEntries.reduce((acc, entry) => {
      const [, rows] = entry;
      const first = rows[0] || {};
      const key = String(first.year_level_id ?? first.year_level_name ?? 'unknown');
      if (!acc.has(key)) {
        acc.set(key, {
          id: key,
          label: first.year_level_name || 'Unknown Year',
          entries: [],
        });
      }
      acc.get(key).entries.push(entry);
      return acc;
    }, new Map());

    const termPlacementClass = (rows) => {
      const row = rows[0] || {};
      const name = String(row.semester_name || '').toLowerCase();
      if (name.includes('summer')) return 'eval-term-block--summer';
      if (name.includes('first') || name.includes('1st')) return 'eval-term-block--first-sem';
      if (name.includes('second') || name.includes('2nd')) return 'eval-term-block--second-sem';
      return 'eval-term-block--other-sem';
    };

    return (
      <div className="eval-table-container">
        {filteredEntries.length === 0 && termFilteredEntries.length > 0 ? (
          <p className="eval-filter-empty">
            {showOnlySubjectsToTake
              ? 'No remaining subjects to take for this term filter.'
              : 'No courses match the selected year/semester filters.'}
          </p>
        ) : null}
        {[...yearSections.values()].map((yearSection) => (
          <section key={yearSection.id} className="eval-year-section">
            <div className="eval-year-section__title">{yearSection.label}</div>
            <div className="eval-year-term-grid">
              {yearSection.entries.map(([groupKey, rows]) => {
          const visibleRows = rows;
          const semesterModifiedCount = visibleRows.filter((row) => modifiedKeys.has(getRowKey(row))).length;
          const termCanManageSubjectEquivalences = canManageSubjectEquivalences;
          const termCanEditEvaluationRows = canEditEvaluationRows;
          const termCanEditNumericGrades = canEditNumericGrades;
          const termLabel = visibleRows[0]?.semester_name || groupKey;
          const showPreviewMarkers = placementPreviewHasPendingChanges;

          return (
            <div
              key={groupKey}
              id={`eval-term-${visibleRows[0]?.year_level_id ?? 'y'}-${visibleRows[0]?.semester_id ?? 's'}`}
              className={`eval-term-block ${termPlacementClass(rows)}`}
            >
              <div className="eval-term-header">
                <span>{termLabel}</span>
                {(termCanManageSubjectEquivalences || termCanEditEvaluationRows) && (
                  <div className="term-batch-actions">
                    {termCanManageSubjectEquivalences && (
                      <button
                        type="button"
                        className="batch-btn batch-btn--equivalence"
                        onClick={openSubjectEquivModalCatalog}
                        title="Add a mapping from any prior-school (external) course to a local catalog subject. To tie a mapping to a specific PEN row, use the link icon on that row instead."
                      >
                        Subject equivalences
                      </button>
                    )}
                    {termCanEditEvaluationRows && semesterModifiedCount > 0 && (
                      <span className="term-modified-count">{semesterModifiedCount} changed</span>
                    )}
                  </div>
                )}
              </div>
              <div className="eval-responsive-table-wrap">
              <table className="data-table eval-course-table">
                <thead>
                  <tr>
                    <th>Pen Code</th>
                    <th>Descriptive Title</th>
                    <th>Units</th>
                    <th>Grade</th>
                    <th className="eval-remarks-header">
                      {termCanEditEvaluationRows ? (
                        <div className="eval-remarks-header-actions" role="group" aria-label="Remarks batch actions">
                          <button
                            type="button"
                            className="batch-btn batch-btn--icon batch-btn--pass"
                            onClick={() => batchUpdateStatus(visibleRows, 'passed')}
                            disabled={savingAll}
                            title="Mark all as Passed"
                            aria-label="Mark all as Passed"
                          >
                            <i className="fa-solid fa-check" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="batch-btn batch-btn--icon batch-btn--fail"
                            onClick={() => batchUpdateStatus(visibleRows, 'failed')}
                            disabled={savingAll}
                            title="Mark all as Failed"
                            aria-label="Mark all as Failed"
                          >
                            <i className="fa-solid fa-xmark" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="batch-btn batch-btn--icon batch-btn--clear"
                            onClick={() => batchUpdateStatus(visibleRows, '')}
                            disabled={savingAll}
                            title="Clear all remarks"
                            aria-label="Clear all remarks"
                          >
                            <i className="fa-solid fa-rotate-left" aria-hidden />
                          </button>
                        </div>
                      ) : (
                        'Remarks'
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const key = getRowKey(row);
                    const draft = drafts[key] || {};
                    const displaySubjectId = draft.subject_id ?? row.subject_id;
                    const displaySubjectCode = draft.subject_code || row.subject_code;
                    const displaySubjectName = draft.subject_name || row.subject_name;
                    const displayUnits = (() => {
                      const fromRow = draft.units ?? row.units;
                      if (fromRow != null && Number(fromRow) > 0) return fromRow;
                      const choices = Array.isArray(row.elective_choices) ? row.elective_choices : [];
                      const fromChoice = choices
                        .map((c) => Number(c?.units))
                        .find((n) => Number.isFinite(n) && n > 0);
                      if (fromChoice != null) return fromChoice;
                      if (isElectiveTrackPendingRow(row) || row.elective_slot_id) return 3;
                      return fromRow ?? 0;
                    })();
                    const isModified = termCanEditEvaluationRows && modifiedKeys.has(key);
                    const statusClass = termCanEditEvaluationRows
                      ? draft.status || ''
                      : normalizeStatusForUi(row.status ?? '');
                    const gradable = displaySubjectId != null && displaySubjectId !== '';
                    const transferCredit = isTransferCreditRow(row);
                    const mi = data?.rows ? data.rows.findIndex((r) => getRowKey(r) === getRowKey(row)) : -1;
                    const mergedTarget =
                      mi >= 0 && mergedRowsForPrereq[mi]
                        ? mergedRowsForPrereq[mi]
                        : mergeEvalRowWithDrafts(row, drafts, getEvaluationRowKey);
                    const prereqsMet = evalRowPrerequisitesMet(mergedRowsForPrereq, mergedTarget);
                    const prereqBlocksEditing =
                      gradable && !transferCredit && termCanEditEvaluationRows && !prereqsMet;
                    const requisiteLabel = formatPromotionPrerequisiteDisplay(mergedTarget);
                    const unmetPrerequisiteLabels = prereqBlocksEditing
                      ? unmetEvalPrerequisiteLabels(mergedRowsForPrereq, mergedTarget)
                      : [];
                    const unmetAreStandingOnly =
                      unmetPrerequisiteLabels.length > 0 &&
                      unmetPrerequisiteLabels.every((label) => /year standing|prior subjects|prior year/i.test(label));
                    const notEligibleTitle = unmetPrerequisiteLabels.length
                      ? unmetAreStandingOnly
                        ? `Not eligible — requires ${unmetPrerequisiteLabels.join(', ')}`
                        : `Not eligible — missing prerequisite(s): ${unmetPrerequisiteLabels.join(', ')}`
                      : requisiteLabel
                        ? `Prerequisite not satisfied on record. ${requisiteLabel}`
                        : 'Prerequisite not satisfied on record';
                    const electiveSubjectChoices = electiveSubjectChoicesForRow(row);
                    const canPickElectiveSubject =
                      termCanEditEvaluationRows &&
                      isItElectivesFourRow(row) &&
                      electiveSubjectChoices.length > 0;
                    const electiveTrackChoices = dedupeElectiveChoicesByTrack(row.elective_choices)
                      .filter((c) => c.track_id != null && c.track_id !== '');
                    const canPickElectiveTrack =
                      termCanEditEvaluationRows &&
                      !canPickElectiveSubject &&
                      isTrackSelectableElectiveRow(row) &&
                      electiveTrackChoices.length > 0;
                    const savedTrackValue =
                      data?.student?.track_id != null && data.student.track_id !== ''
                        ? String(data.student.track_id)
                        : '';
                    const selectedTrackDraftValue = Object.prototype.hasOwnProperty.call(
                      electiveTrackDrafts,
                      key,
                    )
                      ? electiveTrackDrafts[key]
                      : savedTrackValue;
                    const selectedTrackChanged = selectedTrackDraftValue !== savedTrackValue;

                    const previewPlacement = placementPreviewMap[key];
                    const confirmedPlacement = placementPreviewConfirmedMap[key];
                    const isPreviewPendingForRow =
                      showPreviewMarkers &&
                      JSON.stringify(previewPlacement ?? null) !==
                        JSON.stringify(confirmedPlacement ?? null);

                    return (
                      <tr
                        key={key}
                        className={`${isModified ? 'modified' : ''} ${statusClass} ${!gradable ? 'eval-row-not-gradable' : ''} ${transferCredit ? 'eval-row-transfer-credit' : ''} ${prereqBlocksEditing ? 'eval-row-prereq-blocked' : ''}`}
                        title={
                          transferCredit
                            ? 'Satisfied by approved transfer credit on record (not graded as a class).'
                            : !gradable && isElectiveTrackPendingRow(row)
                              ? 'Click the Pen Code (elective label) to choose a track and unlock this row for grading.'
                              : !gradable
                                ? 'Grades apply only after this curriculum row maps to a subject (track/elective slot).'
                                : prereqBlocksEditing
                                  ? notEligibleTitle
                                  : undefined
                        }
                      >
                        <td className="code-cell" data-label="Pen Code">
                          <div className="eval-code-cell-inner">
                            {canPickElectiveSubject ? (
                              <div
                                className="eval-code-pill-attach"
                                ref={electiveSubjectPopoverKey === key ? electiveTrackPopoverRef : undefined}
                              >
                                <button
                                  type="button"
                                  className="eval-code-pill eval-code-pill--elective-trigger"
                                  id={`elective-subject-${key}`}
                                  aria-expanded={electiveSubjectPopoverKey === key}
                                  aria-haspopup="listbox"
                                  aria-controls={`elective-subject-pop-${key}`}
                                  onClick={() => {
                                    setElectiveTrackPopoverKey(null);
                                    setElectiveSubjectPopoverKey((k) => (k === key ? null : key));
                                  }}
                                  disabled={savingAll || electiveTrackSaving}
                                  title="Choose the exact subject for IT Electives 4"
                                >
                                  {displaySubjectCode || row.elective_slot_name || row.subject_code || 'Elective'}
                                </button>
                                {electiveSubjectPopoverKey === key ? (
                                  <div
                                    className="eval-elective-code-popover"
                                    id={`elective-subject-pop-${key}`}
                                    role="presentation"
                                  >
                                    <label
                                      className="eval-elective-code-popover__label"
                                      htmlFor={`elective-subject-select-${key}`}
                                    >
                                      Select Elective 4 subject
                                    </label>
                                    <select
                                      id={`elective-subject-select-${key}`}
                                      className="eval-elective-track-select eval-elective-track-select--popover"
                                      value={displaySubjectId != null && displaySubjectId !== '' ? String(displaySubjectId) : ''}
                                      onChange={(e) => {
                                        const selected = electiveSubjectChoices.find(
                                          (choice) => String(choice.subject_id) === String(e.target.value)
                                        );
                                        if (!selected) return;
                                        updateDraft(row, {
                                          subject_id: selected.subject_id,
                                          subject_code: selected.subject_code,
                                          subject_name: selected.subject_name,
                                          units: selected.units ?? row.units,
                                        });
                                      }}
                                      disabled={savingAll || electiveTrackSaving}
                                      autoComplete="off"
                                    >
                                      <option value="">Choose elective subject</option>
                                      {electiveSubjectChoices.map((choice) => (
                                        <option key={choice.subject_id} value={String(choice.subject_id)}>
                                          {choice.label}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="eval-elective-code-popover__actions">
                                      <button
                                        type="button"
                                        className="eval-elective-code-popover__confirm"
                                        onClick={() => setElectiveSubjectPopoverKey(null)}
                                        disabled={!draft.subject_id || String(draft.subject_id) === String(row.subject_id ?? '')}
                                      >
                                        Done
                                      </button>
                                      <button
                                        type="button"
                                        className="eval-elective-code-popover__cancel"
                                        onClick={() => {
                                          updateDraft(row, {
                                            subject_id: row.subject_id,
                                            subject_code: row.subject_code,
                                            subject_name: row.subject_name,
                                            units: row.units,
                                          });
                                          setElectiveSubjectPopoverKey(null);
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : canPickElectiveTrack ? (
                              <div
                                className="eval-code-pill-attach"
                                ref={electiveTrackPopoverKey === key ? electiveTrackPopoverRef : undefined}
                              >
                                <button
                                  type="button"
                                  className="eval-code-pill eval-code-pill--elective-trigger"
                                  id={`elective-pen-${key}`}
                                  aria-expanded={electiveTrackPopoverKey === key}
                                  aria-haspopup="listbox"
                                  aria-controls={`elective-track-pop-${key}`}
                                  onClick={() => {
                                    setElectiveTrackDrafts((prev) => ({
                                      ...prev,
                                      [key]: Object.prototype.hasOwnProperty.call(prev, key)
                                        ? prev[key]
                                        : savedTrackValue,
                                    }));
                                    setElectiveTrackPopoverKey((k) => (k === key ? null : key));
                                  }}
                                  disabled={savingAll || electiveTrackSaving}
                                  title={isElectiveTrackPendingRow(row) ? 'Choose track for this elective slot' : 'Change track for this elective slot'}
                                >
                                  {row.subject_code || 'Elective'}
                                </button>
                                {electiveTrackPopoverKey === key ? (
                                  <div
                                    className="eval-elective-code-popover"
                                    id={`elective-track-pop-${key}`}
                                    role="presentation"
                                  >
                                    <label
                                      className="eval-elective-code-popover__label"
                                      htmlFor={`elective-track-${key}`}
                                    >
                                      Select track, then confirm
                                    </label>
                                    <select
                                      id={`elective-track-${key}`}
                                      className="eval-elective-track-select eval-elective-track-select--popover"
                                      value={selectedTrackDraftValue}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setElectiveTrackDrafts((prev) => ({ ...prev, [key]: v }));
                                      }}
                                      disabled={savingAll || electiveTrackSaving}
                                      autoComplete="off"
                                    >
                                      <option value="">Clear track / no track</option>
                                      {electiveTrackChoices.map((c) => (
                                        <option key={c.elective_subject_id} value={String(c.track_id)}>
                                          {electiveChoiceLabel(c)}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="eval-elective-code-popover__actions">
                                      <button
                                        type="button"
                                        className="eval-elective-code-popover__confirm"
                                        onClick={() => void applyElectiveTrack(selectedTrackDraftValue)}
                                        disabled={
                                          savingAll ||
                                          electiveTrackSaving ||
                                          !selectedTrackChanged
                                        }
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        type="button"
                                        className="eval-elective-code-popover__cancel"
                                        onClick={() => {
                                          setElectiveTrackDrafts((prev) => ({
                                            ...prev,
                                            [key]: savedTrackValue,
                                          }));
                                          setElectiveTrackPopoverKey(null);
                                        }}
                                        disabled={electiveTrackSaving}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                    {electiveTrackSaving ? (
                                      <span className="eval-elective-saving">Saving…</span>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="eval-code-pill">
                                {displaySubjectCode || (gradable ? 'N/A' : '—')}
                              </span>
                            )}
                            {termCanManageSubjectEquivalences ? (
                              <button
                                type="button"
                                className="eval-row-equiv-btn"
                                onClick={() => openRowSubjectEquivalence({
                                  ...row,
                                  subject_id: displaySubjectId,
                                  subject_code: displaySubjectCode,
                                  subject_name: displaySubjectName,
                                })}
                                disabled={
                                  savingAll || displaySubjectId == null || displaySubjectId === ''
                                }
                                title={
                                  displaySubjectId != null && displaySubjectId !== ''
                                    ? 'Apply a prior-school course as approved transfer credit for this student and PEN subject'
                                    : 'Link a catalog subject first (e.g. choose elective track)'
                                }
                                aria-label={`Apply transfer credit to local subject ${displaySubjectCode || 'course'}`}
                              >
                                <i className="fa-solid fa-link" aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="subject-cell" data-label="Descriptive Title">
                          {canPickElectiveSubject ? (
                            <div className="eval-elective-title-readonly">
                              <span className="eval-elective-title-readonly__title">
                                {displaySubjectName || row.subject_name || 'Choose an elective subject'}
                              </span>
                              <span className="eval-elective-title-readonly__hint">
                                Use the blue <strong>Pen Code</strong> button to choose Elective 4.
                              </span>
                            </div>
                          ) : isElectiveTrackPendingRow(row) &&
                          termCanEditEvaluationRows &&
                          (row.elective_choices || []).length > 0 ? (
                            <div className="eval-elective-title-readonly">
                              <span className="eval-elective-title-readonly__title">
                                {row.subject_name || '—'}
                              </span>
                              <span className="eval-elective-title-readonly__hint">
                                Use the blue <strong>Pen Code</strong> button to assign a track.
                              </span>
                            </div>
                          ) : isElectiveTrackPendingRow(row) && termCanEditEvaluationRows ? (
                            <span className="eval-elective-track-missing">
                              {row.subject_name || '—'}{' '}
                              <span className="eval-elective-track-missing-note">
                                (No elective options in catalog — configure Elective slots / subjects.)
                              </span>
                            </span>
                          ) : (
                            <div className="eval-title-stack">
                              <span className="eval-title-stack__name">
                                {displaySubjectName || (gradable ? 'N/A' : '—')}
                                {row.off_semester ? (
                                  <span
                                    className={`eval-offsem-badge${
                                      String(row.off_semester_standing?.mode || '').toLowerCase() ===
                                      'semestral'
                                        ? ' eval-offsem-badge--semestral'
                                        : ''
                                    }`}
                                    title={
                                      String(row.off_semester_standing?.mode || '').toLowerCase() ===
                                      'semestral'
                                        ? `Taken as semestral during ${
                                            [
                                              row.off_semester_standing?.standingYearLabel,
                                              row.off_semester_standing?.standingSemLabel,
                                            ]
                                              .filter(Boolean)
                                              .join(' — ') || 'current standing'
                                          }`
                                        : row.off_semester_standing
                                          ? `Taken off-semester during ${
                                              [
                                                row.off_semester_standing.standingYearLabel,
                                                row.off_semester_standing.standingSemLabel,
                                              ]
                                                .filter(Boolean)
                                                .join(' — ') || 'current standing'
                                            }`
                                          : 'Taken off-semester (not in curriculum home term)'
                                    }
                                  >
                                    {String(row.off_semester_standing?.mode || '').toLowerCase() ===
                                    'semestral'
                                      ? 'SEMESTRAL'
                                      : 'OFFSEM'}
                                  </span>
                                ) : null}
                                {row.from_previous_program ? (
                                  <span
                                    className="eval-previous-program-tag"
                                    title={
                                      row.previous_program_name ||
                                      data?.student?.previous_program?.program_name ||
                                      'Tagged from previous course after shift'
                                    }
                                  >
                                    {formatPreviousProgramTag(row, data?.student)}
                                  </span>
                                ) : null}
                                {isPreviewPendingForRow && (
                                  <span
                                    className="eval-preview-move-badge"
                                    title="Pending placement preview change"
                                  >
                                    Preview
                                  </span>
                                )}
                                {termCanEditEvaluationRows && isModified && (
                                  <span className="modified-indicator" title="Unsaved changes">
                                    ●
                                  </span>
                                )}
                              </span>
                              {requisiteLabel ? (
                                <span
                                  className={`eval-requisite-line${
                                    prereqBlocksEditing ? ' eval-requisite-line--blocked' : ''
                                  }`}
                                  title={
                                    prereqBlocksEditing
                                      ? notEligibleTitle
                                      : 'Prerequisite / corequisite rules'
                                  }
                                >
                                  {requisiteLabel}
                                  {prereqBlocksEditing &&
                                  unmetPrerequisiteLabels.length > 0 &&
                                  !unmetAreStandingOnly ? (
                                    <span className="eval-requisite-missing">
                                      {' '}
                                      · Missing: {unmetPrerequisiteLabels.join(', ')}
                                    </span>
                                  ) : null}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="units-cell" data-label="Units">
                          <span className="eval-units-pill">{displayUnits ?? 0}</span>
                        </td>
                        <td
                          className="grade-cell"
                          data-label="Grade"
                          title={
                            isEvaluatorOnly && gradable && !transferCredit
                              ? 'Grade comes from imported records; it cannot be edited here.'
                              : undefined
                          }
                        >
                          {gradable && transferCredit ? (
                            <span className="eval-transfer-credit-dash">—</span>
                          ) : termCanEditNumericGrades && gradable && prereqsMet ? (
                            <input
                              type="text"
                              className="eval-grade-input"
                              value={draft.grade ?? ''}
                              title="Enter grade"
                              onChange={(e) => updateDraft(row, { grade: e.target.value })}
                              disabled={savingAll}
                            />
                          ) : termCanEditNumericGrades && gradable && !prereqsMet ? (
                            <span className="eval-grade-prereq-blocked">
                              {formatEvalGradeReadonly(
                                draft.grade !== '' && draft.grade != null ? draft.grade : row.grade
                              ) || '—'}
                            </span>
                          ) : gradable ? (
                            <span className="eval-grade-readonly">
                              {formatEvalGradeReadonly(row.grade) || '—'}
                            </span>
                          ) : termCanEditEvaluationRows ? (
                            <span className="eval-grade-na">—</span>
                          ) : (
                            <span className="eval-grade-readonly">
                              {formatEvalGradeReadonly(row.grade) || '—'}
                            </span>
                          )}
                        </td>
                        <td className="status-cell" data-label="Remarks">
                          {gradable && transferCredit ? (
                            <span
                              className="status-badge-eval-credited"
                              title="Approved transfer credit"
                            >
                              Credited
                            </span>
                          ) : termCanEditEvaluationRows && gradable && !prereqsMet ? (
                            <div className="eval-prereq-locked" title={notEligibleTitle}>
                              <span className="eval-prereq-locked-badge">Not eligible</span>
                              {unmetPrerequisiteLabels.length > 0 ? (
                                <span className="eval-prereq-locked-detail">
                                  {unmetAreStandingOnly ? 'Requires: ' : 'Needs: '}
                                  {unmetPrerequisiteLabels.join(', ')}
                                </span>
                              ) : requisiteLabel ? (
                                <span className="eval-prereq-locked-detail">{requisiteLabel}</span>
                              ) : null}
                            </div>
                          ) : termCanEditEvaluationRows && gradable ? (
                            <div className="status-cell-inner">
                              <div className="status-buttons">
                                {[
                                  { value: 'passed', label: 'Pass', icon: 'fa-check' },
                                  { value: 'failed', label: 'Fail', icon: 'fa-xmark' },
                                  { value: '', label: 'Clear', icon: 'fa-rotate-left' },
                                ].map(({ value, label, icon }) => (
                                  <button
                                    key={value || 'clear'}
                                    type="button"
                                    className={`status-btn ${draft.status === value ? value : ''} ${!value ? 'clear' : ''}`}
                                    onClick={() => updateDraft(row, gradeAndStatusForRemarkClick(value))}
                                    disabled={savingAll}
                                    title={label}
                                    aria-label={label}
                                  >
                                    <i className={`fa-solid ${icon}`} aria-hidden />
                                  </button>
                                ))}
                              </div>
                              {draft.status === 'inc' && (
                                <p className="eval-legacy-inc-hint" role="note">
                                  This row is still recorded as incomplete. Use Pass or Fail (or clear) to update it.
                                </p>
                              )}
                            </div>
                          ) : termCanEditEvaluationRows && !gradable ? (
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
                        {visibleRows.reduce((acc, row) => {
                          const key = getRowKey(row);
                          const draft = drafts[key] || {};
                          let u = Number(draft.units ?? row.units);
                          if (!Number.isFinite(u) || u <= 0) {
                            const choices = Array.isArray(row.elective_choices) ? row.elective_choices : [];
                            const fromChoice = choices
                              .map((c) => Number(c?.units))
                              .find((n) => Number.isFinite(n) && n > 0);
                            u = fromChoice != null ? fromChoice : row.elective_slot_id ? 3 : 0;
                          }
                          return acc + (Number.isFinite(u) ? u : 0);
                        }, 0)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
          );
              })}
            </div>
          </section>
        ))}

        {showPlacementPreview ? (
          <section
            className={`eval-placement-preview${placementPreviewOpen ? ' is-open' : ' is-collapsed'}`}
            aria-labelledby="eval-placement-preview-title"
          >
            <button
              type="button"
              className="eval-placement-preview__toggle"
              aria-expanded={placementPreviewOpen}
              onClick={() => setPlacementPreviewOpen((open) => !open)}
            >
              <div className="eval-placement-preview__toggle-text">
                <span id="eval-placement-preview-title">Subject placement preview</span>
                <small>
                  Simulate where remaining subjects can be taken
                  ({placementPreviewRemainingRows.length} remaining)
                </small>
              </div>
              <span className="eval-placement-preview__chevron" aria-hidden>
                {placementPreviewOpen ? '▾' : '▸'}
              </span>
            </button>

            {placementPreviewOpen ? (
              <div className="eval-placement-preview__body">
                <p className="eval-placement-preview__desc">
                  Preview only — move remaining subjects between matching terms (1st sem ↔ 1st sem /
                  Summer, 2nd sem ↔ 2nd sem / Summer), or use Insert subject inside a slot. This does not change
                  saved grades.
                </p>
                <div className="eval-placement-preview__toolbar">
                  <button
                    type="button"
                    className="eval-placement-preview__reset"
                    onClick={() => {
                      setPlacementPreviewMap({});
                      setPlacementPreviewConfirmedMap({});
                      setPlacementPreviewInsertSlotKey(null);
                      if (placementPreviewStorageKey) {
                        try {
                          window.localStorage.removeItem(placementPreviewStorageKey);
                        } catch {
                          // Ignore storage failures.
                        }
                      }
                    }}
                    disabled={
                      Object.keys(placementPreviewMap).length === 0 &&
                      placementPreviewInsertSlotKey == null
                    }
                  >
                    Reset preview
                  </button>
                </div>

                {placementPreviewRemainingRows.length === 0 ? (
                  <p className="eval-placement-preview__empty">
                    No remaining subjects to place — all curriculum rows are credited/passed.
                  </p>
                ) : (
                  <div className="eval-placement-preview__years">
                    {placementPreviewYears.map((yearGroup) => (
                      <div key={yearGroup.key} className="eval-placement-preview__year">
                        <div className="eval-placement-preview__year-title">{yearGroup.yearLabel}</div>
                        <div className="eval-placement-preview__term-grid">
                          {yearGroup.sections.map((section) => {
                            const insertOpen = placementPreviewInsertSlotKey === section.key;
                            const slotInsertOptions = placementPreviewSubjectOptions
                              .filter((opt) => {
                                if (opt.slotKey === section.key) return false;
                                const row = placementPreviewRemainingRows.find(
                                  (r) => getEvaluationRowKey(r) === String(opt.id),
                                );
                                if (!row) return false;
                                const candidateMap = {
                                  ...placementPreviewMap,
                                  [String(opt.id)]: {
                                    yearId: section.yearId,
                                    semId: section.semId,
                                  },
                                };
                                return evalPlacementPrereqMoveGate(
                                  row,
                                  section.yearId,
                                  section.semId,
                                  section.semesterLabel,
                                  {
                                    allRows: mergedRowsForPrereq,
                                    placementMap: candidateMap,
                                  },
                                ).ok;
                              })
                              .map((opt) => ({
                                value: opt.id,
                                label: `${opt.label} (from ${opt.where})`,
                              }));
                            return (
                            <div
                              key={section.key}
                              className={`eval-placement-preview__slot${
                                section.rows.length === 0 ? ' eval-placement-preview__slot--empty' : ''
                              }`}
                            >
                              <div className="eval-placement-preview__slot-head">
                                <h4>{section.semesterLabel}</h4>
                                <span>
                                  {section.rows.reduce((acc, row) => {
                                    const u = Number(row.units);
                                    return acc + (Number.isFinite(u) ? u : 0);
                                  }, 0)}{' '}
                                  u · {section.rows.length} subj
                                </span>
                              </div>
                              {section.rows.length > 0 ? (
                                <ul className="eval-placement-preview__list">
                                  {section.rows.map((row) => {
                                    const rowKey = getEvaluationRowKey(row);
                                    const placement = placementPreviewMap[rowKey] || {
                                      yearId: row.year_level_id,
                                      semId: row.semester_id,
                                    };
                                    const currentKey = `${placement.yearId ?? ''}|${placement.semId ?? ''}`;
                                    const moveOptions = getPlacementMoveOptionsForRow(row, currentKey);
                                    const code = row.subject_code || row.elective_slot_name || '—';
                                    const title =
                                      row.subject_name ||
                                      (row.elective_pending ? 'Pending track selection' : '—');
                                    const prereqNoteRaw = formatPromotionPrerequisiteDisplay(row);
                                    const prereqNote = prereqNoteRaw
                                      ? prereqNoteRaw.replace(/^P:\s*/i, '').trim()
                                      : '';
                                    return (
                                      <li key={rowKey} className="eval-placement-preview__item">
                                        <div className="eval-placement-preview__item-main">
                                          <span className="eval-placement-preview__code">{code}</span>
                                          <span className="eval-placement-preview__title">{title}</span>
                                          <span className="eval-placement-preview__units">
                                            {row.units ?? '—'}
                                          </span>
                                        </div>
                                        <label className="eval-placement-preview__move">
                                          <span>Move to</span>
                                          <select
                                            value={
                                              moveOptions.some((slot) => slot.key === currentKey)
                                                ? currentKey
                                                : moveOptions[0]?.key || currentKey
                                            }
                                            onChange={(e) => {
                                              const [yearId, semId] = e.target.value.split('|');
                                              movePlacementPreviewSubject(
                                                rowKey,
                                                yearId === '' ? null : yearId,
                                                semId === '' ? null : semId,
                                              );
                                            }}
                                            title="Preview moving this remaining subject to another matching term"
                                          >
                                            {moveOptions.map((slot) => (
                                              <option key={slot.key} value={slot.key}>
                                                {slot.label}
                                              </option>
                                            ))}
                                          </select>
                                        </label>
                                        {prereqNote ? (
                                          <p className="eval-placement-preview__note">
                                            Prerequisite: {prereqNote}.
                                          </p>
                                        ) : null}
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : null}
                              <div
                                className={`eval-placement-preview__insert-area${
                                  section.rows.length === 0
                                    ? ' eval-placement-preview__insert-area--empty'
                                    : ''
                                }`}
                              >
                                {section.rows.length === 0 && !insertOpen ? (
                                  <div className="eval-placement-preview__empty-actions">
                                    <button
                                      type="button"
                                      className="eval-placement-preview__insert-btn"
                                      onClick={() =>
                                        setPlacementPreviewInsertSlotKey((open) =>
                                          open === section.key ? null : section.key,
                                        )
                                      }
                                    >
                                      + Insert subject
                                    </button>
                                    <p className="eval-placement-preview__slot-empty">No subjects here</p>
                                  </div>
                                ) : null}
                                {insertOpen ? (
                                  <div className="eval-placement-preview__insert-panel">
                                    <label className="eval-placement-preview__insert-field">
                                      <span className="eval-placement-preview__insert-label">
                                        Subject to insert
                                      </span>
                                      <SearchableSelect
                                        id={`eval-placement-insert-${String(section.key).replace(/[^\w-]+/g, '-')}`}
                                        value=""
                                        onChange={(next) =>
                                          void insertPlacementPreviewSubjectIntoSlot(
                                            next,
                                            section.yearId,
                                            section.semId,
                                          )
                                        }
                                        options={slotInsertOptions}
                                        emptyLabel={
                                          slotInsertOptions.length === 0
                                            ? 'No subjects to add'
                                            : 'Choose subject...'
                                        }
                                        placeholder="Search subject code/title..."
                                        className="eval-placement-preview__insert-search"
                                        aria-label={`Choose subject for ${section.semesterLabel}`}
                                        disabled={slotInsertOptions.length === 0}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      className="eval-placement-preview__insert-cancel"
                                      onClick={() => setPlacementPreviewInsertSlotKey(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : section.rows.length > 0 ? (
                                  <button
                                    type="button"
                                    className="eval-placement-preview__insert-btn"
                                    onClick={() =>
                                      setPlacementPreviewInsertSlotKey((open) =>
                                        open === section.key ? null : section.key,
                                      )
                                    }
                                  >
                                    + Insert subject
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    );
  };

  const sectionTitle =
    isCurriculumTracking && !isEvaluatedModule
      ? 'Curriculum tracking'
      : isEvaluatedModule
        ? 'Evaluated students'
        : 'Curriculum Evaluation';
  const listCountLabel =
    isCurriculumTracking && !isEvaluatedModule
      ? `${filteredStudents.length} students`
      : isEvaluatedModule
        ? `${filteredStudents.length} stored`
        : `${filteredStudents.length} students`;
  const studentDropdownOptions = (() => {
    const map = new Map();
    filteredStudents.forEach((student) => map.set(String(student.student_id), student));
    if (selectedStudent?.student_id != null) {
      map.set(String(selectedStudent.student_id), selectedStudent);
    }
    return [...map.values()];
  })();

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
        {canEditEvaluationRows && hasUnsavedChanges && (
          <div className="header-actions">
            <span className="unsaved-indicator">
              <span className="dot">●</span> {unsavedChangeCount} unsaved
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
              disabled={savingAll || !hasUnsavedChanges}
            >
              {savingAll ? 'Saving...' : `Save All (${unsavedChangeCount})`}
            </button>
          </div>
        )}
      </div>

      <div className="eval-container eval-container--selector-layout">
        <div className="eval-student-selector-panel">
          <div className="eval-selector-heading">
            <div>
              <span className="eval-selector-eyebrow">Student selection</span>
              <h3>{isEvaluatedModule ? 'Choose evaluated student' : 'Choose student to evaluate'}</h3>
            </div>
            <span className="eval-list-header-count">{listCountLabel}</span>
          </div>

          <div className="eval-student-selector-grid">
            <label className="eval-list-toolbar__field">
              <span className="eval-list-toolbar__hint">Year level</span>
              <select
                className="eval-list-toolbar__select"
                value={listYearLevelFilter}
                onChange={(e) => setListYearLevelFilter(e.target.value)}
              >
                <option value="">All</option>
                {yearLevelOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="eval-list-toolbar__field eval-list-toolbar__field--student">
              <span className="eval-list-toolbar__hint">Student</span>
              <SearchableSelect
                className="eval-student-searchable-select"
                value={selectedStudent?.student_id != null ? String(selectedStudent.student_id) : ''}
                onChange={async (value) => {
                  const student = studentDropdownOptions.find(
                    (option) => String(option.student_id) === String(value)
                  );
                  if (student) {
                    await handleStudentSelect(student);
                  }
                }}
                onQueryChange={(q) => setSearchTerm(q)}
                options={studentDropdownOptions.map((student) => ({
                  value: String(student.student_id),
                  label: `${student.full_name || 'Unnamed student'} — ${
                    student.student_id_number || 'N/A'
                  } — ${student.program?.program_code || student.program_name || 'Program'}`,
                }))}
                disabled={loadingList && studentDropdownOptions.length === 0}
                emptyLabel={
                  loadingList
                    ? 'Loading students...'
                    : isEvaluatedModule
                      ? 'No stored evaluations found'
                      : 'Select student...'
                }
                placeholder="Type student name or ID..."
                aria-label="Student"
              />
            </label>
          </div>
        </div>

        <div className="eval-details-panel eval-details-panel--sheet">
          {error && <div className="error-message">{error}</div>}

          {loading && <div className="loading-message">Loading evaluation...</div>}

          {programPreviewLoading && !loading && (
            <div className="loading-message">Loading program preview...</div>
          )}

          {canEditEvaluationRows && hasUnsavedChanges && (
            <div className="unsaved-badge">
              <span className="dot">●</span> {unsavedChangeCount} unsaved
            </div>
          )}

          {!loading && !selectedStudent && (
            <div className="eval-empty-selection">
              Select a student above to view and evaluate subjects.
            </div>
          )}
          {!loading && !programPreviewLoading && renderStudentHero()}
          {!loading && !programPreviewLoading && renderFilterRail()}
          {!loading && !programPreviewLoading && renderTable()}

          {/* Floating Save Bar for unsaved grade / program changes */}
          {canEditEvaluationRows && hasUnsavedChanges && (
            <div
              className={`floating-save-bar${
                placementPreviewHasPendingChanges ? ' floating-save-bar--stacked' : ''
              }`}
            >
              <span>
                {hasPendingProgramChange && modifiedKeys.size > 0
                  ? `${unsavedChangeCount} unsaved changes (including program shift)`
                  : hasPendingProgramChange
                    ? 'Program shift pending — save to apply'
                    : `${modifiedKeys.size} subject(s) with unsaved changes`}
              </span>
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

          {/* Floating bar for placement preview (same style as unsaved changes) */}
          {placementPreviewHasPendingChanges && (
            <div className="floating-save-bar">
              <span>
                {placementPreviewPendingCount} subject(s) with unsaved placement preview
              </span>
              <div className="floating-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleDiscardPlacementPreview}
                >
                  Clear All
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirmPlacementPreview}
                >
                  Save All Changes
                </button>
              </div>
            </div>
          )}

          {/* FAB: current curriculum term + subjects */}
          {!loading && !programPreviewLoading && selectedStudent && data?.rows?.length > 0 && (
            <>
              {currentStandingPanelOpen ? (
                <div
                  className="eval-standing-modal-overlay"
                  role="presentation"
                  onClick={() => setCurrentStandingPanelOpen(false)}
                >
                  <div
                    className="eval-standing-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="eval-standing-fab-title"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="eval-standing-fab-panel__header">
                      <div>
                        <p className="eval-standing-fab-panel__eyebrow">Current standing</p>
                        <h3 id="eval-standing-fab-title">
                          {[
                            currentStandingMeta.curriculumLabel,
                            currentStandingMeta.yearLabel,
                            currentStandingMeta.semLabel,
                          ]
                            .filter((p) => p && p !== '—')
                            .join(' — ') || 'Current term'}
                        </h3>
                        <p className="eval-standing-fab-panel__meta">
                          Take {currentStandingMeta.toTakeCount} of {currentStandingMeta.poolCount} ·{' '}
                          {currentStandingMeta.units} units
                          {currentStandingMeta.unitCap != null
                            ? ` / ${currentStandingMeta.unitCap} cap`
                            : ''}
                          {standingLoadDirty ? ' · unsaved' : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="eval-standing-fab-panel__close"
                        onClick={() => setCurrentStandingPanelOpen(false)}
                        aria-label="Close current subjects"
                      >
                        ×
                      </button>
                    </div>
                    <p className="eval-standing-fab-panel__hint">
                      {isIrregularStudent ? (
                        <>
                          <strong>Irregular:</strong> check what to take this standing
                          (regular-term subjects + backlog). Prior/backlog subjects are
                          selectable only when <strong>Offered</strong> this standing
                          (OFFSEM), or when their home semester matches this standing
                          (Semestral). A 2nd-sem subject during 1st-sem standing stays
                          locked unless it is offered.
                        </>
                      ) : (
                        <>
                          This standing subjects first, then untaken / prior-term subjects.
                          Prior takes: <strong>OFFSEM</strong> if listed in Offered
                          subjects, or <strong>Semestral</strong> only when the subject’s
                          home semester matches this standing. Checked prior subjects stay
                          in their curriculum home.
                        </>
                      )}
                    </p>
                    <div className="eval-standing-fab-panel__list eval-standing-load-table-wrap">
                      {currentStandingSubjects.length === 0 ? (
                        <p className="eval-standing-fab-panel__empty">
                          {isIrregularStudent
                            ? 'No unfinished subjects in this standing year or earlier. Check grades or promote when ready.'
                            : 'No prior or eligible current subjects for this standing.'}
                        </p>
                      ) : (
                        (() => {
                          let lastSection = null;
                          return (
                            <div className="eval-responsive-table-wrap">
                              <table className="data-table eval-course-table eval-standing-load-table">
                                <thead>
                                  <tr>
                                    <th>Pen Code</th>
                                    <th>Descriptive Title</th>
                                    <th>Units</th>
                                    <th>Grade</th>
                                    <th>Load</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {currentStandingSubjects.map((row, idx) => {
                                    const rowKey = getEvaluationRowKey(row);
                                    const code =
                                      row.subject_code || row.elective_slot_name || '—';
                                    const title = row.subject_name || '—';
                                    const isCurrentTerm =
                                      String(row.year_level_id) ===
                                        String(evalFilterYearId) &&
                                      String(row.semester_id) ===
                                        String(evalFilterSemesterId);
                                    const section = isCurrentTerm ? 'current' : 'prior';
                                    const showSection = section !== lastSection;
                                    lastSection = section;
                                    const blockReason = standingLoadBlockedByPrereq(
                                      row,
                                      mergedRowsForPrereq
                                    );
                                    const priorGate = isCurrentTerm
                                      ? { ok: true, mode: null }
                                      : priorStandingTakeGate(row);
                                    const offerBlock =
                                      !blockReason && !priorGate.ok
                                        ? priorGate.reason
                                        : null;
                                    const rowLocked = !!(blockReason || offerBlock);
                                    const taking = !standingLoadDeferred.has(rowKey);
                                    const priorMode =
                                      !isCurrentTerm && taking && priorGate.ok
                                        ? priorGate.mode
                                        : null;
                                    const priorTakeFlag =
                                      priorMode === 'offsem'
                                        ? ' · OFFSEM'
                                        : priorMode === 'semestral'
                                          ? ' · Semestral'
                                          : '';
                                    const termTag = isCurrentTerm
                                      ? 'Current standing'
                                      : `${
                                          [row.year_level_name, row.semester_name]
                                            .filter(Boolean)
                                            .join(' · ') || 'Prior term'
                                        }${priorTakeFlag}`;
                                    const requisiteLabel =
                                      formatPromotionPrerequisiteDisplay(row);
                                    const unmet = blockReason
                                      ? unmetEvalPrerequisiteLabels(
                                          mergedRowsForPrereq,
                                          row
                                        )
                                      : [];
                                    const unmetAreStandingOnly =
                                      unmet.length > 0 &&
                                      unmet.every((label) =>
                                        /year standing|prior subjects|prior year/i.test(
                                          label
                                        )
                                      );
                                    const loadDisabled =
                                      !canEditEvaluationRows ||
                                      standingLoadSaving ||
                                      (!!rowLocked && !taking);

                                    return (
                                      <React.Fragment key={`${rowKey}-${idx}`}>
                                        {showSection ? (
                                          <tr className="eval-standing-load-section-row">
                                            <td colSpan={5}>
                                              {section === 'current'
                                                ? 'This standing'
                                                : isIrregularStudent
                                                  ? 'Untaken / backlog (previous terms)'
                                                  : 'Untaken / prior terms'}
                                            </td>
                                          </tr>
                                        ) : null}
                                        <tr
                                          className={`${
                                            rowLocked
                                              ? 'eval-row-prereq-blocked'
                                              : taking
                                                ? 'eval-standing-load-row--take'
                                                : 'eval-standing-load-row--drop'
                                          }`}
                                          title={
                                            blockReason ||
                                            offerBlock ||
                                            termTag ||
                                            undefined
                                          }
                                        >
                                          <td
                                            className="code-cell"
                                            data-label="Pen Code"
                                          >
                                            <div className="eval-code-cell-inner">
                                              <span className="eval-code-pill">
                                                {code}
                                              </span>
                                            </div>
                                          </td>
                                          <td data-label="Descriptive Title">
                                            <div className="eval-title-stack">
                                              <span className="eval-title-stack__name">
                                                {title}
                                              </span>
                                              {requisiteLabel ? (
                                                <span
                                                  className={`eval-requisite-line${
                                                    blockReason
                                                      ? ' eval-requisite-line--blocked'
                                                      : ''
                                                  }`}
                                                >
                                                  {requisiteLabel}
                                                  {blockReason &&
                                                  unmet.length > 0 &&
                                                  !unmetAreStandingOnly ? (
                                                    <span className="eval-requisite-missing">
                                                      {' '}
                                                      · Missing: {unmet.join(', ')}
                                                    </span>
                                                  ) : null}
                                                </span>
                                              ) : null}
                                              {!isCurrentTerm ? (
                                                <span className="eval-standing-load-term-tag">
                                                  {termTag}
                                                </span>
                                              ) : null}
                                            </div>
                                          </td>
                                          <td
                                            className="units-cell"
                                            data-label="Units"
                                          >
                                            <span className="eval-units-pill">
                                              {row.units ?? '—'}
                                            </span>
                                          </td>
                                          <td
                                            className="grade-cell"
                                            data-label="Grade"
                                          >
                                            {formatEvalGradeReadonly(row.grade) || (
                                              <span className="eval-next-sem-map-grade-blank">
                                                —
                                              </span>
                                            )}
                                          </td>
                                          <td
                                            className="status-cell"
                                            data-label="Load"
                                          >
                                            {blockReason ? (
                                              <div
                                                className="eval-prereq-locked"
                                                title={blockReason}
                                              >
                                                <span className="eval-prereq-locked-badge">
                                                  Not eligible
                                                </span>
                                                {unmet.length ? (
                                                  <span className="eval-prereq-locked-detail">
                                                    {unmetAreStandingOnly
                                                      ? 'Requires: '
                                                      : 'Needs: '}
                                                    {unmet.join(', ')}
                                                  </span>
                                                ) : (
                                                  <span className="eval-prereq-locked-detail">
                                                    {blockReason}
                                                  </span>
                                                )}
                                              </div>
                                            ) : offerBlock ? (
                                              <div
                                                className="eval-prereq-locked"
                                                title={offerBlock}
                                              >
                                                <span className="eval-prereq-locked-badge">
                                                  Not offered
                                                </span>
                                                <span className="eval-prereq-locked-detail">
                                                  Add to Offered subjects to take this
                                                  standing
                                                </span>
                                              </div>
                                            ) : (
                                              <label
                                                className={`eval-standing-load-take${
                                                  taking
                                                    ? ''
                                                    : ' eval-standing-load-take--dropped'
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={taking}
                                                  disabled={loadDisabled}
                                                  onChange={() => {
                                                    toggleStandingLoadTake(rowKey);
                                                  }}
                                                  aria-label={
                                                    taking
                                                      ? `Take ${code}`
                                                      : `Drop ${code}`
                                                  }
                                                />
                                                <span>
                                                  {taking ? 'Take' : 'Drop'}
                                                  {priorTakeFlag}
                                                </span>
                                              </label>
                                            )}
                                          </td>
                                        </tr>
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="eval-term-footer__cell"
                                    >
                                      Total units (take): {currentStandingMeta.units}
                                      {currentStandingMeta.unitCap != null
                                        ? ` / ${currentStandingMeta.unitCap} cap`
                                        : ''}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          );
                        })()
                      )}
                    </div>
                    {canEditEvaluationRows && currentStandingSubjects.length > 0 ? (
                      <div className="eval-standing-fab-panel__footer">
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={standingLoadSaving || !standingLoadDirty}
                          onClick={() => {
                            const keys = Array.isArray(data?.student?.standing_deferred_keys)
                              ? data.student.standing_deferred_keys.map(String)
                              : [];
                            setStandingLoadDeferred(new Set(keys));
                            setStandingLoadDirty(false);
                          }}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={standingLoadSaving || !standingLoadDirty}
                          onClick={() => void persistStandingLoadPlan()}
                        >
                          {standingLoadSaving ? 'Saving…' : 'Save load plan'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {nextSemMapOpen ? (
                <div
                  className="eval-standing-modal-overlay"
                  role="presentation"
                  onClick={() => setNextSemMapOpen(false)}
                >
                  <div
                    className="eval-standing-modal eval-next-sem-map-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="eval-next-sem-map-title"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="eval-standing-fab-panel__header">
                      <div>
                        <p className="eval-standing-fab-panel__eyebrow">
                          Possible next-semester map
                        </p>
                        <h3 id="eval-next-sem-map-title">
                          {nextStandingTermLabel || 'Next term'}
                        </h3>
                        <p className="eval-standing-fab-panel__meta">
                          {nextSemMapMeta.backlogCount > 0
                            ? `${nextSemMapMeta.backlogEligibleCount}/${nextSemMapMeta.backlogCount} priority backlog · `
                            : ''}
                          {nextSemMapMeta.targetEligibleCount} next-standing eligible ·{' '}
                          {nextSemMapMeta.blockedCount} blocked by prereq
                          {nextSemMapMeta.unitCap != null
                            ? ` · ${nextSemMapMeta.unitCap}u year cap`
                            : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="eval-standing-fab-panel__close"
                        onClick={() => setNextSemMapOpen(false)}
                        aria-label="Close next semester mapping"
                      >
                        ×
                      </button>
                    </div>
                    <p className="eval-standing-fab-panel__hint">
                      Guide for the dean:{' '}
                      <strong>1)</strong> clear earlier untaken / backlog first so the
                      student can proceed, <strong>2)</strong> check prerequisites those
                      subjects unlock, then <strong>3)</strong> map what is possible for{' '}
                      <strong>{nextStandingTermLabel || 'the next standing'}</strong>.
                      Already passed subjects stay hidden.
                    </p>
                    <div className="eval-next-sem-map-modal__body">
                      {!nextStandingTerm ? (
                        <p className="eval-standing-fab-panel__empty">
                          No next semester on this curriculum.
                        </p>
                      ) : nextSemMappingSubjects.length === 0 ? (
                        <p className="eval-standing-fab-panel__empty">
                          No remaining untaken subjects for this student.
                        </p>
                      ) : (
                        <>
                          {nextSemMapMeta.backlogCount > 0 ? (
                            <div className="eval-next-sem-map-guide eval-next-sem-map-guide--priority">
                              <strong>Take these first</strong>
                              <span>
                                Earlier untaken subjects before{' '}
                                {nextStandingTermLabel || 'next standing'}. Finish or
                                schedule these (and their prereqs) so standing can move
                                forward cleanly.
                              </span>
                            </div>
                          ) : (
                            <div className="eval-next-sem-map-guide">
                              <strong>No earlier backlog</strong>
                              <span>
                                No untaken subjects before the next standing — focus on
                                what can be taken next and any prereq locks below.
                              </span>
                            </div>
                          )}

                          {nextSemPriorityYearSections.length
                            ? renderNextSemMapSections(
                                nextSemPriorityYearSections,
                                'priority'
                              )
                            : null}

                          <div className="eval-next-sem-map-guide eval-next-sem-map-guide--next">
                            <strong>Possible for next standing</strong>
                            <span>
                              Curriculum subjects for{' '}
                              {nextStandingTermLabel || 'the next term'}. Green = can be
                              taken (prereqs met or already in this standing’s load). Red
                              = still blocked.
                            </span>
                          </div>
                          {nextSemTargetYearSections.length ? (
                            renderNextSemMapSections(nextSemTargetYearSections, 'next')
                          ) : (
                            <p className="eval-standing-fab-panel__empty">
                              No remaining home subjects for that next standing term.
                            </p>
                          )}

                          {nextSemLaterYearSections.length ? (
                            <>
                              <div className="eval-next-sem-map-guide eval-next-sem-map-guide--later">
                                <strong>Later curriculum (not yet)</strong>
                                <span>
                                  Subjects after the next standing — shown for awareness.
                                  Usually wait until earlier backlog and next-standing
                                  subjects are cleared.
                                </span>
                              </div>
                              {renderNextSemMapSections(nextSemLaterYearSections, 'later')}
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                    <div className="eval-standing-fab-panel__footer">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setNextSemMapOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                className={`eval-standing-fab${
                  hasUnsavedChanges || placementPreviewHasPendingChanges
                    ? ' eval-standing-fab--raised'
                    : ''
                }`}
                onClick={() => setCurrentStandingPanelOpen((open) => !open)}
                aria-expanded={currentStandingPanelOpen}
                aria-controls="eval-standing-fab-title"
                title="Show backlog + current standing subjects (unit load)"
              >
                <i className="fa-solid fa-book-open" aria-hidden />
                <span>Current subjects</span>
              </button>
            </>
          )}
        </div>
      </div>

      {downloadModalOpen && (
        <div className="eval-download-modal-overlay" role="presentation">
          <div className="eval-download-modal" role="dialog" aria-modal="true" aria-labelledby="eval-download-title">
            <div className="eval-download-modal__header">
              <div>
                <p className="eval-download-modal__eyebrow">PDF / Excel / CSV export</p>
                <h3 id="eval-download-title">Download Evaluation</h3>
              </div>
              <button
                type="button"
                className="eval-download-modal__close"
                onClick={() => setDownloadModalOpen(false)}
                disabled={downloadingPdf || downloadingCsv}
                aria-label="Close download dialog"
              >
                ×
              </button>
            </div>

            <div className="eval-download-modal__body">
              <p className="eval-download-modal__hint">
                Choose which terms to include, then download as PDF or Export to Excel/CSV.
              </p>

              <label className="eval-download-option">
                <input
                  type="radio"
                  name="downloadScope"
                  value="all"
                  checked={downloadScope === 'all'}
                  onChange={() => setDownloadScope('all')}
                  disabled={downloadingPdf || downloadingCsv}
                />
                <span>
                  <strong>All terms</strong>
                  <small>Download the full curriculum evaluation.</small>
                </span>
              </label>

              <label className={`eval-download-option${!currentDownloadTermLabel ? ' is-disabled' : ''}`}>
                <input
                  type="radio"
                  name="downloadScope"
                  value="current"
                  checked={downloadScope === 'current'}
                  onChange={() => setDownloadScope('current')}
                  disabled={downloadingPdf || downloadingCsv || !currentDownloadTermLabel}
                />
                <span>
                  <strong>Current selected term</strong>
                  <small>{currentDownloadTermLabel || 'Select a year and semester first.'}</small>
                </span>
              </label>

              <label className="eval-download-option">
                <input
                  type="radio"
                  name="downloadScope"
                  value="specific"
                  checked={downloadScope === 'specific'}
                  onChange={() => setDownloadScope('specific')}
                  disabled={downloadingPdf || downloadingCsv}
                />
                <span>
                  <strong>Specific terms</strong>
                  <small>Pick one or more year/semester sections.</small>
                </span>
              </label>

              {downloadScope === 'specific' && (
                <div className="eval-download-term-list">
                  <div className="eval-download-term-list__actions">
                    <button
                      type="button"
                      onClick={() => setDownloadSelectedTermKeys(downloadTermOptions.map((option) => option.key))}
                      disabled={downloadingPdf || downloadingCsv}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setDownloadSelectedTermKeys([])}
                      disabled={downloadingPdf || downloadingCsv}
                    >
                      Clear
                    </button>
                  </div>
                  {downloadTermOptions.map((option) => (
                    <label key={option.key} className="eval-download-term-check">
                      <input
                        type="checkbox"
                        checked={downloadSelectedTermKeys.includes(option.key)}
                        onChange={() => toggleDownloadTermKey(option.key)}
                        disabled={downloadingPdf || downloadingCsv}
                      />
                      <span>{option.label}</span>
                      <small>{option.rowCount} subject(s)</small>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="eval-download-modal__footer">
              <span>{selectedDownloadCount} term(s) selected</span>
              <div className="eval-download-modal__footer-actions">
                <button
                  type="button"
                  className="eval-download-modal__cancel"
                  onClick={() => setDownloadModalOpen(false)}
                  disabled={downloadingPdf || downloadingCsv}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="eval-download-modal__download eval-download-modal__download--csv"
                  onClick={handleDownloadEvaluationCsv}
                  disabled={downloadingPdf || downloadingCsv || selectedDownloadCount < 1}
                >
                  {downloadingCsv ? 'Creating CSV...' : 'Export to Excel/CSV'}
                </button>
                <button
                  type="button"
                  className="eval-download-modal__download"
                  onClick={handleDownloadEvaluationPdf}
                  disabled={downloadingPdf || downloadingCsv || selectedDownloadCount < 1}
                >
                  {downloadingPdf ? 'Creating PDF...' : 'Download PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        trackPickerVisible={promoteModalTrackOptions.length > 0}
        trackPickerRequired={promotionTrackPickRequired}
        trackPickerOptions={promoteModalTrackOptions}
        trackPickerValue={promoteModalTrackId}
        onTrackPickerChange={(e) => setPromoteModalTrackId(e.target.value)}
      />

      <SubjectEquivalenceQuickModal
        open={subjectEquivModalOpen}
        fixedLocal={subjectEquivFixedLocal}
        rosterStudentId={data?.student?.student_id ?? null}
        onClose={() => {
          setSubjectEquivModalOpen(false);
          setSubjectEquivFixedLocal(null);
        }}
        onSaved={refreshSelectedStudentEvaluation}
      />
    </div>
  );
};

export default StudentEvaluationView;


