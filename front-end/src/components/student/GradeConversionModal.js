import React from 'react';
import { getPs50Rows, getPs60Rows } from '../../utils/gradePercentageConversion';
import './GradeConversionModal.css';

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
const GradeConversionModal = ({ open, onClose }) => {
  if (!open) return null;

  const ps50 = getPs50Rows();
  const ps60 = getPs60Rows();

  return (
    <div
      className="grade-conv-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grade-conv-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="grade-conv-modal">
        <div className="grade-conv-modal-head">
          <h3 id="grade-conv-modal-title">Grade → percentage conversion</h3>
          <button type="button" className="grade-conv-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="grade-conv-modal-intro">
          Your curriculum lists grades as a <strong>percentage score (50–100)</strong>, matching how
          evaluators enter them. Subjects use the table that matches the <strong>Passing grade</strong> column
          (50 → standard; 60 → PS-60). Use <strong>Show 1.00–5.00 equivalent</strong> on My Curriculum to see the
          grade-point band for each row.
        </p>

        <div className="grade-conv-tables">
          <section className="grade-conv-section">
            <h4>Standard scale (50% passing)</h4>
            <div className="grade-conv-table-wrap">
              <table className="grade-conv-table">
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Percentage score</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {ps50.map((r) => (
                    <tr key={r.grade}>
                      <td>{r.grade}</td>
                      <td>{r.pct}</td>
                      <td>{r.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grade-conv-section">
            <h4>PS-60 (60% passing subjects)</h4>
            <div className="grade-conv-table-wrap">
              <table className="grade-conv-table">
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Percentage score</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {ps60.map((r) => (
                    <tr key={r.grade}>
                      <td>{r.grade}</td>
                      <td>{r.pct}</td>
                      <td>{r.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="grade-conv-modal-actions">
          <button type="button" className="grade-conv-modal-ok" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradeConversionModal;
