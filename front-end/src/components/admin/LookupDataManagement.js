import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { swalConfirm, swalToast, swalError } from '../../utils/swal';
import { usePermission } from '../../hooks/usePermission';
import { permissionSlugForPanelKey } from '../../config/lookupDataSidebarPanels';
import SearchableSelect from '../common/SearchableSelect';
import ClientPaginationBar from '../common/ClientPaginationBar';
import './LookupDataManagement.css';

/** Match CurriculumManagement default types: ITE→core; GEN/PED/NST/SSP/MAT→GE (minor). */
const SUBJECT_CODE_GE_PREFIXES = ['GEN', 'PED', 'NST', 'SSP', 'MAT'];

function subjectCodeCurriculumCategory(subjectCode) {
  const c = (subjectCode || '').trim().toUpperCase();
  if (c.startsWith('ITE')) return 'core';
  if (SUBJECT_CODE_GE_PREFIXES.some((p) => c.startsWith(p))) return 'ge';
  return 'other';
}

/** Lookup tabs that show a client-side search field above the grid */
const SEARCHABLE_LOOKUP_SECTIONS = new Set([
  'programs',
  'departments',
  'subjects',
  'requisites',
  'electiveSubjects',
  'offeredSubjects',
]);

const LOOKUP_SEARCH_PLACEHOLDER = {
  programs: 'Search by code, name, department, or units…',
  departments: 'Search by campus, name, or code…',
  subjects: 'Search by code or name…',
  requisites: 'Search by type, subject, or required subject…',
  electiveSubjects: 'Search by track, subject, or description…',
  offeredSubjects: 'Search by subject, year, semester, program, track…',
};

/**
 * @param {object} props
 * @param {'inline'|'external'} [props.panelNav] inline = horizontal tabs; external = parent sidebar (Dean/Admin)
 * @param {string} [props.activePanel] required when panelNav is external — panel key e.g. programs
 * @param {(key: string) => void} [props.onActivePanelChange]
 */
