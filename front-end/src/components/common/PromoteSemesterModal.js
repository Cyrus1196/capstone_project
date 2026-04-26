import React, { useState, useEffect, useRef } from 'react';
import './PromoteSemesterModal.css';

function electiveChoiceLabel(c) {
  const tn = [c.track_name, c.track_code].filter(Boolean).join(' ').trim();
  const sn = (c.subject_name || '').trim();
  const sc = (c.subject_code || '').trim();
  if (tn && sn) return `${tn} — ${sn}${sc ? ` (${sc})` : ''}`;
  if (sn) return `${sn}${sc ? ` (${sc})` : ''}`;
  return sc || 'Elective option';
}

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
 *   rows: Array<{
 *     penCode: string,
 *     title: string,
 *     units: string|number,
 *     prerequisite: string,
 *     electivePending?: boolean,
 *     electiveChoices?: Array<Record<string, unknown>>,
 *   }>,
 *   totalUnits: number,
 *   evaluatedBy: string,
 *   onEvaluatedByChange: (e: import('react').ChangeEvent<HTMLInputElement>) => void,
 *   trackPickerVisible?: boolean,
 *   trackPickerRequired?: boolean,
 *   trackPickerOptions?: Array<{ value: string, label: string }>,
 *   trackPickerValue?: string,
 *   onTrackPickerChange?: (e: import('react').ChangeEvent<HTMLSelectElement>) => void,
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
  trackPickerVisible = false,
  trackPickerRequired = false,
  trackPickerOptions = [],
  trackPickerValue = '',
  onTrackPickerChange,
}) => {
  const [electivePopoverRow, setElectivePopoverRow] = useState(null);
  const electivePopoverRef = useRef(null);

  useEffect(() => {
    if (!open) setElectivePopoverRow(null);
  }, [open]);

  useEffect(() => {
    if (electivePopoverRow == null) return undefined;
    const onDoc = (e) => {
      const el = electivePopoverRef.current;
      if (el && !el.contains(e.target)) setElectivePopoverRow(null);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setElectivePopoverRow(null);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [electivePopoverRow]);

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
                        {r.electivePending && (r.electiveChoices?.length ?? 0) > 0 ? (
                          <div
                            className="promote-modal__pen-attach"
                            ref={electivePopoverRow === idx ? electivePopoverRef : undefined}
                          >
                            <button
                              type="button"
                              className="promote-modal__pill promote-modal__pill--elective"
                              aria-expanded={electivePopoverRow === idx}
                              aria-haspopup="listbox"
                              onClick={() =>
                                setElectivePopoverRow((cur) => (cur === idx ? null : idx))
                              }
                              disabled={saving || typeof onTrackPickerChange !== 'function'}
                              title="Choose track for this elective"
                            >
                              {r.penCode || '—'}
                            </button>
                            {electivePopoverRow === idx ? (
                              <div className="promote-modal__elective-popover" role="presentation">
                                <span className="promote-modal__elective-popover-label">
                                  Select track
                                </span>
                                <select
                                  className="promote-modal__elective-popover-select"
                                  value={trackPickerValue}
                                  onChange={(e) => {
                                    onTrackPickerChange?.(e);
                                    setElectivePopoverRow(null);
                                  }}
                                  disabled={saving}
                                  autoComplete="off"
                                >
                                  <option value="">Select track…</option>
                                  {(r.electiveChoices || []).map((c) => (
                                    <option
                                      key={c.elective_subject_id}
                                      value={String(c.track_id)}
                                    >
                                      {electiveChoiceLabel(c)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="promote-modal__pill">{r.penCode || '—'}</span>
                        )}
                      </td>
                      <td>
                        {r.electivePending && (r.electiveChoices?.length ?? 0) > 0 ? (
                          <>
                            <button
                              type="button"
                              className="promote-modal__title-cell promote-modal__title-cell--elective"
                              onClick={() =>
                                setElectivePopoverRow((cur) => (cur === idx ? null : idx))
                              }
                              disabled={saving || typeof onTrackPickerChange !== 'function'}
                              aria-expanded={electivePopoverRow === idx}
                              aria-haspopup="listbox"
                              title="Choose track for this elective (opens list next to Pen Code)"
                            >
                              {r.title || '—'}
                            </button>
                            <span className="promote-modal__title-hint">
                              Click this title or <strong>Pen Code</strong> — same track picker.
                            </span>
                          </>
                        ) : (
                          <span className="promote-modal__title-cell">{r.title || '—'}</span>
                        )}
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

          {trackPickerVisible ? (
            <div className="promote-modal__track-panel">
              <label className="promote-modal__track-label" htmlFor="promote-modal-track">
                <i className="fa-solid fa-route" aria-hidden />
                Track (elective slot)
                {trackPickerRequired ? <span className="promote-modal__req"> *</span> : null}
              </label>
              <select
                id="promote-modal-track"
                className="promote-modal__track-select"
                value={trackPickerValue}
                onChange={onTrackPickerChange}
                disabled={saving || typeof onTrackPickerChange !== 'function'}
              >
                <option value="">{trackPickerRequired ? 'Select track…' : '— Optional —'}</option>
                {trackPickerOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="promote-modal__track-help">
                {trackPickerRequired
                  ? 'This term includes a track-based elective. The table above updates when you choose a track.'
                  : 'Set or confirm the student’s track so elective rows map to the correct subject.'}
              </p>
            </div>
          ) : null}
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
            disabled={
              saving ||
              !String(evaluatedBy || '').trim() ||
              (trackPickerRequired && !String(trackPickerValue || '').trim())
            }
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoteSemesterModal;
