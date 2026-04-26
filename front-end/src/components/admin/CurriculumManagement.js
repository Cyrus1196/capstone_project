import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { swalConfirm, swalError, swalToast } from '../../utils/swal';
import SearchableSelect from '../common/SearchableSelect';
import './CurriculumManagement.css';

/** Mutate curriculum data (not view-only). Friendly name = full module from DefaultPermissionsSeeder. */
const CURRICULUM_MUTATE_PERMISSIONS = [
  'curriculum.create',
  'curriculum.edit',
  'curriculum.delete',
  'curriculum.approve',
  'Curriculum Management',
];

/** Curriculum API returns year_level as either an id or a nested { year_level_id, year_level } */
function normalizeYearLevelId(val) {
  if (val == null || val === '') return '';
  if (typeof val === 'object' && val.year_level_id != null) {
    return String(val.year_level_id);
  }
  return String(val);
}

/** Description column for elective curriculum rows: "Elective 1", "Elective 2", … from slot_name */
function electiveSlotDescriptionLabel(slotName, electiveSlotId) {
  const s = (slotName || '').trim();
  const m = s.match(/electives?\s*(\d+)/i);
  if (m) return `Elective ${m[1]}`;
  if (electiveSlotId != null && electiveSlotId !== '') return `Elective ${electiveSlotId}`;
  return s || 'Elective';
}

/** e.g. 1 → "1st Year", 4 → "4th Year" (matches student My Curriculum wording). */
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

/** ITE→core; GEN / PED / NST / SSP / MAT→minor (UI label GE). Other codes leave type empty. */
const SUBJECT_CODE_GE_PREFIXES = ['GEN', 'PED', 'NST', 'SSP', 'MAT'];

function defaultSubjectTypeFromSubjectCode(subjectCode) {
  const c = (subjectCode || '').trim().toUpperCase();
  if (c.startsWith('ITE')) return 'core';
  if (SUBJECT_CODE_GE_PREFIXES.some((p) => c.startsWith(p))) return 'minor';
  return '';
}

/** Requisite row id for `<select>` value (aligned with getRequisiteOptionsForBulkRow). */
function getRequisiteRecordId(requisite) {
  if (!requisite) return '';
  const requisiteId =
    requisite.requisite_id ??
    requisite.prerequisite_id ??
    requisite.corequisite_id ??
    requisite.prereq_id ??
    requisite.coreq_id ??
    requisite.requisites_id;
  return requisiteId != null && requisiteId !== '' ? String(requisiteId) : '';
}

/** Prefer first prerequisite, else first corequisite (user can change in dropdown). */
function pickDefaultRequisiteId(prereqs, coreqs) {
  const firstId = (arr) => (Array.isArray(arr) && arr.length ? getRequisiteRecordId(arr[0]) : '');
  return firstId(prereqs) || firstId(coreqs);
}

/** UI label for stored subject_type (value stays `minor` for API). */
function formatSubjectTypeForDisplay(type) {
  if (type == null || type === '') return '-';
  const t = String(type).trim().toLowerCase();
  if (t === 'minor') return 'GE';
  return type;
}

function yearLevelPillLabel(yearLevelId, fallbackName) {
  const id =
    yearLevelId != null && yearLevelId !== ''
      ? Number.parseInt(String(yearLevelId), 10)
      : NaN;
  if (Number.isFinite(id) && id >= 1) {
    return ordinalYearLabel(id);
  }
  const s = (fallbackName || '').trim();
  return s || 'Year';
}