const LookupDataManagement = ({
  panelNav = 'inline',
  activePanel: activePanelProp,
  onActivePanelChange,
}) => {
  const [lookupData, setLookupData] = useState({
    programs: [],
    subjects: [],
    departments: [],
    yearLevels: [],
    semesters: [],
    prerequisites: [],
    corequisites: [],
    roles: [],
    campus: [],
    requisites: [],
    academicYears: [],
    tracks: [],
    curriculumHeaders: [],
    offeredSubjects: [],
    electiveSubjects: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTabInternal, setActiveTabInternal] = useState('programs');
  const externalNav = panelNav === 'external';
  const activeTab = externalNav ? activePanelProp || 'programs' : activeTabInternal;

  const { hasPermission, isAdmin } = usePermission();
  const canMutateCurrentPanel = useMemo(() => {
    if (isAdmin) return true;
    if (hasPermission('lookup.manage')) return true;
    if (hasPermission('Lookup Data')) return true;
    const slug = permissionSlugForPanelKey(activeTab);
    if (slug && hasPermission(`lookup.${slug}.manage`)) return true;
    return false;
  }, [isAdmin, hasPermission, activeTab]);

  const setActiveTab = (key) => {
    if (externalNav) {
      onActivePanelChange?.(key);
    } else {
      setActiveTabInternal(key);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  /** Per-section query string for searchable lookup grids */
  const [lookupSearchBySection, setLookupSearchBySection] = useState({});
  /** Subjects tab: filter by curriculum-style category (Core / GE). */
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState('all');
  const [lookupListPage, setLookupListPage] = useState(1);
  const [lookupListPageSize, setLookupListPageSize] = useState(10);

  const lookupSearchForActiveTab = SEARCHABLE_LOOKUP_SECTIONS.has(activeTab)
    ? (lookupSearchBySection[activeTab] ?? '')
    : '';

  useEffect(() => {
    setLookupListPage(1);
  }, [activeTab, lookupSearchForActiveTab]);

  useEffect(() => {
    setLookupListPage(1);
  }, [subjectCategoryFilter]);

  useEffect(() => {
    if (activeTab !== 'subjects') setSubjectCategoryFilter('all');
  }, [activeTab]);

  useEffect(() => {
    fetchLookupData();
  }, []);

  const fetchLookupData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lookup/page-bundle');
      const d = res.data || {};
      const campusData = Array.isArray(d.campus) ? d.campus : [];
      const requisites = Array.isArray(d.requisites) ? d.requisites : [];
      const prerequisites = requisites.filter(
        (r) => (r.requisite_type || r.type || '').toString().toLowerCase() === 'prerequisite'
      );
      const corequisites = requisites.filter(
        (r) => (r.requisite_type || r.type || '').toString().toLowerCase() === 'corequisite'
      );

      const normalized = {
        programs: Array.isArray(d.programs) ? d.programs : [],
        subjects: Array.isArray(d.subjects) ? d.subjects : [],
        yearLevels: Array.isArray(d.yearLevels) ? d.yearLevels : [],
        semesters: Array.isArray(d.semesters) ? d.semesters : [],
        requisites,
        prerequisites,
        corequisites,
        roles: Array.isArray(d.roles) ? d.roles : [],
        campus: campusData,
        campuses: campusData,
        departments: Array.isArray(d.departments) ? d.departments : [],
        academicYears: Array.isArray(d.academicYears) ? d.academicYears : [],
        tracks: Array.isArray(d.tracks) ? d.tracks : [],
        curriculumHeaders: Array.isArray(d.curriculumHeaders) ? d.curriculumHeaders : [],
        offeredSubjects: Array.isArray(d.offeredSubjects) ? d.offeredSubjects : [],
        electiveSubjects: Array.isArray(d.electiveSubjects) ? d.electiveSubjects : [],
      };

      setLookupData(normalized);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
      setError('Failed to fetch lookup data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!canMutateCurrentPanel) return;
    setEditingItem(null);
    setFormData(getDefaultFormData(activeTab));
    setShowModal(true);
  };

  const handleEdit = (item) => {
    if (!canMutateCurrentPanel) return;
    setEditingItem(item);
    setFormData(getFormDataFromItem(activeTab, item));
    setShowModal(true);
  };

  const handleToggleSemesterStatus = async (item) => {
    if (!canMutateCurrentPanel) return;
    try {
      const semesterId = item.semester_id || item.id;
      const url = `/lookup/semesters/${semesterId}/toggle-status`;
      await api.patch(url);
      fetchLookupData();
    } catch (error) {
      const data = error.response?.data;
      const errorMessage = data?.message || data?.error || 'Failed to toggle semester status';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDelete = async (id) => {
    if (!canMutateCurrentPanel) return;
    const tabTitle = formatTabTitle(activeTab).toLowerCase();
    const ok = await swalConfirm({
      title: 'Delete item?',
      text: `Are you sure you want to delete this ${tabTitle}?`,
      confirmButtonText: 'Delete',
    });
    if (!ok) return;

    try {
      // Determine the correct API endpoint and prefix for each tab
      let apiEndpoint = activeTab;
      let prefix = '';

      // Tabs backed by the lookup controller live under /lookup
      const lookupTabs = ['programs', 'subjects', 'campus', 'departments', 'roles', 'yearLevels', 'semesters', 'requisites', 'academicYears', 'tracks', 'curriculumHeaders', 'offeredSubjects', 'electiveSubjects'];
      if (lookupTabs.includes(activeTab)) {
        prefix = 'lookup';
      }

      // Handle special path name cases
      if (activeTab === 'yearLevels') {
        apiEndpoint = 'year-levels';
      } else if (activeTab === 'academicYears') {
        apiEndpoint = 'academic-years';
      } else if (activeTab === 'curriculumHeaders') {
        apiEndpoint = 'curriculum-headers';
      } else if (activeTab === 'offeredSubjects') {
        apiEndpoint = 'offered-subjects';
      } else if (activeTab === 'electiveSubjects') {
        apiEndpoint = 'elective-subjects';
      }

      const url = `/${prefix ? prefix + '/' : ''}${apiEndpoint}/${id}`;
      await api.delete(url);
      fetchLookupData();
      swalToast('success', 'Item deleted');
    } catch (error) {
      const data = error.response?.data;
      const messages = data?.messages || data?.errors;
      const validationText = messages
        ? Object.values(messages)
            .flat()
            .filter(Boolean)
            .join(' ')
        : '';
      const msg =
        validationText ||
        data?.message ||
        `Failed to delete ${formatTabTitle(activeTab).toLowerCase()}`;
      setError(msg);
      await swalError('Delete failed', msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canMutateCurrentPanel) return;
    setError('');

    try {
      // Special handling for requisites with multiple required subjects
      if (activeTab === 'requisites') {
        const requiredSubjects = formData.required_subjects || [];
        const filteredRequiredSubjects = requiredSubjects.filter(id => id && id !== '');

        if (!formData.subject_id || !formData.requisite_type) {
          setError('Subject and Requisite Type are required');
          return;
        }

        if (filteredRequiredSubjects.length === 0) {
          setError('At least one required subject is needed');
          return;
        }

        const base = '/lookup/requisites';

        // If editing, update the existing requisite and create new ones for additional subjects
        if (editingItem) {
          const itemId = editingItem.requisites_id || editingItem.requisite_id || editingItem.id;
          
          // Update the first requisite
          if (filteredRequiredSubjects.length > 0) {
            await api.put(`${base}/${itemId}`, {
              subject_id: formData.subject_id,
              requisite_type: formData.requisite_type,
              requisites_subject_id: filteredRequiredSubjects[0],
            });

            // Create additional requisites for the rest
            for (let i = 1; i < filteredRequiredSubjects.length; i++) {
              try {
                await api.post(base, {
                  subject_id: formData.subject_id,
                  requisite_type: formData.requisite_type,
                  requisites_subject_id: filteredRequiredSubjects[i],
                });
              } catch (err) {
                // If it's a duplicate error, skip it
                if (err.response?.status !== 422 && err.response?.status !== 409) {
                  throw err;
                }
              }
            }
          }
        } else {
          // Create multiple requisites
          const createPromises = filteredRequiredSubjects.map(requiredSubjectId =>
            api.post(base, {
              subject_id: formData.subject_id,
              requisite_type: formData.requisite_type,
              requisites_subject_id: requiredSubjectId,
            }).catch(err => {
              // If it's a duplicate error, return null instead of throwing
              if (err.response?.status === 422 || err.response?.status === 409) {
                return null;
              }
              throw err;
            })
          );

          await Promise.all(createPromises);
        }

        setShowModal(false);
        fetchLookupData();
        swalToast('success', 'Requisites saved');
        return;
      }

      if (activeTab === 'subjects') {
        const codeNorm = String(formData.subject_code || '').trim().toLowerCase();
        if (!codeNorm) {
          setError('Subject code is required');
          return;
        }
        const currentId = editingItem
          ? String(editingItem.subject_id ?? editingItem.id ?? '')
          : '';
        const duplicate = (lookupData.subjects || []).find((s) => {
          const sameCode = String(s.subject_code || '').trim().toLowerCase() === codeNorm;
          if (!sameCode) return false;
          if (!editingItem) return true;
          return String(s.subject_id) !== currentId;
        });
        if (duplicate) {
          const msg = `A subject with code "${duplicate.subject_code}" already exists.`;
          setError(msg);
          await swalError('Duplicate subject code', msg);
          return;
        }
      }

      // Determine the correct API endpoint and prefix for each tab
      let apiEndpoint = activeTab;
      let prefix = '';
      let itemId = editingItem?.id || editingItem?.[`${activeTab.slice(0, -1)}_id`];

      // Tabs backed by the lookup controller live under /lookup
      const lookupTabs = ['programs', 'subjects', 'campus', 'departments', 'roles', 'yearLevels', 'semesters', 'requisites', 'academicYears', 'tracks', 'curriculumHeaders', 'offeredSubjects', 'electiveSubjects'];
      if (lookupTabs.includes(activeTab)) {
        prefix = 'lookup';
      }

      // Handle special path name cases and id fields
      if (activeTab === 'yearLevels') {
        apiEndpoint = 'year-levels';
        itemId = editingItem?.id || editingItem?.year_level_id;
      } else if (activeTab === 'campus') {
        apiEndpoint = 'campus';
        itemId = editingItem?.campus_id || editingItem?.id;
      } else if (activeTab === 'academicYears') {
        apiEndpoint = 'academic-years';
        itemId = editingItem?.id || editingItem?.academic_year_id;
      } else if (activeTab === 'curriculumHeaders') {
        apiEndpoint = 'curriculum-headers';
        itemId = editingItem?.id || editingItem?.curriculum_header_id;
      } else if (activeTab === 'offeredSubjects') {
        apiEndpoint = 'offered-subjects';
        itemId = editingItem?.id || editingItem?.offered_subject_id;
      } else if (activeTab === 'electiveSubjects') {
        apiEndpoint = 'elective-subjects';
        itemId = editingItem?.id || editingItem?.elective_subject_id;
      } else if (activeTab === 'tracks') {
        itemId = editingItem?.id || editingItem?.track_id;
      }

      const base = `/${prefix ? prefix + '/' : ''}${apiEndpoint}`;

      if (editingItem && itemId) {
        await api.put(`${base}/${itemId}`, formData);
      } else {
        await api.post(base, formData);
      }

      setShowModal(false);
      fetchLookupData();
      swalToast('success', editingItem ? 'Updated' : 'Created');
    } catch (error) {
      const data = error.response?.data;
      const messages = data?.messages || data?.errors;
      const validationText = messages
        ? Object.values(messages)
            .flat()
            .filter(Boolean)
            .join(' ')
        : '';
      const msg =
        validationText ||
        data?.message ||
        `Failed to ${editingItem ? 'update' : 'create'} ${formatTabTitle(activeTab).toLowerCase()}`;
      setError(msg);
      await swalError('Save failed', msg);
    }
  };

  const getDefaultFormData = (section) => {
    const defaults = {
      programs: { department_id: '', program_code: '', program_name: '', total_units_required: '' },
      departments: { campus_id: '', department_name: '', department_code: '' },
      subjects: { subject_code: '', subject_name: '', number_of_units: 3, number_of_hrs: 3 },
      yearLevels: { year_level: '' },
      semesters: { semester_name: '', status: '' },
      roles: { role_name: '', description: '', access_level: '' },
      campus: { campus_name: '' },
      academicYears: { name: '', status: '' },
      requisites: { requisite_type: '', subject_id: '', required_subjects: [] },
      tracks: { track_code: '', track_name: '' },
      curriculumHeaders: { program_id: '', Effective_Year: '', description: '' },
      offeredSubjects: { subject_id: '', academic_year_id: '', semester_id: '', program_id: '', track_id: '', year_level_id: '', status: '' },
      electiveSubjects: { track_id: '', subject_id: '', description: '' },
    };
    return defaults[section] || {};
  };

  const getFormDataFromItem = (section, item) => {
    if (section === 'programs') {
      return {
        department_id: item.department_id ?? '',
        program_code: item.program_code ?? '',
        program_name: item.program_name ?? '',
        total_units_required: item.total_units_required ?? '',
      };
    }

    if (section === 'departments') {
      return {
        campus_id: item.campus_id ?? '',
        department_name: item.department_name ?? '',
        department_code: item.department_code ?? '',
      };
    }

    if (section === 'semesters') {
      return {
        semester_name: item.semester_name ?? '',
        status: item.status ?? '',
      };
    }

    if (section === 'academicYears') {
      return {
        name: item.name ?? item.academic_year_name ?? '',
        status: item.status ?? '',
      };
    }

    if (section === 'requisites') {
      // For editing, we'll show a single requisite but allow adding more
      const requiredSubjectId = item.requisites_subject_id ?? item.required_subject_id ?? '';
      return {
        requisite_type: item.requisite_type ?? '',
        subject_id: item.subject_id ?? '',
        required_subjects: requiredSubjectId ? [requiredSubjectId] : [],
      };
    }

    return { ...item };
  };

  // Helper to correctly format the tab title (e.g., "departments" -> "Department")
  const formatTabTitle = (tab) => {
    if (tab === 'requisites') return 'Requisite';
    if (tab === 'programs') return 'Program';
    if (tab === 'academicYears') return 'Academic Year';
    if (tab === 'roles') return 'Role';
    if (tab === 'campus') return 'Campus';
    if (tab === 'curriculumHeaders') return 'Curriculum Header';
    if (tab === 'offeredSubjects') return 'Offered Subject';
    if (tab === 'electiveSubjects') return 'Elective Subject';
    if (tab === 'tracks') return 'Track';
    const singular = tab.slice(0, -1); // Remove trailing 's'
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  };

  const renderForm = () => {
    const formFields = {
      programs: (
        <>
          <div className="form-group">
            <label htmlFor="ldm-program-department">Department</label>
            <SearchableSelect
              id="ldm-program-department"
              value={formData.department_id === '' || formData.department_id == null ? '' : String(formData.department_id)}
              onChange={(v) =>
                setFormData({ ...formData, department_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.departments || []).map((dept) => ({
                value: String(dept.department_id),
                label: `${dept.department_name} (${dept.department_code})`,
              }))}
              emptyLabel="Select Department"
              placeholder="Search department…"
              required
              aria-label="Department"
            />
          </div>

          <div className="form-group">
            <label>Program Code</label>
            <input
              type="text"
              value={formData.program_code || ''}
              onChange={(e) => setFormData({ ...formData, program_code: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Program Name</label>
            <input
              type="text"
              value={formData.program_name || ''}
              onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Total Units Required</label>
            <input
              type="number"
              min="0"
              value={formData.total_units_required === null || formData.total_units_required === undefined ? '' : formData.total_units_required}
              onChange={(e) => setFormData({ ...formData, total_units_required: e.target.value === '' ? '' : parseInt(e.target.value) })}
            />
          </div>
        </>
      ),
      departments: (
        <>
          <div className="form-group">
            <label htmlFor="ldm-dept-campus">Campus</label>
            <SearchableSelect
              id="ldm-dept-campus"
              value={formData.campus_id === '' || formData.campus_id == null ? '' : String(formData.campus_id)}
              onChange={(v) =>
                setFormData({ ...formData, campus_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.campus || lookupData.campuses || []).map((campus) => ({
                value: String(campus.campus_id),
                label: campus.campus_name,
              }))}
              emptyLabel="Select Campus (Optional)"
              placeholder="Search campus…"
              aria-label="Campus (optional)"
            />
          </div>
          <div className="form-group">
            <label>Department Name</label>
            <input
              type="text"
              value={formData.department_name || ''}
              onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
              placeholder="e.g., College of Engineering Architecture"
              required
            />
          </div>
          <div className="form-group">
            <label>Department Code</label>
            <input
              type="text"
              value={formData.department_code || ''}
              onChange={(e) => setFormData({ ...formData, department_code: e.target.value })}
              placeholder="e.g., CEA"
              required
            />
          </div>
        </>
      ),
      subjects: (
        <>
          <div className="form-group">
            <label>Subject Code</label>
            <input
              type="text"
              value={formData.subject_code || ''}
              onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Subject Name</label>
            <input
              type="text"
              value={formData.subject_name || ''}
              onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Units</label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.number_of_units ?? 3}
              onChange={(e) => setFormData({ ...formData, number_of_units: parseInt(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Hours</label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.number_of_hrs ?? 3}
              onChange={(e) => setFormData({ ...formData, number_of_hrs: parseInt(e.target.value) })}
            />
          </div>
        </>
      ),
      yearLevels: (
        <>
          <div className="form-group">
            <label>Year Level</label>
            <input
              type="text"
              value={formData.year_level || ''}
              onChange={(e) => setFormData({ ...formData, year_level: e.target.value })}
              placeholder="e.g., First Year, Second Year"
              required
            />
          </div>
        </>
      ),
      semesters: (
        <>
          <div className="form-group">
            <label>Semester Name</label>
            <input
              type="text"
              value={formData.semester_name || ''}
              onChange={(e) => setFormData({ ...formData, semester_name: e.target.value })}
              placeholder="e.g., First Semester, Second Semester"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="ldm-semester-status">Status</label>
            <SearchableSelect
              id="ldm-semester-status"
              value={formData.status || ''}
              onChange={(v) => setFormData({ ...formData, status: v })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              emptyLabel="Select Status (Optional)"
              placeholder="Filter status…"
              aria-label="Semester status"
            />
          </div>
        </>
      ),
      campus: (
        <>
          <div className="form-group">
            <label>Campus Name</label>
            <input
              type="text"
              value={formData.campus_name || ''}
              onChange={(e) => setFormData({ ...formData, campus_name: e.target.value })}
              required
            />
          </div>
        </>
      ),
      roles: (
        <>
          <div className="form-group">
            <label>Role Name</label>
            <input
              type="text"
              value={formData.role_name || ''}
              onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Access Level</label>
            <input
              type="number"
              value={formData.access_level || ''}
              onChange={(e) => setFormData({ ...formData, access_level: e.target.value ? parseInt(e.target.value) : '' })}
              placeholder="e.g., 10"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </>
      ),
      academicYears: (
        <>
          <div className="form-group">
            <label>Academic Year Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., 2024-2025"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="ldm-ay-status">Status</label>
            <SearchableSelect
              id="ldm-ay-status"
              value={formData.status || ''}
              onChange={(v) => setFormData({ ...formData, status: v })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              emptyLabel="Select Status (Optional)"
              placeholder="Filter status…"
              aria-label="Academic year status"
            />
          </div>
        </>
      ),
      requisites: (
        <>
          <div className="form-group">
            <label htmlFor="ldm-req-type">Requisite Type</label>
            <SearchableSelect
              id="ldm-req-type"
              value={formData.requisite_type || ''}
              onChange={(v) => setFormData({ ...formData, requisite_type: v })}
              options={[
                { value: 'prerequisite', label: 'Prerequisite' },
                { value: 'corequisite', label: 'Corequisite' },
              ]}
              emptyLabel="Select Type"
              placeholder="Filter type…"
              required
              aria-label="Requisite type"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ldm-req-subject">Subject</label>
            <SearchableSelect
              id="ldm-req-subject"
              value={formData.subject_id === '' || formData.subject_id == null ? '' : String(formData.subject_id)}
              onChange={(v) =>
                setFormData({ ...formData, subject_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.subjects || []).map((subject) => ({
                value: String(subject.subject_id),
                label: `${subject.subject_code} - ${subject.subject_name}`,
              }))}
              emptyLabel="Select Subject"
              placeholder="Search subject…"
              required
              aria-label="Subject for requisite"
            />
          </div>
          <div className="form-group">
            <label>Required Subjects</label>
            <div style={{ marginBottom: '10px' }}>
              {(formData.required_subjects || []).map((reqSubjectId, index) => {
                const selectedSubject = (lookupData.subjects || []).find(s => s.subject_id === reqSubjectId);
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <SearchableSelect
                        id={`ldm-req-required-${index}`}
                        value={reqSubjectId === '' || reqSubjectId == null ? '' : String(reqSubjectId)}
                        onChange={(v) => {
                          const newRequiredSubjects = [...(formData.required_subjects || [])];
                          newRequiredSubjects[index] = v ? parseInt(v, 10) : '';
                          setFormData({ ...formData, required_subjects: newRequiredSubjects });
                        }}
                        options={(lookupData.subjects || [])
                          .filter(
                            (subject) =>
                              String(subject.subject_id) !== String(formData.subject_id || '') &&
                              !formData.required_subjects?.some(
                                (id, idx) => idx !== index && String(id) === String(subject.subject_id),
                              ),
                          )
                          .map((subject) => ({
                            value: String(subject.subject_id),
                            label: `${subject.subject_code} - ${subject.subject_name}`,
                          }))}
                        emptyLabel="Select Required Subject"
                        placeholder="Search subject…"
                        required
                        aria-label={`Required subject ${index + 1}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newRequiredSubjects = formData.required_subjects?.filter((_, idx) => idx !== index) || [];
                        setFormData({ ...formData, required_subjects: newRequiredSubjects });
                      }}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                const newRequiredSubjects = [...(formData.required_subjects || []), ''];
                setFormData({ ...formData, required_subjects: newRequiredSubjects });
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '5px'
              }}
            >
              + Add Required Subject
            </button>
            {(!formData.required_subjects || formData.required_subjects.length === 0) && (
              <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
                At least one required subject is needed
              </div>
            )}
          </div>
        </>
      ),
      tracks: (
        <>
          <div className="form-group">
            <label>Track Code</label>
            <input
              type="text"
              value={formData.track_code || ''}
              onChange={(e) => setFormData({ ...formData, track_code: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Track Name</label>
            <input
              type="text"
              value={formData.track_name || ''}
              onChange={(e) => setFormData({ ...formData, track_name: e.target.value })}
              required
            />
          </div>
        </>
      ),
      curriculumHeaders: (
        <>
          <div className="form-group">
            <label htmlFor="ldm-ch-program">Program</label>
            <SearchableSelect
              id="ldm-ch-program"
              value={formData.program_id === '' || formData.program_id == null ? '' : String(formData.program_id)}
              onChange={(v) =>
                setFormData({ ...formData, program_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.programs || []).map((program) => ({
                value: String(program.program_id),
                label: `${program.program_code} - ${program.program_name}`,
              }))}
              emptyLabel="Select Program"
              placeholder="Search program…"
              required
              aria-label="Curriculum header program"
            />
          </div>
          <div className="form-group">
            <label>Effective Year</label>
            <input
              type="number"
              value={formData.Effective_Year || ''}
              onChange={(e) => setFormData({ ...formData, Effective_Year: e.target.value ? parseInt(e.target.value) : '' })}
              placeholder="e.g., 2024"
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Based on CMO No.25 series of 2015"
            />
          </div>
        </>
      ),
      offeredSubjects: (
        <>
          <div className="form-group">
            <label htmlFor="ldm-os-subject">Subject</label>
            <SearchableSelect
              id="ldm-os-subject"
              value={formData.subject_id === '' || formData.subject_id == null ? '' : String(formData.subject_id)}
              onChange={(v) =>
                setFormData({ ...formData, subject_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.subjects || []).map((subject) => ({
                value: String(subject.subject_id),
                label: `${subject.subject_code} - ${subject.subject_name}`,
              }))}
              emptyLabel="Select Subject"
              placeholder="Search subject…"
              required
              aria-label="Offered subject"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ldm-os-ay">Academic Year</label>
            <SearchableSelect
              id="ldm-os-ay"
              value={
                formData.academic_year_id === '' || formData.academic_year_id == null
                  ? ''
                  : String(formData.academic_year_id)
              }
              onChange={(v) =>
                setFormData({ ...formData, academic_year_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.academicYears || []).map((ay) => {
                const id = ay.academic_year_id ?? ay.id;
                return {
                  value: String(id),
                  label: ay.name || ay.academic_year_name || String(id),
                };
              })}
              emptyLabel="Select Academic Year"
              placeholder="Search academic year…"
              required
              aria-label="Academic year"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ldm-os-semester">Semester</label>
            <SearchableSelect
              id="ldm-os-semester"
              value={formData.semester_id === '' || formData.semester_id == null ? '' : String(formData.semester_id)}
              onChange={(v) =>
                setFormData({ ...formData, semester_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.semesters || []).map((sem) => ({
                value: String(sem.semester_id),
                label: sem.semester_name,
              }))}
              emptyLabel="Select Semester"
              placeholder="Search semester…"
              required
              aria-label="Semester"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ldm-os-program">Program</label>
            <SearchableSelect
              id="ldm-os-program"
              value={formData.program_id === '' || formData.program_id == null ? '' : String(formData.program_id)}
              onChange={(v) =>
                setFormData({ ...formData, program_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.programs || []).map((program) => ({
                value: String(program.program_id),
                label: `${program.program_code} - ${program.program_name}`,
              }))}
              emptyLabel="Select Program"
              placeholder="Search program…"
              required
              aria-label="Program"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ldm-os-track">Track (Optional)</label>
            <SearchableSelect
              id="ldm-os-track"
              value={formData.track_id === '' || formData.track_id == null ? '' : String(formData.track_id)}
              onChange={(v) =>
                setFormData({ ...formData, track_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.tracks || []).map((track) => ({
                value: String(track.track_id),
                label: `${track.track_code} - ${track.track_name}`,
              }))}
              emptyLabel="Select Track (Optional)"
              placeholder="Search track…"
              aria-label="Track (optional)"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ldm-os-yl">Year Level (Optional)</label>
            <SearchableSelect
              id="ldm-os-yl"
              value={formData.year_level_id === '' || formData.year_level_id == null ? '' : String(formData.year_level_id)}
              onChange={(v) =>
                setFormData({ ...formData, year_level_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.yearLevels || []).map((yl) => ({
                value: String(yl.year_level_id),
                label: yl.year_level,
              }))}
              emptyLabel="Select Year Level (Optional)"
              placeholder="Search year level…"
              aria-label="Year level (optional)"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ldm-os-status">Status</label>
            <SearchableSelect
              id="ldm-os-status"
              value={formData.status || ''}
              onChange={(v) => setFormData({ ...formData, status: v })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              emptyLabel="Select Status (Optional)"
              placeholder="Filter status…"
              aria-label="Offered subject status"
            />
          </div>
        </>
      ),
      electiveSubjects: (
        <>
          <div className="form-group">
            <label htmlFor="ldm-es-track">Track</label>
            <SearchableSelect
              id="ldm-es-track"
              value={formData.track_id === '' || formData.track_id == null ? '' : String(formData.track_id)}
              onChange={(v) =>
                setFormData({ ...formData, track_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.tracks || []).map((track) => ({
                value: String(track.track_id),
                label: `${track.track_code} - ${track.track_name}`,
              }))}
              emptyLabel="Select Track"
              placeholder="Search track…"
              required
              aria-label="Elective track"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ldm-es-subject">Subject</label>
            <SearchableSelect
              id="ldm-es-subject"
              value={formData.subject_id === '' || formData.subject_id == null ? '' : String(formData.subject_id)}
              onChange={(v) =>
                setFormData({ ...formData, subject_id: v ? parseInt(v, 10) : '' })
              }
              options={(lookupData.subjects || []).map((subject) => ({
                value: String(subject.subject_id),
                label: `${subject.subject_code} - ${subject.subject_name}`,
              }))}
              emptyLabel="Select Subject"
              placeholder="Search subject…"
              required
              aria-label="Elective subject"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </>
      ),
    };

    return formFields[activeTab] || null;
  };

  //diri maka ilis og mga table headers sa table
  const renderTable = (section, data) => {
    const showActions = canMutateCurrentPanel;
    const tableHeaders = {
      programs: ['Program Code', 'Program Name', 'Department', 'Total Units'],
      departments: ['Campus', 'Department Name', 'Department Code'],
      subjects: ['Subject Code', 'Subject Name', 'Units', 'Hours'],
      yearLevels: ['Year Level'],
      semesters: ['Semester Name', 'Status'],
      roles: ['Role Name', 'Access Level', 'Description'],
      campus: ['ID', 'Campus Name'],
      academicYears: ['Academic Year Name', 'Status'],
      requisites: ['Type', 'Subject', 'Required Subject'],
      tracks: ['Track Code', 'Track Name'],
      curriculumHeaders: ['Program', 'Effective Year', 'Description'],
      offeredSubjects: ['Subject', 'Academic Year', 'Semester', 'Program', 'Track', 'Year Level', 'Status'],
      electiveSubjects: ['Track', 'Subject', 'Description'],
    };

    const getRowData = (section, item) => {
      const rowData = {
        programs: [
          item.program_code,
          item.program_name,
          item.department?.department_name || item.department_name || item.department_id || '-',
          (item.total_units_required === null || item.total_units_required === undefined) ? '-' : item.total_units_required,
        ],
        departments: [
          (() => {
            const campusId = item.campus?.campus_id || item.campus_id;
            const campus = lookupData.campus?.find(c => c.campus_id === campusId);
            return campus ? campus.campus_name : (campusId || '-');
          })(),
          item.department_name,
          item.department_code,
        ],
        subjects: [
          item.subject_code,
          item.subject_name,
          (item.number_of_units === null || item.number_of_units === undefined) ? '-' : item.number_of_units,
          (item.number_of_hrs === null || item.number_of_hrs === undefined) ? '-' : item.number_of_hrs
        ],
        yearLevels: [item.year_level],
        semesters: [item.semester_name, item.status || item.Status || '-'],
        roles: [
          item.role_name || item.name || '-',
          (item.access_level === null || item.access_level === undefined) ? '-' : item.access_level,
          item.description || '-'
        ],
        campus: [item.campus_id, item.campus_name],
        academicYears: [item.name || item.academic_year_name || '-', item.status || '-'],
        requisites: [
          item.requisite_type || item.type || '-',
          (() => {
            const subjectId = item.subject?.subject_id || item.subject_id;
            const subject = lookupData.subjects?.find(s => s.subject_id === subjectId);
            return subject ? `${subject.subject_code} - ${subject.subject_name}` : subjectId || '-';
          })(),
          (() => {
            const requiredSubjectId = item.requiredSubject?.subject_id || item.requisites_subject_id || item.required_subject_id;
            const requiredSubject = lookupData.subjects?.find(s => s.subject_id === requiredSubjectId);
            return requiredSubject ? `${requiredSubject.subject_code} - ${requiredSubject.subject_name}` : requiredSubjectId || '-';
          })()
        ],
        tracks: [
          item.track_code,
          item.track_name,
        ],
        curriculumHeaders: [
          (() => {
            const programId = item.program?.program_id || item.program_id;
            const program = lookupData.programs?.find(p => p.program_id === programId);
            return program ? `${program.program_code} - ${program.program_name}` : programId || '-';
          })(),
          item.Effective_Year || '-',
          item.description || '-',
        ],
        offeredSubjects: [
          (() => {
            const subjectId = item.subject?.subject_id || item.subject_id;
            const subject = lookupData.subjects?.find(s => s.subject_id === subjectId);
            return subject ? `${subject.subject_code} - ${subject.subject_name}` : subjectId || '-';
          })(),
          (() => {
            const ayId = item.academicYear?.academic_year_id || item.academic_year_id;
            const ay = lookupData.academicYears?.find(a => (a.academic_year_id || a.id) === ayId);
            return ay ? (ay.name || ay.academic_year_name) : ayId || '-';
          })(),
          (() => {
            const semId = item.semester?.semester_id || item.semester_id;
            const sem = lookupData.semesters?.find(s => s.semester_id === semId);
            return sem ? sem.semester_name : semId || '-';
          })(),
          (() => {
            const programId = item.program?.program_id || item.program_id;
            const program = lookupData.programs?.find(p => p.program_id === programId);
            return program ? `${program.program_code} - ${program.program_name}` : programId || '-';
          })(),
          (() => {
            const trackId = item.track?.track_id || item.track_id;
            const track = lookupData.tracks?.find(t => t.track_id === trackId);
            return track ? `${track.track_code} - ${track.track_name}` : (trackId ? trackId : '-');
          })(),
          (() => {
            const ylId = item.yearLevel?.year_level_id || item.year_level_id;
            const yl = lookupData.yearLevels?.find(y => y.year_level_id === ylId);
            return yl ? yl.year_level : (ylId ? ylId : '-');
          })(),
          item.status || '-',
        ],
        electiveSubjects: [
          (() => {
            const trackId = item.track?.track_id || item.track_id;
            const track = lookupData.tracks?.find(t => t.track_id === trackId);
            return track ? `${track.track_code} - ${track.track_name}` : trackId || '-';
          })(),
          (() => {
            const subjectId = item.subject?.subject_id || item.subject_id;
            const subject = lookupData.subjects?.find(s => s.subject_id === subjectId);
            return subject ? `${subject.subject_code} - ${subject.subject_name}` : subjectId || '-';
          })(),
          item.description || '-',
        ],
      };
      return rowData[section] || [];
    };

    const headers = tableHeaders[section];
    const dataColCount = headers.length;
    const scrollMinPx = Math.min(1200, 160 + dataColCount * 92 + (showActions ? 128 : 0));
    const gridClassName = [
      'lookup-data-grid',
      'lookup-data-grid--scroll-table',
      showActions ? 'lookup-data-grid--with-actions' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const searchQ = SEARCHABLE_LOOKUP_SECTIONS.has(section)
      ? (lookupSearchBySection[section] || '').trim().toLowerCase()
      : '';
    let filteredData =
      !searchQ
        ? data
        : data.filter((item) =>
            getRowData(section, item).some((cell) =>
              String(cell ?? '').toLowerCase().includes(searchQ)
            )
          );

    if (section === 'subjects' && subjectCategoryFilter !== 'all') {
      filteredData = filteredData.filter((item) => {
        const cat = subjectCodeCurriculumCategory(item.subject_code);
        return subjectCategoryFilter === 'core' ? cat === 'core' : cat === 'ge';
      });
    }

    const totalFiltered = filteredData.length;
    const lookupTotalPages = Math.max(1, Math.ceil(totalFiltered / lookupListPageSize) || 1);
    const lookupEffectivePage = Math.min(Math.max(1, lookupListPage), lookupTotalPages);
    const lookupPageStart = (lookupEffectivePage - 1) * lookupListPageSize;
    const paginatedData = filteredData.slice(lookupPageStart, lookupPageStart + lookupListPageSize);

    const renderActions = (item) => {
      if (!showActions) return null;
      return (
        <div className="lookup-data-grid__cell lookup-data-grid__cell--actions">
          <span className="lookup-data-grid__mobile-label">Actions</span>
          <div className="actions">
            {section === 'semesters' ? (
              <button
                type="button"
                className={item.status === 'active' ? 'deactivate-button' : 'activate-button'}
                onClick={() => handleToggleSemesterStatus(item)}
                style={{
                  backgroundColor: item.status === 'active' ? '#dc3545' : '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {item.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            ) : (
              <>
                <button type="button" className="edit-button" onClick={() => handleEdit(item)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => {
                    let deleteId;
                    if (section === 'campus') {
                      deleteId = item.campus_id || item.id;
                    } else if (section === 'yearLevels') {
                      deleteId = item.year_level_id || item.id;
                    } else if (section === 'requisites') {
                      deleteId = item.requisites_id || item.requisite_id || item.id;
                    } else if (section === 'tracks') {
                      deleteId = item.track_id || item.id;
                    } else if (section === 'curriculumHeaders') {
                      deleteId = item.curriculum_header_id || item.id;
                    } else if (section === 'offeredSubjects') {
                      deleteId = item.offered_subject_id || item.id;
                    } else if (section === 'electiveSubjects') {
                      deleteId = item.elective_subject_id || item.id;
                    } else {
                      deleteId = item.id || item[`${section.slice(0, -1)}_id`];
                    }
                    handleDelete(deleteId);
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="table-section">
        <div className="section-header">
          <h3>{formatTabTitle(section)}</h3>
          {showActions && (
            <button type="button" className="add-button" onClick={handleAdd}>
              Add {formatTabTitle(section)}
            </button>
          )}
        </div>
        {SEARCHABLE_LOOKUP_SECTIONS.has(section) && (
          section === 'subjects' ? (
            <div className="lookup-subjects-filters">
              <div className="lookup-table-search-wrap">
                <label htmlFor={`lookup-search-${section}`} className="lookup-table-search-label">
                  Search
                </label>
                <input
                  id={`lookup-search-${section}`}
                  type="search"
                  className="lookup-table-search"
                  placeholder={LOOKUP_SEARCH_PLACEHOLDER[section] || 'Search…'}
                  value={lookupSearchBySection[section] ?? ''}
                  onChange={(e) =>
                    setLookupSearchBySection((prev) => ({ ...prev, [section]: e.target.value }))
                  }
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="lookup-table-search-wrap">
                <label htmlFor="lookup-subject-category" className="lookup-table-search-label">
                  Core / GE
                </label>
                <select
                  id="lookup-subject-category"
                  className="lookup-table-search"
                  value={subjectCategoryFilter}
                  onChange={(e) => setSubjectCategoryFilter(e.target.value)}
                  aria-label="Filter subjects by Core or GE category"
                >
                  <option value="all">All subjects</option>
                  <option value="core">Core (ITE…)</option>
                  <option value="ge">GE (GEN, PED, NST, SSP, MAT…)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="lookup-table-search-wrap">
              <label htmlFor={`lookup-search-${section}`} className="lookup-table-search-label">
                Search
              </label>
              <input
                id={`lookup-search-${section}`}
                type="search"
                className="lookup-table-search"
                placeholder={LOOKUP_SEARCH_PLACEHOLDER[section] || 'Search…'}
                value={lookupSearchBySection[section] ?? ''}
                onChange={(e) =>
                  setLookupSearchBySection((prev) => ({ ...prev, [section]: e.target.value }))
                }
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )
        )}
        <div className="table-container">
          <div
            className={gridClassName}
            style={{
              '--lookup-data-cols': dataColCount,
              '--lookup-scroll-min-width': `${scrollMinPx}px`,
            }}
            role="table"
            aria-label={`${formatTabTitle(section)} data`}
          >
            <div className="lookup-data-grid__head" role="row">
              {headers.map((header, index) => (
                <div key={index} className="lookup-data-grid__th" role="columnheader">
                  {header}
                </div>
              ))}
              {showActions && (
                <div className="lookup-data-grid__th lookup-data-grid__th--actions" role="columnheader">
                  Actions
                </div>
              )}
            </div>
            <div className="lookup-data-grid__body" role="rowgroup">
              {data.length === 0 ? (
                <div className="lookup-data-grid__empty no-data" role="row">
                  <div role="cell">
                    No {section === 'academicYears' ? 'Academic Years' : section} found
                  </div>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="lookup-data-grid__empty no-data lookup-data-grid__empty--filter" role="row">
                  <div role="cell">
                    {section === 'subjects' && subjectCategoryFilter !== 'all' && !searchQ
                      ? 'No subjects match this Core / GE filter.'
                      : 'No results match your search or filters.'}
                  </div>
                </div>
              ) : (
                paginatedData.map((item, index) => (
                  <div
                    key={item.id || item[`${section.slice(0, -1)}_id`] || item.audit_logs_id || index}
                    className="lookup-data-grid__row"
                    role="row"
                  >
                    {getRowData(section, item).map((cell, cellIndex) => (
                      <div key={cellIndex} className="lookup-data-grid__cell" role="cell">
                        <span className="lookup-data-grid__mobile-label">{headers[cellIndex]}</span>
                        <span className="lookup-data-grid__cell-value">{cell}</span>
                      </div>
                    ))}
                    {renderActions(item)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {data.length > 0 && filteredData.length > 0 && (
          <ClientPaginationBar
            page={lookupEffectivePage}
            pageSize={lookupListPageSize}
            totalItems={totalFiltered}
            totalPages={lookupTotalPages}
            onPageChange={setLookupListPage}
            onPageSizeChange={(n) => {
              setLookupListPageSize(n);
              setLookupListPage(1);
            }}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading lookup data...</div>;
  }

  return (
    <div className="lookup-data-management">
      <div className="management-header">
        <h2>
          Lookup Data Management
          {!canMutateCurrentPanel && (
            <span className="lookup-view-only-badge"> View only</span>
          )}
        </h2>
        <button className="refresh-button" onClick={fetchLookupData}>
          Refresh Data
        </button>
      </div>
      {externalNav && (
        <p className="lookup-active-panel-label">{formatTabTitle(activeTab)}</p>
      )}
      {error && <div className="error-message">{error}</div>}

      {!externalNav && (
        <>
          <div className="lookup-tabs">
            <button
              className={activeTab === 'programs' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('programs')}
            >
              Programs
            </button>
            <button
              className={activeTab === 'departments' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('departments')}
            >
              Departments
            </button>
            <button
              className={activeTab === 'subjects' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('subjects')}
            >
              Subjects
            </button>
            <button
              className={activeTab === 'yearLevels' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('yearLevels')}
            >
              Year Levels
            </button>
            <button
              className={activeTab === 'semesters' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('semesters')}
            >
              Semesters
            </button>
            <button
              className={activeTab === 'campus' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('campus')}
            >
              Campus
            </button>
            <button
              className={activeTab === 'roles' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('roles')}
            >
              Roles
            </button>
            <button
              className={activeTab === 'requisites' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('requisites')}
            >
              Prerequisites
            </button>
            <button
              className={activeTab === 'academicYears' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('academicYears')}
            >
              Academic Year
            </button>
            <button
              className={activeTab === 'tracks' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('tracks')}
            >
              Tracks
            </button>
            <button
              className={activeTab === 'curriculumHeaders' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('curriculumHeaders')}
            >
              Curriculum Headers
            </button>
            <button
              className={activeTab === 'offeredSubjects' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('offeredSubjects')}
            >
              Offered Subjects
            </button>
          </div>

          {(activeTab === 'tracks' || activeTab === 'electiveSubjects') && (
            <div className="sub-tabs">
              <button
                className={activeTab === 'tracks' ? 'sub-tab active' : 'sub-tab'}
                onClick={() => setActiveTab('tracks')}
              >
                Tracks
              </button>
              <button
                className={activeTab === 'electiveSubjects' ? 'sub-tab active' : 'sub-tab'}
                onClick={() => setActiveTab('electiveSubjects')}
              >
                Elective Subjects
              </button>
            </div>
          )}
        </>
      )}

      <div className="tab-content">
        {activeTab === 'programs' && renderTable('programs', lookupData.programs || [])}
        {activeTab === 'departments' && renderTable('departments', lookupData.departments || [])}
        {activeTab === 'subjects' && renderTable('subjects', lookupData.subjects || [])}
        {activeTab === 'yearLevels' && renderTable('yearLevels', lookupData.yearLevels || [])}
        {activeTab === 'semesters' && renderTable('semesters', lookupData.semesters || [])}
        {activeTab === 'campus' && renderTable('campus', lookupData.campus || [])}
        {activeTab === 'roles' && renderTable('roles', lookupData.roles || [])}
        {activeTab === 'requisites' && renderTable('requisites', lookupData.requisites || lookupData.prerequisites || lookupData.corequisites || [])}
        {activeTab === 'academicYears' && renderTable('academicYears', lookupData.academicYears || [])}
        {activeTab === 'tracks' && renderTable('tracks', lookupData.tracks || [])}
        {activeTab === 'curriculumHeaders' && renderTable('curriculumHeaders', lookupData.curriculumHeaders || [])}
        {activeTab === 'offeredSubjects' && renderTable('offeredSubjects', lookupData.offeredSubjects || [])}
        {activeTab === 'electiveSubjects' && renderTable('electiveSubjects', lookupData.electiveSubjects || [])}
      </div>

      {showModal && canMutateCurrentPanel && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                {editingItem ? 'Edit' : 'Add'} {formatTabTitle(activeTab)}
              </h3>
              <button
                className="close-button"
                onClick={() => {
                  setShowModal(false);
                  setError('');
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              {error && <div className="error-message">{error}</div>}
              {renderForm()}
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LookupDataManagement;