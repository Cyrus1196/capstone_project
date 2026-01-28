import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const StudentCurriculum = () => {
  const { user } = useAuth();
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
      // Fetch curriculum for student's program
      const response = await api.get('/students/curriculum');
      const curriculumData = response.data.curriculum || response.data || [];
      setCurriculum(curriculumData);
      
      // Extract unique year levels
      const uniqueYearLevels = [...new Set(curriculumData.map(item => 
        item.year_level_id || item.year_level?.year_level_id
      ))].sort();
      setYearLevels(uniqueYearLevels);
      
      if (uniqueYearLevels.length > 0 && !selectedYearLevel) {
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
      // Don't show error, just continue without enrollment data
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
          completed: enrollment.status === 'completed' || parseFloat(enrollment.grade || 0) >= 70,
        }
      : null;
  };

  const getPrerequisites = (subject) => {
    if (subject.prerequisites && subject.prerequisites.length > 0) {
      return subject.prerequisites.map(p => p.subject_code || p.prereq_subject_code).join(', ');
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
      const semesterName = item.semester_name || item.semester?.semester_name || 'Unknown';
      
      if (!grouped[semesterId]) {
        grouped[semesterId] = {
          id: semesterId,
          name: semesterName,
          subjects: [],
        };
      }
      grouped[semesterId].subjects.push(item);
    });

    return Object.values(grouped).sort((a, b) => a.id - b.id);
  };

  if (loading) {
    return <div className="loading-message">Loading curriculum...</div>;
  }

  return (
    <div className="student-curriculum">
      <div className="curriculum-header">
        <h2>My Curriculum</h2>
        {error && <div className="error-message">{error}</div>}
      </div>

      {curriculum.length === 0 && !loading && (
        <div className="empty-state">
          <p>No curriculum data found. Please contact your administrator.</p>
        </div>
      )}

      {yearLevels.length > 0 && (
        <div className="year-level-tabs">
          {yearLevels.map((yearLevelId) => {
            const yearLevelName = curriculum.find(
              (item) => (item.year_level_id || item.year_level?.year_level_id) === yearLevelId
            )?.year_level_name || curriculum.find(
              (item) => (item.year_level_id || item.year_level?.year_level_id) === yearLevelId
            )?.year_level?.year_level || `Year ${yearLevelId}`;
            
            return (
              <button
                key={yearLevelId}
                className={selectedYearLevel === yearLevelId ? 'year-tab active' : 'year-tab'}
                onClick={() => setSelectedYearLevel(yearLevelId)}
              >
                {yearLevelName}
              </button>
            );
          })}
        </div>
      )}

      {selectedYearLevel && (
        <div className="curriculum-content">
          {groupBySemester(selectedYearLevel).map((semester) => (
            <div key={semester.id} className="semester-section">
              <h3 className="semester-title">{semester.name}</h3>
              <div className="subjects-grid">
                {semester.subjects.map((subject) => {
                  const enrollment = getEnrollmentStatus(
                    subject.subject_id || subject.subject?.subject_id
                  );
                  const isCompleted = enrollment?.completed || false;
                  
                  return (
                    <div
                      key={subject.curriculum_id || subject.subject_id}
                      className={`subject-card ${isCompleted ? 'completed' : ''} ${
                        enrollment ? 'enrolled' : ''
                      }`}
                    >
                      <div className="subject-header">
                        <span className="subject-code">
                          {subject.subject_code || subject.subject?.subject_code}
                        </span>
                        <span className="subject-units">
                          {subject.units || subject.subject?.number_of_units || 0} units
                        </span>
                      </div>
                      <div className="subject-name">
                        {subject.subject_name || subject.subject?.subject_name}
                      </div>
                      <div className="subject-details">
                        <div className="detail-row">
                          <span className="detail-label">Type:</span>
                          <span>{subject.subject_type || '-'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Prerequisites:</span>
                          <span className="prerequisites">{getPrerequisites(subject)}</span>
                        </div>
                        {enrollment && (
                          <div className="detail-row">
                            <span className="detail-label">Status:</span>
                            <span className={`status-badge status-${enrollment.status?.toLowerCase()}`}>
                              {enrollment.status}
                            </span>
                            {enrollment.grade && (
                              <span className="grade-badge" style={{ marginLeft: '10px' }}>
                                Grade: {enrollment.grade}
                              </span>
                            )}
                          </div>
                        )}
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
  );
};

export default StudentCurriculum;

