import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import '../admin/CurriculumManagement.css';
import './StudentCurriculum.css';

const StudentCurriculum = () => {
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedYearLevel, setSelectedYearLevel] = useState(null);
  const [yearLevels, setYearLevels] = useState([]);

  useEffect(() => {
    fetchCurriculum();
    fetchEnrollments();
  }, []);

  const fetchCurriculum = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students/curriculum');
      const curriculumData = response.data.curriculum || response.data || [];
      setCurriculum(curriculumData);

      const uniqueYearLevels = [
        ...new Set(
          curriculumData.map((item) => item.year_level_id || item.year_level?.year_level_id)
        ),
      ].sort((a, b) => Number(a) - Number(b));
      setYearLevels(uniqueYearLevels);

      if (uniqueYearLevels.length > 0 && selectedYearLevel == null) {
        setSelectedYearLevel(uniqueYearLevels[0]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching curriculum:', err);
      setError(err.response?.data?.message || 'Failed to load curriculum');
      setCurriculum([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const response = await api.get('/students/enrollments');
      const enrollmentsData = response.data.enrollments || response.data || [];
      setEnrollments(enrollmentsData);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    }
  };

  const getEnrollmentStatus = (subjectId) => {
    const enrollment = enrollments.find(
      (e) => e.subject_id === subjectId || e.subject?.subject_id === subjectId
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

  const groupBySemester = (yearLevelId) => {
    const yearLevelSubjects = curriculum.filter(
      (item) => (item.year_level_id || item.year_level?.year_level_id) === yearLevelId
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
    const row = curriculum.find(
      (item) => (item.year_level_id || item.year_level?.year_level_id) === selectedYearLevel
    );
    return (
      row?.year_level_name ||
      row?.year_level?.year_level ||
      `Year ${selectedYearLevel}`
    );
  }, [curriculum, selectedYearLevel]);

  const programLine = useMemo(() => {
    const row = curriculum[0];
    const p = row?.program;
    if (!p) return 'CURRICULUM';
    return `${p.program_name || ''}${p.program_code ? ` (${p.program_code})` : ''}`.trim();
  }, [curriculum]);

  if (loading) {
    return <div className="loading">Loading curriculum...</div>;
  }

  return (
    <div className="curriculum-management student-curriculum-page">
      <div className="management-header">
        <h2>My Curriculum</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {curriculum.length === 0 && !loading && (
        <div className="no-data">No curriculum data found. Please contact your administrator.</div>
      )}

      {yearLevels.length > 0 && (
        <div className="filter-section student-curriculum-year-tabs">
          {yearLevels.map((yearLevelId) => {
            const name =
              curriculum.find(
                (item) =>
                  (item.year_level_id || item.year_level?.year_level_id) === yearLevelId
              )?.year_level_name ||
              curriculum.find(
                (item) =>
                  (item.year_level_id || item.year_level?.year_level_id) === yearLevelId
              )?.year_level?.year_level ||
              `Year ${yearLevelId}`;

            return (
              <button
                key={yearLevelId}
                type="button"
                className={
                  selectedYearLevel === yearLevelId ? 'year-tab-pill active' : 'year-tab-pill'
                }
                onClick={() => setSelectedYearLevel(yearLevelId)}
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
            {groupBySemester(selectedYearLevel).map((semester) => (
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
                          const done = enrollment?.completed;

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
                              <td>
                                {enrollment ? (
                                  <span>
                                    <span
                                      className={`status-badge status-${(enrollment.status || '')
                                        .toLowerCase()
                                        .replace(/\s+/g, '-')}`}
                                    >
                                      {enrollment.status || '—'}
                                    </span>
                                    {enrollment.grade != null && enrollment.grade !== '' && (
                                      <span className="student-curriculum-grade">
                                        {' '}
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
