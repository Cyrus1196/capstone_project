import React from 'react';
import './PromoteSemesterModal.css';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onSave: () => void | Promise<void>,
 *   saving: boolean,
 *   studentName: string,
 *   curriculumLabel: string,
 *   programLabel: string,
 *   yearLabel: string,
 *   semesterLabel: string,
 *   rows: Array<{ penCode: string, title: string, units: string|number, prerequisite: string }>,
 *   totalUnits: number,
 *   evaluatedBy: string,
 *   onEvaluatedByChange: (e: import('react').ChangeEvent<HTMLInputElement>) => void,
 * }} props
 */
const PromoteSemesterModal = ({
  open,
  onClose,
  onSave,
  saving,
  studentName,
  curriculumLabel,
  programLabel,
  yearLabel,
  semesterLabel,
  rows,
  totalUnits,
  evaluatedBy,
  onEvaluatedByChange,
}) => {
  if (!open) return null;

  return (
    <div
      className="promote-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="promote-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promote-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="promote-modal__head">
          <h2 id="promote-modal-title" className="promote-modal__title">
            {studentName}
          </h2>
          <button type="button" className="promote-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="promote-modal__meta-bar">
          <div className="promote-modal__meta-item">
            <span className="promote-modal__meta-label">
              <i className="fa-regular fa-calendar" aria-hidden />
              Curriculum
            </span>
            <span className="promote-modal__meta-value">{curriculumLabel || '—'}</span>
          </div>
          <div className="promote-modal__meta-item">
            <span className="promote-modal__meta-label">
              <i className="fa-solid fa-graduation-cap" aria-hidden />
              Program
            </span>
            <span className="promote-modal__meta-value">{programLabel || '—'}</span>
          </div>
          <div className="promote-modal__meta-item">
            <span className="promote-modal__meta-label">
              <i className="fa-regular fa-clock" aria-hidden />
              Year
            </span>
            <span className="promote-modal__meta-value">{yearLabel || '—'}</span>
          </div>
          <div className="promote-modal__meta-item">
            <span className="promote-modal__meta-label">
              <i className="fa-regular fa-bookmark" aria-hidden />
              Semester
            </span>
            <span className="promote-modal__meta-value">{semesterLabel || '—'}</span>
          </div>
        </div>

        <div className="promote-modal__body">
          <div className="promote-modal__table-wrap">
            <table className="promote-modal__table">
              <thead>
                <tr>
                  <th>Pen Code</th>
                  <th>Descriptive Title</th>
                  <th>Units</th>
                  <th>Prerequisite</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '1rem', color: '#64748b', fontStyle: 'italic' }}>
                      No courses for this term in the curriculum.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={`${r.penCode}-${idx}`}>
                      <td>
                        <span className="promote-modal__pill">{r.penCode || '—'}</span>
                      </td>
                      <td>
                        <span className="promote-modal__title-cell">{r.title || '—'}</span>
                      </td>
                      <td>
                        <span className="promote-modal__pill">{r.units ?? '—'}</span>
                      </td>
                      <td>{r.prerequisite || 'NONE'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="promote-modal__foot">
          <div className="promote-modal__eval-row">
            <label htmlFor="promote-evaluated-by">Evaluated by:</label>
            <input
              id="promote-evaluated-by"
              type="text"
              className="promote-modal__eval-input"
              value={evaluatedBy}
              onChange={onEvaluatedByChange}
              placeholder="Name of evaluator"
              autoComplete="name"
            />
          </div>
          <span className="promote-modal__total">
            Total Units:
            <span className="promote-modal__total-badge">{totalUnits}</span>
          </span>
          <button
            type="button"
            className="promote-modal__save"
            onClick={onSave}
            disabled={saving || !String(evaluatedBy || '').trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoteSemesterModal;
