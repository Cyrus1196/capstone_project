import React, { useEffect } from 'react';
import CreditEvaluationManagement from './CreditEvaluationManagement';
import './AcademicManagement.css';

/**
 * Dean / Admin: external transfer intake (transcript / prior institution), not the same as
 * Evaluation → Student (enrolled curriculum review). OSS catalog and equivalences are maintained via API / admin.
 */
const AcademicManagement = ({ remountKey = 0 }) => {
  useEffect(() => {
    const openCredit = sessionStorage.getItem('creditEvalOpenCreditTab');
    const focusTab = sessionStorage.getItem('academicMgmtFocusTab');

    if (openCredit === '1') {
      sessionStorage.removeItem('creditEvalOpenCreditTab');
      sessionStorage.removeItem('academicMgmtEquivPrefillSubjectId');
      if (focusTab) sessionStorage.removeItem('academicMgmtFocusTab');
    } else if (focusTab) {
      sessionStorage.removeItem('academicMgmtFocusTab');
      sessionStorage.removeItem('academicMgmtEquivPrefillSubjectId');
    }

    sessionStorage.removeItem('creditEvalPrefillStudentId');
  }, [remountKey]);

  return (
    <div className="academic-management academic-management--student-information">
      <div className="management-header management-header--stacked">
        <h2>Student information</h2>
      </div>

      <div className="table-container academic-management__body">
        <CreditEvaluationManagement studentInformationMode />
      </div>
    </div>
  );
};

export default AcademicManagement;
