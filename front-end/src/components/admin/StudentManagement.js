import React, { useState } from 'react';
import UserManagement from './UserManagement';
import CsvImport from './CsvImport';
import './StudentManagement.css';

/**
 * Student accounts only (Student role) + CSV import for student profiles.
 */
const StudentManagement = () => {
  const [section, setSection] = useState('list');

  return (
    <div className="student-management">
      <div className="student-management__header">
        <h2>Student Management</h2>
        <p className="student-management__subtitle">
          Manage student login accounts and profiles, or bulk-import student rows from CSV.
        </p>
      </div>

      <div className="student-management__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={section === 'list'}
          className={`student-management__tab ${section === 'list' ? 'active' : ''}`}
          onClick={() => setSection('list')}
        >
          Students
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'import'}
          className={`student-management__tab ${section === 'import' ? 'active' : ''}`}
          onClick={() => setSection('import')}
        >
          Import CSV
        </button>
      </div>

      <div className="student-management__panel" role="tabpanel">
        {section === 'list' && <UserManagement userScope="students" />}
        {section === 'import' && (
          <CsvImport
            restrictToImportKeys={['sis_grade_deliberation']}
            hideImportType
            sisFileHeadersOnly
            pageTitle="Import from SIS (CSV)"
            pageSubtitle="Upload a Grade Deliberation CSV or tab-delimited export. Your file’s first row should use the column headers below."
          />
        )}
      </div>
    </div>
  );
};

export default StudentManagement;
