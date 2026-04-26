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
        <div className="academic-management__subtitle-block">
          <p className="academic-management__subtitle">
            Record prior school and transcript courses here (one intake row in the table = one batch of courses).
            Equivalences are defined once and reused for many students—that is the usual “use it over and over” your
            instructor means, not duplicating the same outside course twice on one record.
          </p>
          <details className="academic-management__crediting-details">
            <summary>How crediting fits together</summary>
            <ol className="academic-management__crediting-steps">
              <li>
                <strong>Intake (this screen):</strong> Stores outside courses under a school name. Each external course
                appears once per transfer record.
              </li>
              <li>
                <strong>Equivalence (catalog rule):</strong> “Outside course X = catalog PEN Y.” That rule applies to{' '}
                <strong>every student</strong> who brings course X—reusable without retyping.
              </li>
              <li>
                <strong>Curriculum (Evaluation → Student):</strong> Use the link on a PEN row, pick the student’s
                external line, save. The row can show <strong>Credited</strong> when it matches their intake. For one
                student, the same outside line cannot credit two different PEN subjects.
              </li>
            </ol>
          </details>
        </div>
      </div>

      <div className="table-container academic-management__body">
        <CreditEvaluationManagement studentInformationMode />
      </div>
    </div>
  );
};

export default AcademicManagement;
