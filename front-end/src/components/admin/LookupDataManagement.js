import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import './LookupDataManagement.css';

const LookupDataManagement = () => {
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
  const [activeTab, setActiveTab] = useState('programs');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchLookupData();
  }, []);

  const getArrayData = (resp) => {
    const data = resp?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const fetchLookupData = async () => {
    try {
      setLoading(true);
      const [
        combinedResp,
        rolesResp,
        campusResp,
        academicYearsResp,
        departmentsResp,
        tracksResp,
        curriculumHeadersResp,
        offeredSubjectsResp,
        electiveSubjectsResp,
      ] = await Promise.allSettled([
        api.get('/curriculum/lookup/data'),
        api.get('/lookup/roles'),
        api.get('/lookup/campus'),
        api.get('/lookup/academic-years'),
        api.get('/lookup/departments'),
        api.get('/lookup/tracks'),
        api.get('/lookup/curriculum-headers'),
        api.get('/lookup/offered-subjects'),
        api.get('/lookup/elective-subjects'),
      ]);

      const combinedData = combinedResp.status === 'fulfilled' ? combinedResp.value.data || {} : {};

      const campusData =
        campusResp.status === 'fulfilled'
          ? getArrayData(campusResp.value)
          : getArrayData({ data: combinedData.campus || combinedData.campuses || [] });

      const normalized = {
        ...(combinedData || {}),
        roles: rolesResp.status === 'fulfilled' ? getArrayData(rolesResp.value) : combinedData.roles || [],
        campus: campusData,
        campuses: campusData,
        academicYears:
          academicYearsResp.status === 'fulfilled'
            ? getArrayData(academicYearsResp.value)
            : combinedData.academicYears || [],
        departments:
          departmentsResp.status === 'fulfilled'
            ? getArrayData(departmentsResp.value)
            : combinedData.departments || [],
        tracks: tracksResp.status === 'fulfilled' ? getArrayData(tracksResp.value) : combinedData.tracks || [],
        curriculumHeaders:
          curriculumHeadersResp.status === 'fulfilled'
            ? getArrayData(curriculumHeadersResp.value)
            : combinedData.curriculumHeaders || [],
        offeredSubjects:
          offeredSubjectsResp.status === 'fulfilled'
            ? getArrayData(offeredSubjectsResp.value)
            : combinedData.offeredSubjects || [],
        electiveSubjects:
          electiveSubjectsResp.status === 'fulfilled'
            ? getArrayData(electiveSubjectsResp.value)
            : combinedData.electiveSubjects || [],
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
    setEditingItem(null);
    setFormData(getDefaultFormData(activeTab));
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(getFormDataFromItem(activeTab, item));
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${formatTabTitle(activeTab).toLowerCase()}?`)) {
      return;
    }

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
    } catch (error) {
      const data = error.response?.data;
      const messages = data?.messages || data?.errors;
      const validationText = messages
        ? Object.values(messages)
            .flat()
            .filter(Boolean)
            .join(' ')
        : '';
      setError(
        validationText ||
          data?.message ||
          `Failed to delete ${formatTabTitle(activeTab).toLowerCase()}`
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
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
    } catch (error) {
      const data = error.response?.data;
      const messages = data?.messages || data?.errors;
      const validationText = messages
        ? Object.values(messages)
            .flat()
            .filter(Boolean)
            .join(' ')
        : '';
      setError(
        validationText ||
          data?.message ||
          `Failed to ${editingItem ? 'update' : 'create'} ${formatTabTitle(activeTab).toLowerCase()}`
      );
    }
  };

  const getDefaultFormData = (section) => {
    const defaults = {
      programs: { department_id: '', campus_id: '', program_code: '', program_name: '', total_units_required: '' },
      departments: { campus_id: '', department_name: '', department_code: '' },
      subjects: { subject_code: '', subject_name: '', units: 3, hours: 3 },
      yearLevels: { year_level: '' },
      semesters: { semester_name: '', status: '' },
      roles: { role_name: '', description: '', access_level: '' },
      campus: { campus_name: '' },
      academicYears: { name: '', status: '' },
      requisites: { requisite_type: '', subject_id: '', requisites_subject_id: '' },
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
        campus_id: item.campus_id ?? '',
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
      return {
        requisite_type: item.requisite_type ?? '',
        subject_id: item.subject_id ?? '',
        requisites_subject_id: item.requisites_subject_id ?? item.required_subject_id ?? '',
      };
    }

    return { ...item };
  };

  // Helper to correctly format the tab title (e.g., "departments" -> "Department")
  const formatTabTitle = (tab) => {
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
            <label>Department</label>
            <select
              value={formData.department_id || ''}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value ? parseInt(e.target.value) : '' })}
              required
            >
              <option value="">Select Department</option>
              {(lookupData.departments || []).map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>
                  {dept.department_name} ({dept.department_code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Campus</label>
            <select
              value={formData.campus_id || ''}
              onChange={(e) => setFormData({ ...formData, campus_id: e.target.value ? parseInt(e.target.value) : '' })}
              required
            >
              <option value="">Select Campus</option>
              {(lookupData.campus || lookupData.campuses || []).map((campus) => (
                <option key={campus.campus_id} value={campus.campus_id}>
                  {campus.campus_name}
                </option>
              ))}
            </select>
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
            <label>Campus</label>
            <select
              value={formData.campus_id || ''}
              onChange={(e) => setFormData({ ...formData, campus_id: e.target.value ? parseInt(e.target.value) : '' })}
            >
              <option value="">Select Campus (Optional)</option>
              {(lookupData.campus || lookupData.campuses || []).map((campus) => (
                <option key={campus.campus_id} value={campus.campus_id}>
                  {campus.campus_name}
                </option>
              ))}
            </select>
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
              value={formData.units || 3}
              onChange={(e) => setFormData({ ...formData, units: parseInt(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Hours</label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.hours || 3}
              onChange={(e) => setFormData({ ...formData, hours: parseInt(e.target.value) })}
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
            <label>Status</label>
            <select
              value={formData.status || ''}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="">Select Status (Optional)</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
            <label>Status</label>
            <select
              value={formData.status || ''}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="">Select Status (Optional)</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </>
      ),
      requisites: (
        <>
          <div className="form-group">
            <label>Requisite Type</label>
            <select
              value={formData.requisite_type || ''}
              onChange={(e) => setFormData({ ...formData, requisite_type: e.target.value })}
              required
            >
              <option value="">Select Type</option>
              <option value="prerequisite">Prerequisite</option>
              <option value="corequisite">Corequisite</option>
            </select>
          </div>
          <div className="form-group">
            <label>Subject</label>
            <select
              value={formData.subject_id || ''}
              onChange={(e) => setFormData({ ...formData, subject_id: e.target.value ? parseInt(e.target.value) : '' })}
              required
            >
              <option value="">Select Subject</option>
              {(lookupData.subjects || []).map((subject) => (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.subject_code} - {subject.subject_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Required Subject</label>
            <select
              value={formData.requisites_subject_id || ''}
              onChange={(e) => setFormData({ ...formData, requisites_subject_id: e.target.value ? parseInt(e.target.value) : '' })}
              required
            >
              <option value="">Select Required Subject</option>
              {(lookupData.subjects || []).map((subject) => (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.subject_code} - {subject.subject_name}
                </option>
              ))}
            </select>
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
            <label>Program</label>
            <select
              value={formData.program_id || ''}
              onChange={(e) => setFormData({ ...formData, program_id: e.target.value ? parseInt(e.target.value) : '' })}
              required
            >
              <option value="">Select Program</option>
              {(lookupData.programs || []).map((program) => (
                <option key={program.program_id} value={program.program_id}>
                  {program.program_code} - {program.program_name}
                </option>
              ))}
            </select>
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
            <label>Subject</label>
            <select
              value={formData.subject_id || ''}
              onChange={(e) => setFormData({ ...formData, subject_id: e.target.value ? parseInt(e.target.value) : '' })}
              required
            >
              <option value="">Select Subject</option>
              {(lookupData.subjects || []).map((subject) => (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.subject_code} - {subject.subject_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Academic Year</label>
            <select
              value={formData.academic_year_id || ''}
              onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value ? parseInt(e.target.value) : '' })}
              required
            >
              <option value="">Select Academic Year</option>
              {(lookupData.academicYears || []).map((ay) => (
                <option key={ay.academic_year_id || ay.id} value={ay.academic_year_id || ay.id}>
                  {ay.name || ay.academic_year_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Semester</label>
            <select
              value={formData.semester_id || ''}
              onChange={(e) => setFormData({ ...formData, semester_id: e.target.value ? parseInt(e.target.value) : '' })}
              required
            >
              <option value="">Select Semester</option>
              {(lookupData.semesters || []).map((sem) => (
                <option key={sem.semester_id} value={sem.semester_id}>
                  {sem.semester_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Program</label>
            <select
              value={formData.program_id || ''}
              onChange={(e) => setFormData({ ...formData, program_id: e.target.value ? parseInt(e.target.value) : '' })}
              required
            >
              <option value="">Select Program</option>
              {(lookupData.programs || []).map((program) => (
                <option key={program.program_id} value={program.program_id}>
                  {program.program_code} - {program.program_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Track (Optional)</label>
            <select
              value={formData.track_id || ''}
              onChange={(e) => setFormData({ ...formData, track_id: e.target.value ? parseInt(e.target.value) : '' })}
            >
              <option value="">Select Track (Optional)</option>
              {(lookupData.tracks || []).map((track) => (
                <option key={track.track_id} value={track.track_id}>
                  {track.track_code} - {track.track_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Year Level (Optional)</label>
            <select
              value={formData.year_level_id || ''}
              onChange={(e) => setFormData({ ...formData, year_level_id: e.target.value ? parseInt(e.target.value) : '' })}
            >
              <option value="">Select Year Level (Optional)</option>
              {(lookupData.yearLevels || []).map((yl) => (
                <option key={yl.year_level_id} value={yl.year_level_id}>
                  {yl.year_level}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status || ''}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="">Select Status (Optional)</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </>
      ),
      electiveSubjects: (
        <>
          <div className="form-group">
            <label>Track</label>
            <select
              value={formData.track_id || ''}
              onChange={(e) => setFormData({ ...formData, track_id: e.target.value ? parseInt(e.target.value) : '' })}
              required
            >
              <option value="">Select Track</option>
              {(lookupData.tracks || []).map((track) => (
                <option key={track.track_id} value={track.track_id}>
                  {track.track_code} - {track.track_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Subject</label>
            <select
              value={formData.subject_id || ''}
              onChange={(e) => setFormData({ ...formData, subject_id: e.target.value ? parseInt(e.target.value) : '' })}
              required
            >
              <option value="">Select Subject</option>
              {(lookupData.subjects || []).map((subject) => (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.subject_code} - {subject.subject_name}
                </option>
              ))}
            </select>
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
    const tableHeaders = {
      programs: ['Program Code', 'Program Name', 'Department', 'Campus', 'Total Units'],
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
          item.campus?.campus_name || item.campus_name || item.campus_id || '-',
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
          (item.units === null || item.units === undefined) ? '-' : item.units,
          (item.hours === null || item.hours === undefined) ? '-' : item.hours
        ],
        yearLevels: [item.year_level],
        semesters: [item.semester_name, item.status || '-'],
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

    return (
      <div className="table-section">
        <div className="section-header">
          <h3>{formatTabTitle(section)}</h3>
          <button className="add-button" onClick={handleAdd}>
            Add {formatTabTitle(section)}
          </button>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {tableHeaders[section].map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={tableHeaders[section].length + 1} className="no-data">
                    No {section === 'academicYears' ? 'Academic Years' : section} found
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.id || item[`${section.slice(0, -1)}_id`] || index}>
                    {getRowData(section, item).map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                    <td className="actions">
                      <button
                        className="edit-button"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </button>
                      <button
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading lookup data...</div>;
  }

  return (
    <div className="lookup-data-management">
      <div className="management-header">
        <h2>Lookup Data Management</h2>
        <button className="refresh-button" onClick={fetchLookupData}>
          Refresh Data
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
      
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
          Requisites
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

      {showModal && (
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