const CurriculumManagement = () => {
  const { hasAnyPermission } = useAuth();
  const canMutateCurriculum = hasAnyPermission(CURRICULUM_MUTATE_PERMISSIONS);

  const [curricula, setCurricula] = useState([]);
  const [lookupData, setLookupData] = useState({
    programs: [],
    subjects: [],
    yearLevels: [],
    semesters: [],
    prerequisites: [],
    corequisites: [],
    curriculumHeaders: [],
    electiveSlots: [],
  });
  
  // Ensure lookupData is always an object with arrays
  const safeLookupData = {
    programs: Array.isArray(lookupData.programs) ? lookupData.programs : [],
    subjects: Array.isArray(lookupData.subjects) ? 
      // Remove duplicates based on subject_code, keeping the first occurrence
      lookupData.subjects.filter((subject, index, self) => 
        index === self.findIndex((s) => s.subject_code === subject.subject_code)
      ) : [],
    yearLevels: Array.isArray(lookupData.yearLevels) ? lookupData.yearLevels : [],
    semesters: Array.isArray(lookupData.semesters) ? lookupData.semesters : [],
    prerequisites: Array.isArray(lookupData.prerequisites) ? lookupData.prerequisites : [],
    corequisites: Array.isArray(lookupData.corequisites) ? lookupData.corequisites : [],
    curriculumHeaders: Array.isArray(lookupData.curriculumHeaders) ? lookupData.curriculumHeaders : [],
    requisites: Array.isArray(lookupData.requisites) ? lookupData.requisites : [],
    electiveSlots: Array.isArray(lookupData.electiveSlots) ? lookupData.electiveSlots : [],
  };

  const programSearchOptions = useMemo(
    () =>
      safeLookupData.programs.map((p) => ({
        value: String(p.program_id),
        label: `${p.program_name} (${p.program_code})`,
      })),
    [safeLookupData.programs],
  );

  const subjectSearchOptions = useMemo(
    () =>
      safeLookupData.subjects.map((s) => ({
        value: String(s.subject_id),
        label: `${s.subject_code} - ${s.subject_name}`,
      })),
    [safeLookupData.subjects],
  );

  // caches for per-subject requisites (keyed by subject id string)
  const [availablePrerequisites, setAvailablePrerequisites] = useState({});
  const [availableCorequisites, setAvailableCorequisites] = useState({});

  // Helper: resolve requisite's required subject id and label (subject code/name) from various shapes
  // FIX: Added fallback to look up subject code from safeLookupData if requiredSubject is missing
  const resolveRequisiteLabel = (requisite) => {
    if (!requisite) {
      return { id: null, label: '-' };
    }

    const prefix =
      requisite.requisite_type === 'prerequisite'
        ? 'P:'
        : requisite.requisite_type === 'corequisite'
        ? 'Co:'
        : 'REQ:';

    const id = requisite.requisites_id || requisite.requisite_id || requisite.prerequisite_id || requisite.corequisite_id || requisite.prereq_id || requisite.coreq_id || null;
    
    let subjectCode = '-';
    
    // Try to get code from nested relationship first
    if (requisite.requiredSubject && requisite.requiredSubject.subject_code) {
      subjectCode = requisite.requiredSubject.subject_code;
    } else {
      // Fallback: Manually find the subject in the global list using the ID
      // This fixes the issue where dropdown options show "-" because the global lookup
      // didn't eager load the requiredSubject relationship.
      const requiredSubjectId = requisite.requisites_subject_id || requisite.required_subject_id || requisite.coreq_subject_id;
      if (requiredSubjectId) {
        const found = safeLookupData.subjects.find(s => s.subject_id?.toString() === requiredSubjectId.toString());
        if (found) {
          subjectCode = found.subject_code;
        }
      }
    }

    return {
      id,
      label: subjectCode !== '-' ? `${prefix} ${subjectCode}` : '-'
    };
  };

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState(null);
  
  // For bulk add form
  const [bulkFormData, setBulkFormData] = useState({
    program_id: '',
    year_level: '',
    semester_id: '',
  });
  
  // Array of subjects to add
  const [subjectRows, setSubjectRows] = useState([
    {
      subject_id: '',
      elective_slot_id: '',
      is_elective_slot: false,
      passing_grade: '',
      custom_grade: '',
      subject_type: '',
      requisite_id: '',
    }
  ]);
  
  const [error, setError] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  /** Which year-level group is shown (1-based index into grouped curricula for the current filter) */
  const [yearLevelPage, setYearLevelPage] = useState(1);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showCorequisiteModal, setShowCorequisiteModal] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);

  useEffect(() => {
    if (!canMutateCurriculum) {
      setShowModal(false);
      setShowEditPanel(false);
      setShowCorequisiteModal(false);
    }
  }, [canMutateCurriculum]);
  
  // Co-requisite form state
  const [corequisiteForm, setCorequisiteForm] = useState({
    subject_id: '',
    coreq_subject_id: '',
  });

  const bulkElectiveSlotSearchOptions = useMemo(() => {
    if (!bulkFormData.program_id || !bulkFormData.year_level || !bulkFormData.semester_id) {
      return [];
    }
    return safeLookupData.electiveSlots
      .filter(
        (slot) =>
          slot.program_id?.toString() === bulkFormData.program_id.toString() &&
          slot.year_level_id?.toString() === bulkFormData.year_level.toString() &&
          slot.semester_id?.toString() === bulkFormData.semester_id.toString(),
      )
      .map((s) => ({
        value: String(s.elective_slot_id),
        label: s.slot_name || `Slot ${s.elective_slot_id}`,
      }));
  }, [
    bulkFormData.program_id,
    bulkFormData.year_level,
    bulkFormData.semester_id,
    safeLookupData.electiveSlots,
  ]);

  const editElectiveSlotSearchOptions = useMemo(() => {
    const programId = bulkFormData.program_id || selectedCurriculum?.program_id;
    const yearLevelId = normalizeYearLevelId(
      bulkFormData.year_level || selectedCurriculum?.year_level,
    );
    const semesterId = bulkFormData.semester_id || selectedCurriculum?.semester_id;
    return safeLookupData.electiveSlots
      .filter((slot) => {
        if (!programId || !yearLevelId || !semesterId) return true;
        return (
          slot.program_id?.toString() === programId.toString() &&
          slot.year_level_id?.toString() === yearLevelId &&
          slot.semester_id?.toString() === semesterId.toString()
        );
      })
      .map((s) => ({
        value: String(s.elective_slot_id),
        label: s.slot_name || `Slot ${s.elective_slot_id}`,
      }));
  }, [
    bulkFormData.program_id,
    bulkFormData.year_level,
    bulkFormData.semester_id,
    selectedCurriculum,
    safeLookupData.electiveSlots,
  ]);

  const coreqCoSubjectSearchOptions = useMemo(
    () =>
      subjectSearchOptions.filter(
        (o) => o.value !== (corequisiteForm.subject_id ? String(corequisiteForm.subject_id) : ''),
      ),
    [subjectSearchOptions, corequisiteForm.subject_id],
  );

  const getRequisiteOptionsForBulkRow = (row) => {
    if (!row) return [];
    const subjectIdForRow = row.subject_id ? row.subject_id.toString() : null;
    const cached = subjectIdForRow
      ? availablePrerequisites[subjectIdForRow] || availableCorequisites[subjectIdForRow]
      : null;

    const combined =
      Array.isArray(safeLookupData.requisites) && safeLookupData.requisites.length
        ? safeLookupData.requisites
        : [
            ...(Array.isArray(safeLookupData.prerequisites) ? safeLookupData.prerequisites : []),
            ...(Array.isArray(safeLookupData.corequisites) ? safeLookupData.corequisites : []),
          ];

    const getRequisitesForSubject = (subjectId, requisites) => {
      if (!subjectId) return [];
      return requisites.filter((r) => r && r.subject_id?.toString() === subjectId.toString());
    };

    let relevant =
      cached && Array.isArray(cached) && cached.length > 0
        ? [...cached]
        : getRequisitesForSubject(subjectIdForRow, combined);

    if (row.requisite_id) {
      const selectedRequisite = combined.find((r) => {
        const requisiteId =
          r.requisite_id ||
          r.prerequisite_id ||
          r.corequisite_id ||
          r.prereq_id ||
          r.coreq_id;
        const fallbackId = r.requisites_id;
        return (
          (requisiteId || fallbackId) &&
          (requisiteId || fallbackId).toString() === row.requisite_id.toString()
        );
      });
      if (
        selectedRequisite &&
        !relevant.find((r) => {
          const requisiteId =
            r.requisite_id ||
            r.prerequisite_id ||
            r.corequisite_id ||
            r.prereq_id ||
            r.coreq_id;
          const fallbackId = r.requisites_id;
          return (
            (requisiteId || fallbackId) &&
            (requisiteId || fallbackId).toString() === row.requisite_id.toString()
          );
        })
      ) {
        relevant = [...relevant, selectedRequisite];
      }
    }

    return relevant
      .map((requisite, idx) => {
        if (!requisite) return null;
        const requisiteId =
          requisite.requisite_id ||
          requisite.prerequisite_id ||
          requisite.corequisite_id ||
          requisite.prereq_id ||
          requisite.coreq_id ||
          requisite.requisites_id;
        if (requisiteId == null) return null;
        const resolved = resolveRequisiteLabel(requisite);
        return {
          value: String(requisiteId),
          label: resolved.label,
          key: resolved.id ?? `req-${idx}`,
        };
      })
      .filter(Boolean);
  };

  const getRequisiteOptionsForEdit = () => {
    const combined =
      Array.isArray(safeLookupData.requisites) && safeLookupData.requisites.length
        ? safeLookupData.requisites
        : [
            ...(Array.isArray(safeLookupData.prerequisites) ? safeLookupData.prerequisites : []),
            ...(Array.isArray(safeLookupData.corequisites) ? safeLookupData.corequisites : []),
          ];

    const subjectIdForEdit =
      (subjectRows[0] && subjectRows[0].subject_id
        ? subjectRows[0].subject_id.toString()
        : null) ||
      (selectedCurriculum?.subject_id != null ? String(selectedCurriculum.subject_id) : null);

    let relevantEdit = combined.filter(
      (r) => r.subject_id?.toString() === subjectIdForEdit,
    );

    const currentRequisiteId = subjectRows[0]?.requisite_id || selectedCurriculum?.requisite_id;
    if (currentRequisiteId) {
      const selectedRequisite = combined.find((r) => {
        const requisiteId =
          r.requisite_id ||
          r.prerequisite_id ||
          r.corequisite_id ||
          r.prereq_id ||
          r.coreq_id ||
          r.requisites_id;
        return requisiteId && requisiteId.toString() === currentRequisiteId.toString();
      });
      if (
        selectedRequisite &&
        !relevantEdit.find((r) => {
          const requisiteId =
            r.requisite_id ||
            r.prerequisite_id ||
            r.corequisite_id ||
            r.prereq_id ||
            r.coreq_id ||
            r.requisites_id;
          return requisiteId && requisiteId.toString() === currentRequisiteId.toString();
        })
      ) {
        relevantEdit = [...relevantEdit, selectedRequisite];
      }
    }

    return relevantEdit.map((requisite, idx) => {
      if (!requisite) return null;
      const requisiteId =
        requisite.requisite_id ||
        requisite.prerequisite_id ||
        requisite.corequisite_id ||
        requisite.prereq_id ||
        requisite.coreq_id ||
        requisite.requisites_id;
      if (requisiteId == null) return null;
      const resolved = resolveRequisiteLabel(requisite);
      return {
        value: String(requisiteId),
        label: resolved.label,
        key: resolved.id ?? `edit-req-${idx}`,
      };
    }).filter(Boolean);
  };

  useEffect(() => {
    fetchCurricula();
    fetchLookupData();
  }, []);

  useEffect(() => {
    setYearLevelPage(1);
  }, [filterProgram]);

  const fetchCurricula = async () => {
    try {
      const response = await api.get('/curriculum');
      // Debug: Log elective slots to see if they're loaded
      const curriculaWithElectives = response.data.filter(c => c.elective_slot_id);
      if (curriculaWithElectives.length > 0) {
        console.log('Curriculum with elective slots:', curriculaWithElectives);
        curriculaWithElectives.forEach(c => {
          console.log(`Elective Slot ${c.elective_slot_id}:`, {
            electiveSlot: c.electiveSlot,
            electiveSubjects: c.electiveSlot?.electiveSubjects,
            elective_subjects: c.electiveSlot?.elective_subjects
          });
        });
      }
      setCurricula(response.data);
    } catch (error) {
      console.error('Error fetching curriculum:', error);
      setError('Failed to fetch curriculum');
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupData = async () => {
    try {
      const res = await api.get('/lookup/page-bundle');
      const combinedData = res.data || {};
      const curriculumHeadersData = Array.isArray(combinedData.curriculumHeaders)
        ? combinedData.curriculumHeaders
        : [];

      // Normalize lookup data: backend returns 'requisites' (mixed prerequisites/corequisites)
      let normalizedLookup = {
        ...combinedData,
        curriculumHeaders: curriculumHeadersData,
        electiveSlots: Array.isArray(combinedData.electiveSlots) ? combinedData.electiveSlots : [],
      };
      if (combinedData.requisites && Array.isArray(combinedData.requisites)) {
        const requisites = combinedData.requisites;
        normalizedLookup.prerequisites = requisites.filter(r => (r.requisite_type || r.type || '').toString().toLowerCase() === 'prerequisite');
        normalizedLookup.corequisites = requisites.filter(r => (r.requisite_type || r.type || '').toString().toLowerCase() === 'corequisite');
      }
      setLookupData(normalizedLookup);
      
      // Handle prerequisites: could be Object or Array or come from mixed 'requisites'
      const prereqSource = normalizedLookup.prerequisites || combinedData.prerequisites || [];
      if (prereqSource) {
        let prereqsBySubject = {};
        if (Array.isArray(prereqSource)) {
          // If it's an array, group it by subject_id
          prereqSource.forEach(prereq => {
            const subjectId = prereq.subject_id?.toString();
            if (subjectId) {
              if (!prereqsBySubject[subjectId]) {
                prereqsBySubject[subjectId] = [];
              }
              prereqsBySubject[subjectId].push(prereq);
            }
          });
        } else if (typeof prereqSource === 'object') {
          // If it's already an object keyed by subject id, use it directly
          prereqsBySubject = prereqSource;
        }
        setAvailablePrerequisites(prereqsBySubject);
      }

      // Handle corequisites: could be Object or Array
      const coreqSource = normalizedLookup.corequisites || combinedData.corequisites || [];
      if (coreqSource) {
        let coreqsBySubject = {};
        if (Array.isArray(coreqSource)) {
          // If it's an array, group it by subject_id and also index by other related ids
          coreqSource.forEach(coreq => {
            const subjectId = coreq.subject_id?.toString();
            const otherId = coreq.coreq_subject_id?.toString() || coreq.coreqSubjectId?.toString();
            const requiredId = coreq.requiredSubject?.subject_id?.toString();

            const indexFor = (id) => {
              if (!id) return;
              if (!coreqsBySubject[id]) coreqsBySubject[id] = [];
              coreqsBySubject[id].push(coreq);
            };

            indexFor(subjectId);
            indexFor(otherId);
            indexFor(requiredId);
          });
        } else if (typeof coreqSource === 'object') {
          coreqsBySubject = coreqSource;
        }
        setAvailableCorequisites(coreqsBySubject);
      }
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const fetchPrerequisitesForSubject = async (subjectId) => {
    if (!subjectId) {
      return [];
    }

    const subjectIdStr = subjectId.toString();
    
    // Check if prerequisites are already loaded from pre-population
    const existingPrereqs = availablePrerequisites[subjectIdStr];
    if (existingPrereqs) {
      return existingPrereqs; // Return existing prerequisites (even if empty array)
    }
    
    try {
      // First try to fetch from API
      const response = await api.get(`/prerequisites/subject/${subjectId}`);
      const apiPrereqs = response.data || [];
      
      // FIX: Always update state, even if empty, to prevent repeated fetches
      setAvailablePrerequisites(prev => {
        const updated = { ...prev, [subjectIdStr]: apiPrereqs };
        return updated;
      });
      
      return apiPrereqs;
    } catch (error) {
      console.error('Error fetching prerequisites from API for subject', subjectIdStr, ':', error);
    }
    
    // Fallback: use prerequisites from lookup data
    const lookupPrereqs = safeLookupData.prerequisites || [];
    const lookupPrereqsForSubject = lookupPrereqs.filter(prereq => {
      if (!prereq) return false;
      if (!prereq.subject_id) return false;
      const prereqSubjectId = parseInt(prereq.subject_id);
      const subjectIdInt = parseInt(subjectIdStr);
      return prereqSubjectId === subjectIdInt;
    });
    
    // Only update if we found prerequisites - don't overwrite with empty array
    if (lookupPrereqsForSubject.length > 0) {
      setAvailablePrerequisites(prev => {
        const updated = { ...prev, [subjectIdStr]: lookupPrereqsForSubject };
        return updated;
      });
      return lookupPrereqsForSubject;
    } else {
      // FIX: Cache empty array to prevent fallback loop if API also failed
      setAvailablePrerequisites(prev => ({ ...prev, [subjectIdStr]: [] }));
      return [];
    }
  };

  const fetchCorequisitesForSubject = async (subjectId) => {
    if (!subjectId) {
      return [];
    }

    const subjectIdStr = subjectId.toString();
    
    // Check if corequisites are already loaded from pre-population
    const existingCoreqs = availableCorequisites[subjectIdStr];
    if (existingCoreqs) {
      return existingCoreqs; 
    }
    
    // Fallback: use corequisites from lookup data
    const lookupCoreqs = safeLookupData.corequisites || [];
    const subjectIdInt = parseInt(subjectIdStr);
    const lookupCoreqsForSubject = lookupCoreqs.filter(coreq => {
      if (!coreq) return false;

      const candidates = [];
      if (coreq.subject_id !== undefined) candidates.push(parseInt(coreq.subject_id));
      if (coreq.coreq_subject_id !== undefined) candidates.push(parseInt(coreq.coreq_subject_id));
      if (coreq.coreqSubjectId !== undefined) candidates.push(parseInt(coreq.coreqSubjectId));
      if (coreq.prereq_subject_id !== undefined) candidates.push(parseInt(coreq.prereq_subject_id));
      if (coreq.requiredSubject?.subject_id !== undefined) candidates.push(parseInt(coreq.requiredSubject.subject_id));
      if (coreq.coreq_subject?.subject_id !== undefined) candidates.push(parseInt(coreq.coreq_subject.subject_id));

      const matches = candidates.some(c => !isNaN(c) && c === subjectIdInt);
      return matches;
    });
    
    // Only update if we found corequisites
    if (lookupCoreqsForSubject.length > 0) {
      setAvailableCorequisites(prev => {
        const updated = { ...prev, [subjectIdStr]: lookupCoreqsForSubject };
        return updated;
      });
      return lookupCoreqsForSubject;
    } else {
      setAvailableCorequisites(prev => ({ ...prev, [subjectIdStr]: [] }));
      return [];
    }
  };

  const handleAddRow = () => {
    setSubjectRows([...subjectRows, {
      subject_id: '',
      elective_slot_id: '',
      is_elective_slot: false,
      passing_grade: '',
      custom_grade: '',
      subject_type: '',
      requisite_id: '',
    }]);
  };

  const handleRemoveRow = (index) => {
    if (subjectRows.length > 1) {
      const newRows = subjectRows.filter((_, i) => i !== index);
      setSubjectRows(newRows);
    }
  };

  const handleRowChange = async (index, field, value) => {
    const newRows = [...subjectRows];
    newRows[index][field] = value;
    
    // If is_elective_slot is toggled, clear the other field
    if (field === 'is_elective_slot') {
      if (value) {
        // Switching to elective slot - clear subject_id and set subject_type
        newRows[index].subject_id = '';
        newRows[index].subject_type = 'elective subject';
      } else {
        // Switching to regular subject - clear elective_slot_id
        newRows[index].elective_slot_id = '';
      }
    }
    
    // If elective_slot_id is selected, automatically set subject_type to elective
    if (field === 'elective_slot_id' && value) {
      newRows[index].subject_type = 'elective subject';
      newRows[index].is_elective_slot = true;
    }
    
    // If subject changed: default passing grade 50, ITE→core / GEN→GE (minor), auto prereq/coreq when loaded
    if (field === 'subject_id') {
      if (value) {
        newRows[index].requisite_id = '';
        newRows[index].passing_grade = '50';
        newRows[index].custom_grade = '';
        const sub = safeLookupData.subjects.find(
          (s) => s && s.subject_id != null && String(s.subject_id) === String(value),
        );
        newRows[index].subject_type = defaultSubjectTypeFromSubjectCode(sub?.subject_code);
        const subjectChosen = value;
        setSubjectRows(newRows);
        try {
          const prereqs = await fetchPrerequisitesForSubject(subjectChosen);
          const coreqs = await fetchCorequisitesForSubject(subjectChosen);
          const rid = pickDefaultRequisiteId(prereqs, coreqs);
          setSubjectRows((prev) => {
            const copy = [...prev];
            if (copy[index]?.subject_id?.toString() !== String(subjectChosen)) return prev;
            copy[index] = { ...copy[index], requisite_id: rid };
            return copy;
          });
        } catch (err) {
          // ignore - fetch functions already log errors
        }
        return;
      }
      newRows[index].requisite_id = '';
      newRows[index].passing_grade = '';
      newRows[index].custom_grade = '';
      newRows[index].subject_type = '';
    }

    setSubjectRows(newRows);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate bulk form data
    if (!bulkFormData.program_id || !bulkFormData.year_level || !bulkFormData.semester_id) {
      const msg = 'Please fill in Program, Year Level, and Semester';
      setError(msg);
      await swalError('Missing fields', msg);
      return;
    }

    // Filter out empty rows (rows without subject_id or elective_slot_id)
    const validRows = subjectRows.filter(row => row.subject_id || row.elective_slot_id);

    if (validRows.length === 0) {
      const msg = 'Please add at least one subject or elective slot';
      setError(msg);
      await swalError('Nothing to save', msg);
      return;
    }

    try {
      // Prepare subjects data
      const subjectsData = validRows.map(row => {
        let finalPassingGrade = row.passing_grade;
        
        // If passing_grade is 'other', use the custom_grade value
        if (row.passing_grade === 'other' && row.custom_grade) {
          finalPassingGrade = row.custom_grade;
        }
        
        // Convert passing_grade to integer if it's a numeric string, otherwise set to null
        // Backend expects integer or null, not strings like "pass" or "failed"
        if (finalPassingGrade) {
          const numericGrade = parseInt(finalPassingGrade, 10);
          finalPassingGrade = isNaN(numericGrade) ? null : numericGrade;
        } else {
          finalPassingGrade = null;
        }
        
        return {
          subject_id: row.is_elective_slot ? null : (row.subject_id ? parseInt(row.subject_id, 10) : null),
          elective_slot_id: row.is_elective_slot ? (row.elective_slot_id ? parseInt(row.elective_slot_id, 10) : null) : null,
          passing_grade: finalPassingGrade,
          subject_type: row.subject_type || null,
          requisite_id: row.requisite_id ? parseInt(row.requisite_id, 10) : null,
        };
      });
      
      // Log the data being sent for debugging
      console.log('Sending curriculum data:', {
        program_id: bulkFormData.program_id,
        year_level: bulkFormData.year_level,
        semester_id: bulkFormData.semester_id,
        subjects: subjectsData
      });
      
      // Batch create all curriculum entries at once
      const response = await api.post('/curriculum/batch', {
        program_id: parseInt(bulkFormData.program_id, 10),
        year_level: parseInt(bulkFormData.year_level, 10),
        semester_id: parseInt(bulkFormData.semester_id, 10),
        subjects: subjectsData
      });

      setShowModal(false);
      resetBulkForm();
      fetchCurricula();
      fetchLookupData(); // Refresh lookup data to include any new requisites
      swalToast('success', 'Curriculum saved');
    } catch (error) {
      console.error('Error saving curriculum:', error);
      console.error('Error response:', error.response?.data);
      
      // Extract detailed error messages
      let errorMessage = 'Failed to save curriculum';
      if (error.response?.data) {
        if (error.response.data.errors) {
          // Validation errors
          const errorMessages = Object.values(error.response.data.errors).flat();
          errorMessage = errorMessages.join(', ') || errorMessage;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      setError(errorMessage);
      await swalError('Save failed', errorMessage);
    }
  };

  const resetBulkForm = () => {
    setBulkFormData({
      program_id: '',
      year_level: '',
      semester_id: '',
    });
    setSubjectRows([{
      subject_id: '',
      elective_slot_id: '',
      is_elective_slot: false,
      passing_grade: '',
      custom_grade: '',
      subject_type: '',
      requisite_id: '',
    }]);
    setError('');
  };

  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const baseCurriculum = editingCurriculum || selectedCurriculum;
    if (!baseCurriculum) return;

    try {
      const row = subjectRows[0] || {};
      let finalPassingGrade = row.passing_grade;
      
      // If passing_grade is 'other', use the custom_grade value
      if (row.passing_grade === 'other' && row.custom_grade) {
        finalPassingGrade = row.custom_grade;
      }

      const desiredProgramId = bulkFormData.program_id || baseCurriculum.program_id;
      const desiredYearLevelId = normalizeYearLevelId(
        bulkFormData.year_level || baseCurriculum.year_level
      );
      const desiredSemesterId = bulkFormData.semester_id || baseCurriculum.semester_id;
      const isElectiveSlot = row.is_elective_slot || !!baseCurriculum.elective_slot_id;
      const desiredSubjectId = isElectiveSlot ? null : (row.subject_id || baseCurriculum.subject_id);
      const desiredElectiveSlotId = isElectiveSlot ? (row.elective_slot_id || baseCurriculum.elective_slot_id) : null;

      const resolvedCurriculumToUpdate = Array.isArray(curricula)
        ? (curricula.find(c =>
            c &&
            c.program_id?.toString() === desiredProgramId?.toString() &&
            normalizeYearLevelId(c.year_level) === desiredYearLevelId &&
            c.semester_id?.toString() === desiredSemesterId?.toString() &&
            (isElectiveSlot 
              ? c.elective_slot_id?.toString() === desiredElectiveSlotId?.toString()
              : c.subject_id?.toString() === desiredSubjectId?.toString())
          ) || baseCurriculum)
        : baseCurriculum;

      await api.put(`/curriculum/${resolvedCurriculumToUpdate.curriculum_id}`, {
        program_id: parseInt(desiredProgramId, 10),
        year_level: parseInt(desiredYearLevelId, 10),
        semester_id: parseInt(desiredSemesterId, 10),
        subject_id: desiredSubjectId,
        elective_slot_id: desiredElectiveSlotId,
        passing_grade: finalPassingGrade ? finalPassingGrade : (resolvedCurriculumToUpdate.passing_grade || null),
        subject_type: row.subject_type || resolvedCurriculumToUpdate.subject_type || (isElectiveSlot ? 'elective subject' : null),
        requisite_id: row.requisite_id || resolvedCurriculumToUpdate.requisite_id || null,
      });
      setShowModal(false);
      setShowEditPanel(false);
      setEditingCurriculum(null);
      setSelectedCurriculum(null);
      resetBulkForm();
      fetchCurricula();
      fetchLookupData(); 
      swalToast('success', 'Curriculum updated');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update curriculum';
      setError(msg);
      await swalError('Update failed', msg);
    }
  };

  const handleDelete = async (id, options = {}) => {
    const { confirmText, title = 'Delete curriculum entry?' } = options;
    const ok = await swalConfirm({
      title,
      text: confirmText || 'Are you sure you want to delete this curriculum entry?',
      confirmButtonText: 'Delete',
    });
    if (!ok) return false;

    try {
      await api.delete(`/curriculum/${id}`);
      fetchCurricula();
      swalToast('success', 'Curriculum entry deleted');
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to delete curriculum';
      setError(msg);
      await swalError('Could not delete', msg);
      return false;
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCurriculum(null);
    resetBulkForm();
  };

  const getSubjectDetails = (subjectId) => {
    if (!safeLookupData.subjects || !Array.isArray(safeLookupData.subjects)) {
      return null;
    }
    return safeLookupData.subjects.find(s => s && s.subject_id && s.subject_id.toString() === subjectId.toString());
  };

  const handleCorequisiteSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!corequisiteForm.subject_id || !corequisiteForm.coreq_subject_id) {
      setError('Both subjects are required for co-requisite');
      return;
    }

    if (corequisiteForm.subject_id === corequisiteForm.coreq_subject_id) {
      setError('A subject cannot be a co-requisite of itself');
      return;
    }

    try {
      await api.post('/corequisites', corequisiteForm);
      setShowCorequisiteModal(false);
      setCorequisiteForm({ subject_id: '', coreq_subject_id: '' });
      fetchLookupData(); 
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create co-requisite');
    }
  };

  const handleCloseCorequisiteModal = () => {
    setShowCorequisiteModal(false);
    setCorequisiteForm({ subject_id: '', coreq_subject_id: '' });
    setError('');
  };

  // Group curricula by program and year level, then organize semesters side-by-side
  const groupCurriculaByProgramYear = () => {
    if (!Array.isArray(curricula) || curricula.length === 0) {
      return [];
    }
    
    const filtered = curricula.filter(
      curriculum => curriculum && (!filterProgram || curriculum.program_id?.toString() === filterProgram)
    );

    const grouped = {};
    
    filtered.forEach(curriculum => {
      if (!curriculum) return;
      
      const programId = curriculum.program_id;
      const programName = curriculum.program?.program_name || curriculum.program?.program_code || 'Unknown Program';

      const curriculumHeaderId =
        curriculum.curriculum_header_id ||
        curriculum.curriculumHeader?.curriculum_header_id ||
        null;

      const inferredHeader = (!curriculumHeaderId && safeLookupData.curriculumHeaders.length)
        ? safeLookupData.curriculumHeaders
            .filter(h => (h?.program_id ?? h?.program?.program_id)?.toString() === programId?.toString())
            .sort((a, b) => {
              const ay = parseInt(a?.Effective_Year ?? a?.effective_year ?? 0);
              const by = parseInt(b?.Effective_Year ?? b?.effective_year ?? 0);
              return by - ay;
            })[0]
        : null;

      const resolvedHeaderId = curriculumHeaderId || inferredHeader?.curriculum_header_id || null;

      const header = resolvedHeaderId
        ? safeLookupData.curriculumHeaders.find(
            h => (h?.curriculum_header_id ?? h?.id)?.toString() === resolvedHeaderId.toString()
          ) || inferredHeader
        : inferredHeader;

      const headerProgramName =
        header?.program?.program_name ||
        header?.program?.program_code ||
        programName;

      const headerDescription = (header?.description || '').toString().trim();
      const headerEffectiveYear = header?.Effective_Year || header?.effective_year || null;

      const yearLevelId = curriculum.year_level?.year_level_id || curriculum.year_level;
      let yearLevelName = curriculum.year_level?.year_level;
      if (!yearLevelName && yearLevelId && safeLookupData.yearLevels) {
        const yearLevel = safeLookupData.yearLevels.find(yl => yl.year_level_id === parseInt(yearLevelId));
        yearLevelName = yearLevel?.year_level;
      }
      yearLevelName = yearLevelName || `Year ${yearLevelId}`;
      
      const semesterId = curriculum.semester_id;
      let semesterName = curriculum.semester?.semester_name;
      if (!semesterName && semesterId && safeLookupData.semesters) {
        const semester = safeLookupData.semesters.find(s => s.semester_id === parseInt(semesterId));
        semesterName = semester?.semester_name;
      }
      semesterName = semesterName || `Semester ${semesterId}`;
      
      const key = `${resolvedHeaderId || programId}-${yearLevelId}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          programId,
          programName: headerProgramName,
          curriculumHeaderId: resolvedHeaderId,
          curriculumHeaderDescription: headerDescription,
          curriculumHeaderEffectiveYear: headerEffectiveYear,
          yearLevelId,
          yearLevelName,
          semesters: {}
        };
      }
      
      if (!grouped[key].semesters[semesterId]) {
        grouped[key].semesters[semesterId] = {
          semesterId,
          semesterName,
          curricula: []
        };
      }
      
      grouped[key].semesters[semesterId].curricula.push(curriculum);
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.programName !== b.programName) {
        return a.programName.localeCompare(b.programName);
      }
      return a.yearLevelName.localeCompare(b.yearLevelName);
    });
  };

  const groupedCurricula = Array.isArray(curricula) ? groupCurriculaByProgramYear() : [];

  const yearLevelTotalPages = groupedCurricula.length;
  const yearLevelSafePage =
    yearLevelTotalPages > 0
      ? Math.min(Math.max(1, yearLevelPage), yearLevelTotalPages)
      : 1;
  const pagedYearGroups =
    yearLevelTotalPages > 0
      ? groupedCurricula.slice(yearLevelSafePage - 1, yearLevelSafePage)
      : [];

  const getCurriculumRequisiteDisplay = (curriculum) => {
    if (!curriculum) return '-';

    // Case 1: curriculum has loaded requisite relationship (now an array from hasMany)
    const req = curriculum.requisite;
    if (req) {
      // Handle array of requisites (new hasMany relationship)
      if (Array.isArray(req) && req.length > 0) {
        const labels = req.map(r => {
          const required = r?.requiredSubject || r?.required_subject || null;
          if (required?.subject_code) {
            const typeHint = (r?.requisite_type || r?.type || '').toString().toLowerCase();
            const prefix = typeHint === 'prerequisite' ? 'P:' : (typeHint === 'corequisite' ? 'Co:' : 'REQ:');
            return `${prefix} ${required.subject_code}`;
          }
          // Fallback: try to resolve from lookup data
          const resolved = resolveRequisiteLabel(r);
          return resolved?.label !== '-' ? resolved.label : null;
        }).filter(Boolean);
        
        if (labels.length > 0) {
          return labels.join(', ');
        }
      }
      // Handle single object (backward compatibility)
      else if (!Array.isArray(req)) {
        const required = req?.requiredSubject || req?.required_subject || null;
        if (required?.subject_code) {
          const typeHint = (req?.requisite_type || req?.type || '').toString().toLowerCase();
          const prefix = typeHint === 'prerequisite' ? 'P:' : (typeHint === 'corequisite' ? 'Co:' : 'REQ:');
          return `${prefix} ${required.subject_code}`;
        }
      }
    }

    const combinedLookup = (Array.isArray(safeLookupData.requisites) && safeLookupData.requisites.length)
      ? safeLookupData.requisites
      : [
          ...(Array.isArray(safeLookupData.prerequisites) ? safeLookupData.prerequisites : []),
          ...(Array.isArray(safeLookupData.corequisites) ? safeLookupData.corequisites : [])
        ];

    // Case 2: curriculum row stores a specific requisite id
    if (curriculum.requisite_id) {
      const found = combinedLookup.find(
        r => (r?.requisite_id || r?.prerequisite_id || r?.corequisite_id || r?.requisites_id) === parseInt(curriculum.requisite_id)
      );
      const resolved = resolveRequisiteLabel(found || {});
      return resolved?.label || '-';
    }

    // Case 3: Look up requisites by subject_id for this curriculum's subject
    if (curriculum.subject_id) {
      const subjectRequisites = combinedLookup.filter(
        r => r?.subject_id?.toString() === curriculum.subject_id.toString()
      );
      if (subjectRequisites.length > 0) {
        const labels = subjectRequisites.map(r => resolveRequisiteLabel(r).label).filter(l => l !== '-');
        if (labels.length > 0) {
          return labels.join(', ');
        }
      }
    }

    return '-';
  };

  const schoolName = 'Cagayan de Oro College';
  const defaultBasisLine = 'Based on CMO No. 25 Series of 2015';

  const formatEffectiveSY = (effectiveYear) => {
    const y = parseInt(effectiveYear);
    if (!y || Number.isNaN(y)) return '';
    return `Effective SY ${y}-${y + 1}`;
  };

  const buildCurriculumHeaderModel = (yearGroup) => {
    const desc = (yearGroup?.curriculumHeaderDescription || '').toString().trim();
    const effectiveLine = formatEffectiveSY(yearGroup?.curriculumHeaderEffectiveYear);
    const programLine = `${(yearGroup?.programName || 'Unknown Program').toString()} Curriculum`;
    const basisLine = desc || defaultBasisLine;

    return {
      schoolName,
      programLine,
      effectiveLine,
      basisLine,
    };
  };

  if (loading) {
    return <div className="loading">Loading curriculum...</div>;
  }

  return (
    <div className="curriculum-management">
      <div className="management-header">
        <h2>Curriculum Management</h2>
        {canMutateCurriculum && (
          <button className="add-button" onClick={() => {
            resetBulkForm();
            setShowModal(true);
          }}>
            Add Curriculum
          </button>
        )}
      </div>

      {!canMutateCurriculum && (
        <div className="curriculum-view-only-banner" role="status">
          View only — you can browse programs and subjects. Assign curriculum create/edit/delete or the
          &quot;Curriculum Management&quot; permission for full access.
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {/* Filter by Program */}
      <div className="filter-section">
        <label htmlFor="program-filter">Filter by Program: </label>
        <SearchableSelect
          id="program-filter"
          value={filterProgram}
          onChange={setFilterProgram}
          options={programSearchOptions}
          emptyLabel="All Programs"
          placeholder="Search programs…"
          className="filter-select curriculum-search-select"
        />
      </div>

      {/* Display one year-level group at a time when multiple exist */}
      {Array.isArray(groupedCurricula) && groupedCurricula.length > 0 ? (
        <>
          {yearLevelTotalPages > 1 && (
            <nav className="curriculum-pagination curriculum-year-pagination" aria-label="Year level pages">
              <div className="curriculum-year-pagination__pills" role="tablist" aria-label="Year levels">
                {groupedCurricula.map((yg, idx) => {
                  const pageNum = idx + 1;
                  const isActive = pageNum === yearLevelSafePage;
                  const yearLabel = yearLevelPillLabel(yg.yearLevelId, yg.yearLevelName);
                  const programName = (yg.programName || '').trim();
                  const tabId = `curriculum-year-tab-${idx}`;
                  return (
                    <button
                      key={`${yg.curriculumHeaderId || yg.programId}-${yg.yearLevelId}-${idx}`}
                      type="button"
                      id={tabId}
                      role="tab"
                      aria-selected={isActive}
                      className={`curriculum-year-pagination__pill${isActive ? ' is-active' : ''}`}
                      onClick={() => setYearLevelPage(pageNum)}
                      title={programName ? `${yearLabel} · ${programName}` : yearLabel}
                    >
                      {yearLabel}
                    </button>
                  );
                })}
              </div>
            </nav>
          )}
          {pagedYearGroups.map((yearGroup) => {
            if (!yearGroup || !yearGroup.semesters) return null;

            const semesterIds = Object.keys(yearGroup.semesters || {}).sort((a, b) => {
            const semA = yearGroup.semesters[a];
            const semB = yearGroup.semesters[b];
            if (!semA || !semB) return 0;
            return (semA.semesterName || '').localeCompare(semB.semesterName || '');
          });

            return (
            <div key={`${yearGroup.curriculumHeaderId || yearGroup.programId}-${yearGroup.yearLevelId}`} className="year-group">
              <div className="year-group-header">
                {(() => {
                  const hdr = buildCurriculumHeaderModel(yearGroup);
                  return (
                    <div className="curriculum-header-block">
                      <div className="curriculum-header-school">{hdr.schoolName}</div>
                      <div className="curriculum-header-program">{hdr.programLine}</div>
                      {hdr.effectiveLine ? (
                        <div className="curriculum-header-effective">{hdr.effectiveLine}</div>
                      ) : null}
                      {hdr.basisLine ? (
                        <div className="curriculum-header-basis">{hdr.basisLine}</div>
                      ) : null}
                    </div>
                  );
                })()}
                {canMutateCurriculum && (
                  <div className="year-group-actions">
                    <button
                      className="edit-group-button"
                      onClick={async () => {
                        const allCurricula = [];
                        Object.values(yearGroup.semesters).forEach(semester => {
                          allCurricula.push(...semester.curricula);
                        });
                        await fetchLookupData();
                        if (allCurricula.length > 0) {
                          setSelectedCurriculum(allCurricula[0]);
                          setBulkFormData({
                            program_id: yearGroup.programId?.toString() || '',
                            year_level: yearGroup.yearLevelId?.toString() || '',
                            semester_id: '',
                          });
                          setShowEditPanel(true);
                        }
                      }}
                      title="Edit this curriculum group"
                    >
                      Edit Group
                    </button>
                  </div>
                )}
              </div>
              <div className="semesters-stacked-container">
                {semesterIds.map((semesterId) => {
                  const semester = yearGroup.semesters[semesterId];
                  if (!semester || !Array.isArray(semester.curricula)) return null;

                  return (
                    <div key={semesterId} className="semester-section">
                      <div className="semester-section-header">
                        <h3>{(yearGroup.yearLevelName || 'Unknown Year').toUpperCase()} - {(semester.semesterName || 'Unknown Semester').toUpperCase()}</h3>
                        {canMutateCurriculum && (
                          <button
                            className="delete-semester-button"
                            onClick={async () => {
                              if (semester.curricula.length === 0) return;
                              const confirmMessage = `Are you sure you want to delete all subjects in:\n\nProgram: ${yearGroup.programName}\nYear Level: ${yearGroup.yearLevelName}\nSemester: ${semester.semesterName}\n\nThis will delete ${semester.curricula.length} subject(s).\n\nThis action cannot be undone!`;
                              const ok = await swalConfirm({
                                title: 'Delete entire semester?',
                                text: confirmMessage,
                                confirmButtonText: 'Delete all',
                              });
                              if (!ok) return;
                              try {
                                const deletePromises = semester.curricula.map(curriculum => 
                                  api.delete(`/curriculum/${curriculum.curriculum_id}`)
                                );
                                await Promise.all(deletePromises);
                                fetchCurricula();
                                swalToast('success', 'Semester subjects deleted');
                              } catch (error) {
                                const msg = error.response?.data?.message || 'Failed to delete semester curriculum';
                                setError(msg);
                                await swalError('Delete failed', msg);
                              }
                            }}
                            title="Delete all subjects in this semester"
                          >
                            Delete Semester
                          </button>
                        )}
                      </div>
                      <div className="table-container">
                        <div
                          className={`curriculum-data-grid curriculum-data-grid--scroll-table${canMutateCurriculum ? ' curriculum-data-grid--with-actions' : ''}`}
                          style={{ '--curriculum-data-cols': 7 }}
                          role="table"
                          aria-label="Curriculum subjects for this semester"
                        >
                          <div className="curriculum-data-grid__head" role="row">
                            {['Subject Code', 'Pre/Co-requisite', 'Description', 'Units', 'Hours', 'Passing Grade', 'Type'].map((label) => (
                              <div key={label} className="curriculum-data-grid__th" role="columnheader">
                                {label}
                              </div>
                            ))}
                            {canMutateCurriculum && (
                              <div className="curriculum-data-grid__th curriculum-data-grid__th--actions" role="columnheader">
                                Actions
                              </div>
                            )}
                          </div>
                          <div className="curriculum-data-grid__body" role="rowgroup">
                            {semester.curricula.length === 0 ? (
                              <div className="curriculum-data-grid__empty no-subjects" role="row">
                                <div role="cell">No subjects</div>
                              </div>
                            ) : (
                              semester.curricula.map((curriculum) => {
                                if (!curriculum) return null;
                                const subject = curriculum.subject;
                                const electiveSlot = curriculum.electiveSlot;
                                const isElectiveSlot = !!curriculum.elective_slot_id;
                                const preCoRequisiteDisplay = getCurriculumRequisiteDisplay(curriculum);

                                return (
                                  <div key={curriculum.curriculum_id} className="curriculum-data-grid__row" role="row">
                                    <div className="curriculum-data-grid__cell" role="cell">
                                      <span className="curriculum-data-grid__mobile-label">Subject Code</span>
                                      <span className="curriculum-data-grid__cell-value">
                                        {isElectiveSlot ? (
                                          <span style={{ fontWeight: 'bold', color: '#0066cc' }}>
                                            {electiveSlot?.slot_name || `Elective Slot #${curriculum.elective_slot_id}`}
                                          </span>
                                        ) : (
                                          subject?.subject_code || '-'
                                        )}
                                      </span>
                                    </div>
                                    <div className="curriculum-data-grid__cell" role="cell">
                                      <span className="curriculum-data-grid__mobile-label">Pre/Co-requisite</span>
                                      <span className="curriculum-data-grid__cell-value">{preCoRequisiteDisplay}</span>
                                    </div>
                                    <div className="curriculum-data-grid__cell" role="cell">
                                      <span className="curriculum-data-grid__mobile-label">Description</span>
                                      <span className="curriculum-data-grid__cell-value">
                                        {isElectiveSlot
                                          ? electiveSlotDescriptionLabel(
                                              electiveSlot?.slot_name,
                                              curriculum.elective_slot_id
                                            )
                                          : subject?.subject_name || '-'}
                                      </span>
                                    </div>
                                    <div className="curriculum-data-grid__cell" role="cell">
                                      <span className="curriculum-data-grid__mobile-label">Units</span>
                                      <span className="curriculum-data-grid__cell-value">
                                        {isElectiveSlot ? '-' : (subject?.number_of_units || '-')}
                                      </span>
                                    </div>
                                    <div className="curriculum-data-grid__cell" role="cell">
                                      <span className="curriculum-data-grid__mobile-label">Hours</span>
                                      <span className="curriculum-data-grid__cell-value">
                                        {isElectiveSlot ? '-' : (subject?.number_of_hrs || '-')}
                                      </span>
                                    </div>
                                    <div className="curriculum-data-grid__cell" role="cell">
                                      <span className="curriculum-data-grid__mobile-label">Passing Grade</span>
                                      <span className="curriculum-data-grid__cell-value">{curriculum.passing_grade || '-'}</span>
                                    </div>
                                    <div className="curriculum-data-grid__cell" role="cell">
                                      <span className="curriculum-data-grid__mobile-label">Type</span>
                                      <span className="curriculum-data-grid__cell-value">
                                        {isElectiveSlot ? (
                                          <span style={{ color: '#0066cc', fontWeight: 'bold' }}>Elective Subject</span>
                                        ) : (
                                          formatSubjectTypeForDisplay(curriculum.subject_type)
                                        )}
                                      </span>
                                    </div>
                                    {canMutateCurriculum && (
                                      <div className="curriculum-data-grid__cell curriculum-data-grid__cell--actions" role="cell">
                                        <span className="curriculum-data-grid__mobile-label">Actions</span>
                                        <div className="action-buttons">
                                          <button
                                            type="button"
                                            className="edit-button"
                                            onClick={async () => {
                                              setSelectedCurriculum(curriculum);
                                              setEditingCurriculum(curriculum);
                                              setBulkFormData({
                                                program_id: curriculum.program_id?.toString() || '',
                                                year_level: normalizeYearLevelId(curriculum.year_level),
                                                semester_id: curriculum.semester_id?.toString() || '',
                                              });
                                              setSubjectRows([{
                                                subject_id: curriculum.subject_id?.toString() || '',
                                                elective_slot_id: curriculum.elective_slot_id?.toString() || '',
                                                is_elective_slot: !!curriculum.elective_slot_id,
                                                passing_grade: curriculum.passing_grade?.toString() || '',
                                                subject_type: curriculum.subject_type || '',
                                                requisite_id: (curriculum.requisite_id ?? curriculum.prerequisite_id ?? curriculum.requisites_id)?.toString() || '',
                                              }]);
                                              if (curriculum.subject_id) {
                                                await fetchPrerequisitesForSubject(curriculum.subject_id);
                                              }
                                              setShowEditPanel(true);
                                            }}
                                            title="Edit this curriculum"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            className="delete-button"
                                            onClick={async () => {
                                              const displayName = isElectiveSlot
                                                ? (electiveSlot?.slot_name || `Elective Slot #${curriculum.elective_slot_id}`)
                                                : (subject?.subject_code || 'N/A');
                                              const confirmText = `${isElectiveSlot ? 'Elective Slot' : 'Subject'}: ${displayName}\nProgram: ${curriculum.program?.program_name || 'N/A'}\nYear: ${curriculum.yearLevel?.year_level || 'N/A'}\nSemester: ${curriculum.semester?.semester_name || 'N/A'}`;
                                              await handleDelete(curriculum.curriculum_id, {
                                                title: 'Delete curriculum entry?',
                                                confirmText,
                                              });
                                            }}
                                            title="Delete this curriculum"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </>
      ) : (
        <div className="no-data">
          {canMutateCurriculum
            ? 'No curriculum entries found. Click "Add Curriculum" to create one.'
            : 'No curriculum entries found.'}
        </div>
      )}


      {canMutateCurriculum && showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content bulk-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCurriculum ? 'Edit Curriculum' : 'Add Curriculum - Multiple Subjects'}</h3>
            </div>
            <div className="modal-form-container">
              <form onSubmit={editingCurriculum ? handleUpdate : handleBulkSubmit}>
              {/* Common fields for all subjects */}
              <div className="bulk-form-header">
                <div className="form-group form-group--program-search">
                  <label>Program <span className="required">*</span></label>
                  <SearchableSelect
                    value={bulkFormData.program_id ? String(bulkFormData.program_id) : ''}
                    onChange={(v) => setBulkFormData({ ...bulkFormData, program_id: v })}
                    options={programSearchOptions}
                    emptyLabel="Select Program"
                    placeholder="Search programs…"
                    required
                    disabled={!!editingCurriculum}
                    className="subject-select curriculum-search-select"
                  />
                </div>
                <div className="form-group">
                  <label>Year Level <span className="required">*</span></label>
                  <select
                    value={bulkFormData.year_level}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, year_level: e.target.value })}
                    required
                    disabled={!!editingCurriculum}
                    className="subject-select"
                  >
                    <option value="">Select Year Level</option>
                    {safeLookupData.yearLevels.map((level) => (
                      <option key={level.year_level_id} value={level.year_level_id}>
                        {level.year_level}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester <span className="required">*</span></label>
                  <select
                    value={bulkFormData.semester_id}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, semester_id: e.target.value })}
                    required
                    disabled={!!editingCurriculum}
                    className="subject-select"
                  >
                    <option value="">Select Semester</option>
                    {safeLookupData.semesters.map((semester) => (
                      <option key={semester.semester_id} value={semester.semester_id}>
                        {semester.semester_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject rows (responsive div grid) */}
              <div className="subjects-table-container">
                <div
                  className="curriculum-data-grid curriculum-data-grid--with-actions curriculum-subjects-form-grid"
                  style={{ '--curriculum-data-cols': 8 }}
                  role="table"
                  aria-label="Subjects to add or edit"
                >
                  <div className="curriculum-data-grid__head" role="row">
                    {['Is Elective', 'Course Code / Elective Slot', 'Subject Title', 'Units', 'Hours', 'Passing Grade', 'Type', 'Pre/Co-requisite'].map((label) => (
                      <div key={label} className="curriculum-data-grid__th" role="columnheader">
                        {label}
                      </div>
                    ))}
                    <div className="curriculum-data-grid__th curriculum-data-grid__th--actions" role="columnheader">
                      Actions
                    </div>
                  </div>
                  <div className="curriculum-data-grid__body" role="rowgroup">
                    {subjectRows.map((row, index) => {
                      const selectedSubject = getSubjectDetails(row.subject_id);
                      
                      // Filter elective slots based on selected program, year level, and semester
                      const filteredElectiveSlots = safeLookupData.electiveSlots.filter(slot => {
                        if (!bulkFormData.program_id || !bulkFormData.year_level || !bulkFormData.semester_id) {
                          return false;
                        }
                        return (
                          slot.program_id?.toString() === bulkFormData.program_id.toString() &&
                          slot.year_level_id?.toString() === bulkFormData.year_level.toString() &&
                          slot.semester_id?.toString() === bulkFormData.semester_id.toString()
                        );
                      });
                      
                      return (
                        <div key={index} className="curriculum-data-grid__row" role="row">
                          <div className="curriculum-data-grid__cell" role="cell">
                            <span className="curriculum-data-grid__mobile-label">Is Elective</span>
                            <div className="curriculum-data-grid__cell-value">
                              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={row.is_elective_slot || false}
                                  onChange={(e) => handleRowChange(index, 'is_elective_slot', e.target.checked)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '12px' }}>Elective</span>
                              </label>
                            </div>
                          </div>
                          <div className="curriculum-data-grid__cell" role="cell">
                            <span className="curriculum-data-grid__mobile-label">Course Code / Elective Slot</span>
                            <div className="curriculum-data-grid__cell-value">
                            {row.is_elective_slot ? (
                              <SearchableSelect
                                value={row.elective_slot_id != null && row.elective_slot_id !== '' ? String(row.elective_slot_id) : ''}
                                onChange={(v) => void handleRowChange(index, 'elective_slot_id', v)}
                                options={bulkElectiveSlotSearchOptions}
                                emptyLabel={
                                  bulkFormData.program_id && bulkFormData.year_level && bulkFormData.semester_id
                                    ? 'No elective slots available'
                                    : 'Select Program, Year Level, and Semester first'
                                }
                                placeholder="Search elective slots…"
                                disabled={bulkElectiveSlotSearchOptions.length === 0}
                                required={index === 0 && row.is_elective_slot}
                                className="subject-select curriculum-search-select curriculum-search-select--course-col"
                              />
                            ) : (
                              <SearchableSelect
                                value={row.subject_id != null && row.subject_id !== '' ? String(row.subject_id) : ''}
                                onChange={(v) => void handleRowChange(index, 'subject_id', v)}
                                options={subjectSearchOptions}
                                emptyLabel="Select subject (search by code or title)"
                                placeholder="Search subjects…"
                                required={index === 0 && !row.is_elective_slot}
                                className="subject-select curriculum-search-select curriculum-search-select--course-col"
                              />
                            )}
                            </div>
                          </div>
                          <div className="curriculum-data-grid__cell" role="cell">
                            <span className="curriculum-data-grid__mobile-label">Subject Title</span>
                            <div className="curriculum-data-grid__cell-value">
                            {row.is_elective_slot ? (
                              (() => {
                                const selectedSlot = filteredElectiveSlots.find(s => s.elective_slot_id?.toString() === row.elective_slot_id?.toString());
                                const label = electiveSlotDescriptionLabel(selectedSlot?.slot_name, row.elective_slot_id);
                                return (
                                  <input
                                    type="text"
                                    value={label}
                                    readOnly
                                    className="subject-name-readonly"
                                    placeholder="Elective"
                                  />
                                );
                              })()
                            ) : (
                              <input
                                type="text"
                                value={selectedSubject?.subject_name || ''}
                                readOnly
                                className="subject-name-readonly"
                                placeholder="Auto-filled"
                              />
                            )}
                            </div>
                          </div>
                          <div className="curriculum-data-grid__cell" role="cell">
                            <span className="curriculum-data-grid__mobile-label">Units</span>
                            <div className="curriculum-data-grid__cell-value">
                            {row.is_elective_slot ? (
                              <input
                                type="text"
                                value="-"
                                readOnly
                                className="units-hours-input"
                                placeholder="N/A"
                              />
                            ) : (
                              <input
                                type="number"
                                value={selectedSubject?.number_of_units || ''}
                                readOnly
                                className="units-hours-input"
                                placeholder="Auto-filled"
                              />
                            )}
                            </div>
                          </div>
                          <div className="curriculum-data-grid__cell" role="cell">
                            <span className="curriculum-data-grid__mobile-label">Hours</span>
                            <div className="curriculum-data-grid__cell-value">
                            {row.is_elective_slot ? (
                              <input
                                type="text"
                                value="-"
                                readOnly
                                className="units-hours-input"
                                placeholder="N/A"
                              />
                            ) : (
                              <input
                                type="number"
                                value={selectedSubject?.number_of_hrs || ''}
                                readOnly
                                className="units-hours-input"
                                placeholder="Auto-filled"
                              />
                            )}
                            </div>
                          </div>
                          <div className="curriculum-data-grid__cell" role="cell">
                            <span className="curriculum-data-grid__mobile-label">Passing Grade</span>
                            <div className="curriculum-data-grid__cell-value">
                            <select
                              value={row.passing_grade || ''}
                              onChange={(e) => handleRowChange(index, 'passing_grade', e.target.value)}
                              className="subject-select"
                            >
                              <option value="">Select Grade</option>
                              <option value="50">50</option>
                              <option value="60">60</option>
                              <option value="70">70</option>
                              <option value="pass">Pass</option>
                              <option value="failed">Failed</option>
                              <option value="other">Other (specify)</option>
                            </select>
                            {row.passing_grade === 'other' && (
                              <input
                                type="text"
                                value={row.custom_grade || ''}
                                onChange={(e) => handleRowChange(index, 'custom_grade', e.target.value)}
                                placeholder="Enter grade"
                                className="subject-select"
                                style={{ marginTop: '4px' }}
                              />
                            )}
                            </div>
                          </div>
                          <div className="curriculum-data-grid__cell" role="cell">
                            <span className="curriculum-data-grid__mobile-label">Type</span>
                            <div className="curriculum-data-grid__cell-value">
                            <select
                              value={row.subject_type}
                              onChange={(e) => handleRowChange(index, 'subject_type', e.target.value)}
                              className="subject-select"
                              disabled={row.is_elective_slot}
                            >
                              <option value="">Select Type</option>
                              <option value="minor">GE</option>
                              <option value="core">Core</option>
                              <option value="elective subject">Elective Subject</option>
                            </select>
                            {row.is_elective_slot && (
                              <span style={{ fontSize: '10px', color: '#666', display: 'block', marginTop: '2px' }}>
                                Auto-set to Elective
                              </span>
                            )}
                            </div>
                          </div>
                          <div className="curriculum-data-grid__cell" role="cell">
                            <span className="curriculum-data-grid__mobile-label">Pre/Co-requisite</span>
                            <div className="curriculum-data-grid__cell-value">
                            <select
                              value={row.requisite_id}
                              onChange={(e) => handleRowChange(index, 'requisite_id', e.target.value)}
                              className="subject-select"
                            >
                              <option value="">None</option>
                              {getRequisiteOptionsForBulkRow(row).map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            </div>
                          </div>
                          <div className="curriculum-data-grid__cell curriculum-data-grid__cell--actions" role="cell">
                            <span className="curriculum-data-grid__mobile-label">Actions</span>
                            <div className="curriculum-data-grid__cell-value">
                              <button
                                type="button"
                                className="remove-row-button"
                                onClick={() => handleRemoveRow(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {!editingCurriculum && (
                  <button
                    type="button"
                    className="add-row-button"
                    onClick={handleAddRow}
                  >
                    + Add Subject Row
                  </button>
                )}
              </div>
              </form>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={handleCloseModal}>
                Cancel
              </button>
              <button type="submit" onClick={editingCurriculum ? handleUpdate : handleBulkSubmit}>
                {editingCurriculum ? 'Update' : 'Save All Subjects'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Panel - Right Side */}
      {canMutateCurriculum && showEditPanel && (
        <div className="edit-panel-overlay" onClick={() => setShowEditPanel(false)}>
          <div className="edit-panel" onClick={(e) => e.stopPropagation()}>
            <div className="edit-panel-header">
              <h3>Edit Curriculum</h3>
              <button className="close-panel-button" onClick={() => {
                setShowEditPanel(false);
                setSelectedCurriculum(null);
              }}>
                ×
              </button>
            </div>
            
            <div className="edit-panel-content">
              {selectedCurriculum ? (
                <div className="edit-single-curriculum">
                  <h4>Edit Selected Subject</h4>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    await handleUpdate(e);
                    setShowEditPanel(false);
                    setSelectedCurriculum(null);
                  }}>
                    <div className="form-group form-group--program-search">
                      <label>Program <span className="required">*</span></label>
                      <SearchableSelect
                        value={
                          bulkFormData.program_id || selectedCurriculum.program_id
                            ? String(bulkFormData.program_id || selectedCurriculum.program_id)
                            : ''
                        }
                        onChange={(v) => setBulkFormData({ ...bulkFormData, program_id: v })}
                        options={programSearchOptions}
                        emptyLabel="Select Program"
                        placeholder="Search programs…"
                        required
                        className="subject-select curriculum-search-select"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Year Level <span className="required">*</span></label>
                      <select
                        value={bulkFormData.year_level || normalizeYearLevelId(selectedCurriculum.year_level)}
                        onChange={(e) => setBulkFormData({ ...bulkFormData, year_level: e.target.value })}
                        required
                        className="subject-select"
                      >
                        <option value="">Select Year Level</option>
                        {safeLookupData.yearLevels.map((level) => (
                          <option key={level.year_level_id} value={level.year_level_id}>
                            {level.year_level}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Semester <span className="required">*</span></label>
                      <select
                        value={bulkFormData.semester_id || selectedCurriculum.semester_id}
                        onChange={(e) => setBulkFormData({ ...bulkFormData, semester_id: e.target.value })}
                        required
                        className="subject-select"
                      >
                        <option value="">Select Semester</option>
                        {safeLookupData.semesters.map((semester) => (
                          <option key={semester.semester_id} value={semester.semester_id}>
                            {semester.semester_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={subjectRows[0]?.is_elective_slot || !!selectedCurriculum.elective_slot_id || false}
                          onChange={(e) => {
                            const newRows = [{ ...subjectRows[0], is_elective_slot: e.target.checked }];
                            if (e.target.checked) {
                              newRows[0].subject_id = '';
                              newRows[0].subject_type = 'elective subject';
                            } else {
                              newRows[0].elective_slot_id = '';
                            }
                            setSubjectRows(newRows);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>Is Elective Slot</span>
                      </label>
                    </div>
                    
                    {subjectRows[0]?.is_elective_slot || selectedCurriculum.elective_slot_id ? (
                      <div className="form-group">
                        <label>Elective Slot <span className="required">*</span></label>
                        <SearchableSelect
                          value={String(subjectRows[0]?.elective_slot_id || selectedCurriculum.elective_slot_id || '')}
                          onChange={(v) => {
                            const newRows = [{ ...subjectRows[0], elective_slot_id: v, subject_type: 'elective subject' }];
                            setSubjectRows(newRows);
                          }}
                          options={editElectiveSlotSearchOptions}
                          emptyLabel="Select Elective Slot"
                          placeholder="Search elective slots…"
                          required
                          className="subject-select curriculum-search-select"
                        />
                      </div>
                    ) : (
                      <div className="form-group">
                        <label>Subject <span className="required">*</span></label>
                        <SearchableSelect
                          value={String(subjectRows[0]?.subject_id || selectedCurriculum.subject_id || '')}
                          onChange={(v) => {
                            const next = {
                              ...subjectRows[0],
                              subject_id: v,
                              requisite_id: '',
                            };
                            if (v) {
                              next.passing_grade = '50';
                              next.custom_grade = '';
                              const sub = safeLookupData.subjects.find(
                                (s) =>
                                  s &&
                                  s.subject_id != null &&
                                  String(s.subject_id) === String(v),
                              );
                              next.subject_type = defaultSubjectTypeFromSubjectCode(sub?.subject_code);
                              setSubjectRows([next]);
                              const subjectChosen = v;
                              void (async () => {
                                try {
                                  const prereqs = await fetchPrerequisitesForSubject(subjectChosen);
                                  const coreqs = await fetchCorequisitesForSubject(subjectChosen);
                                  const rid = pickDefaultRequisiteId(prereqs, coreqs);
                                  setSubjectRows((prev) => {
                                    const cur = prev[0];
                                    if (!cur || cur.subject_id?.toString() !== String(subjectChosen)) {
                                      return prev;
                                    }
                                    return [{ ...cur, requisite_id: rid }];
                                  });
                                } catch {
                                  /* fetch helpers already log */
                                }
                              })();
                            } else {
                              next.passing_grade = '';
                              next.custom_grade = '';
                              next.subject_type = '';
                              setSubjectRows([next]);
                            }
                          }}
                          options={subjectSearchOptions}
                          emptyLabel="Select subject (search by code or title)"
                          placeholder="Search subjects…"
                          required
                          className="subject-select curriculum-search-select"
                        />
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label>Passing Grade</label>
                      <div className="passing-grade-container">
                        <select
                          value={subjectRows[0]?.passing_grade || selectedCurriculum.passing_grade || ''}
                          onChange={(e) => {
                            const newRows = [{ ...subjectRows[0], passing_grade: e.target.value }];
                            setSubjectRows(newRows);
                          }}
                          className="subject-select"
                        >
                          <option value="">Select Grade</option>
                          <option value="50">50</option>
                          <option value="60">60</option>
                          <option value="70">70</option>
                          <option value="pass">Pass</option>
                          <option value="failed">Failed</option>
                          <option value="other">Other (specify)</option>
                        </select>
                        {(subjectRows[0]?.passing_grade === 'other' || selectedCurriculum?.passing_grade === 'other') && (
                          <input
                            type="text"
                            value={subjectRows[0]?.custom_grade || selectedCurriculum?.custom_grade || ''}
                            onChange={(e) => {
                              const newRows = [{ ...subjectRows[0], custom_grade: e.target.value }];
                              setSubjectRows(newRows);
                            }}
                            placeholder="Enter grade"
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Type</label>
                      <select
                        value={subjectRows[0]?.subject_type || selectedCurriculum.subject_type || ''}
                        onChange={(e) => {
                          const newRows = [{ ...subjectRows[0], subject_type: e.target.value }];
                          setSubjectRows(newRows);
                        }}
                        className="subject-select"
                        disabled={
                          !!subjectRows[0]?.is_elective_slot || !!selectedCurriculum.elective_slot_id
                        }
                      >
                        <option value="">Select Type</option>
                        <option value="minor">GE</option>
                        <option value="core">Core</option>
                        <option value="elective subject">Elective Subject</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Pre/Co-requisite</label>
                      <select
                        value={subjectRows[0]?.requisite_id || selectedCurriculum.requisite_id || ''}
                        onChange={(e) => {
                          const newRows = [{ ...subjectRows[0], requisite_id: e.target.value }];
                          setSubjectRows(newRows);
                        }}
                        className="subject-select"
                      >
                        <option value="">None</option>
                        {getRequisiteOptionsForEdit().map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="edit-panel-actions">
                      <button
                        type="button"
                        className="delete-button"
                        onClick={async () => {
                          const deleted = await handleDelete(selectedCurriculum.curriculum_id);
                          if (deleted) {
                            setShowEditPanel(false);
                            setSelectedCurriculum(null);
                          }
                        }}
                      >
                        Delete
                      </button>
                      <button type="button" onClick={() => {
                        setShowEditPanel(false);
                        setSelectedCurriculum(null);
                        resetBulkForm();
                      }}>
                        Cancel
                      </button>
                      <button type="submit">Save Changes</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="edit-panel-empty">
                  <p>Select a subject from the table to edit it here.</p>
                  <p className="hint">Click "Select" button on any subject row to edit it.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Co-requisite Modal */}
      {canMutateCurriculum && showCorequisiteModal && (
        <div className="modal-overlay" onClick={handleCloseCorequisiteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Co-requisite</h3>
            <form onSubmit={handleCorequisiteSubmit}>
              <div className="form-group">
                <label>Subject <span className="required">*</span></label>
                <SearchableSelect
                  value={corequisiteForm.subject_id ? String(corequisiteForm.subject_id) : ''}
                  onChange={(v) =>
                    setCorequisiteForm({ ...corequisiteForm, subject_id: v, coreq_subject_id: '' })
                  }
                  options={subjectSearchOptions}
                  emptyLabel="Select Subject"
                  required
                  className="subject-select"
                />
              </div>
              
              <div className="form-group">
                <label>Co-requisite Subject <span className="required">*</span></label>
                <SearchableSelect
                  value={corequisiteForm.coreq_subject_id ? String(corequisiteForm.coreq_subject_id) : ''}
                  onChange={(v) => setCorequisiteForm({ ...corequisiteForm, coreq_subject_id: v })}
                  options={coreqCoSubjectSearchOptions}
                  emptyLabel="Select Co-requisite Subject"
                  required
                  className="subject-select"
                />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <div className="modal-actions">
                <button type="button" onClick={handleCloseCorequisiteModal}>
                  Cancel
                </button>
                <button type="submit">
                  Add Co-requisite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumManagement;