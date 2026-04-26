import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import SearchableSelect from './SearchableSelect';
import { swalConfirm, swalError, swalToast } from '../../utils/swal';
import './SubjectEquivalenceQuickModal.css';

/**
 * Quick “other school subject → local subject” mapping without leaving evaluation.
 * Props: open, onClose, fixedLocal (optional), onSaved (optional), rosterStudentId (optional — from curriculum view, sent as for_student_id).
 * fixedLocal may include transfer_credit_other_subject_id to pre-select the external course when reopening a Credited row.
 * Catalog reuse is per prior-school course + local subject pair only (same case, same equivalence).
 */
function SubjectEquivalenceQuickModal({
  open,
  onClose,
  fixedLocal,
  onSaved,
  rosterStudentId = null,
}) {
  const [otherSchoolSubjects, setOtherSchoolSubjects] = useState([]);
  const [localSubjects, setLocalSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ossId, setOssId] = useState('');
  const [localSubjectId, setLocalSubjectId] = useState('');
  const [creditedUnits, setCreditedUnits] = useState('');
  const [creditBasis, setCreditBasis] = useState('');
  const [remarks, setRemarks] = useState('');
  /** OSS id on the student's transfer line when the modal opened (for remove / remap). */
  const [linkedTransferOtherId, setLinkedTransferOtherId] = useState(null);
  const rosterStudentNumeric = useMemo(() => {
    const rs = rosterStudentId != null && rosterStudentId !== '' ? Number(rosterStudentId) : NaN;
    return Number.isInteger(rs) && rs > 0 ? rs : null;
  }, [rosterStudentId]);

  useEffect(() => {
    if (!open) return;
    setCreditedUnits('');
    setCreditBasis('');
    setRemarks('');
    setLocalSubjectId(fixedLocal?.id != null ? String(fixedLocal.id) : '');
    const pre =
      fixedLocal?.transfer_credit_other_subject_id ?? fixedLocal?.transferCreditOtherSubjectId;
    const preNum = pre != null && pre !== '' ? Number(pre) : NaN;
    const linked = Number.isInteger(preNum) && preNum > 0 ? preNum : null;
    setLinkedTransferOtherId(linked);
    setOssId(linked != null ? String(linked) : '');
  }, [open, fixedLocal]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const ossPromise = api.get('/other-school-subjects');
        const subjPromise =
          fixedLocal?.id != null ? Promise.resolve({ data: [] }) : api.get('/lookup/subjects');
        const [ossRes, subjRes] = await Promise.all([ossPromise, subjPromise]);
        if (cancelled) return;
        setOtherSchoolSubjects(ossRes.data || []);
        if (fixedLocal?.id == null) {
          setLocalSubjects(subjRes.data || []);
        } else {
          setLocalSubjects([]);
        }
      } catch (e) {
        if (!cancelled) {
          await swalError('Load failed', e.response?.data?.message || 'Could not load subject lists.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, fixedLocal]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  const ossOptions = useMemo(
    () =>
      (otherSchoolSubjects || []).map((s) => ({
        value: String(s.other_subject_id),
        label: `${s.subject_code ?? '—'} — ${s.subject_name ?? '—'}`,
      })),
    [otherSchoolSubjects]
  );

  const localOptions = useMemo(
    () =>
      (localSubjects || []).map((s) => ({
        value: String(s.subject_id),
        label: `${s.subject_code ?? '—'} — ${s.subject_name ?? '—'}`,
      })),
    [localSubjects]
  );

  const effectiveLocalId =
    fixedLocal?.id != null ? String(fixedLocal.id) : localSubjectId;

  const canRemoveStudentTransferLink =
    rosterStudentNumeric != null &&
    fixedLocal?.id != null &&
    linkedTransferOtherId != null &&
    effectiveLocalId &&
    Number.parseInt(effectiveLocalId, 10) > 0;

  const handleRemoveMapping = async () => {
    if (!canRemoveStudentTransferLink) return;
    const ok = await swalConfirm({
      title: 'Remove credit mapping?',
      text: 'This student will no longer receive curriculum credit for this PEN subject from the selected prior-school course. The global equivalence catalog is not deleted.',
      icon: 'warning',
      confirmButtonText: 'Remove link',
      cancelButtonText: 'Cancel',
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const { data } = await api.post('/subject-equivalences/clear-student-mapping', {
        for_student_id: rosterStudentNumeric,
        subject_id: Number.parseInt(effectiveLocalId, 10),
        other_subject_id: linkedTransferOtherId,
      });
      const n = Number(data?.cleared_rows ?? 0);
      swalToast('success', n > 0 ? data.message || 'Link removed.' : data.message || 'No rows updated.');
      onSaved?.();
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Remove failed';
      await swalError('Could not remove mapping', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otherId = ossId ? parseInt(ossId, 10) : NaN;
    const subjId = effectiveLocalId ? parseInt(effectiveLocalId, 10) : NaN;
    if (!Number.isInteger(otherId) || otherId < 1) {
      await swalError('Other school subject required', 'Select the external (other school) course.');
      return;
    }
    if (!Number.isInteger(subjId) || subjId < 1) {
      await swalError('Local subject required', 'Select the catalog subject this course should count as.');
      return;
    }

    let credited = null;
    if (String(creditedUnits).trim() !== '') {
      const n = parseInt(creditedUnits, 10);
      if (!Number.isInteger(n) || n < 0) {
        await swalError('Invalid units', 'Credited units must be a whole number or left blank.');
        return;
      }
      credited = n;
    }

    setSubmitting(true);
    try {
      const payload = {
        other_school_subject: otherId,
        subject_id: subjId,
        credited_units: credited,
        credit_basis: String(creditBasis || '').trim() || null,
        status: 'active',
        remarks: String(remarks || '').trim() || null,
      };
      if (rosterStudentNumeric != null) {
        payload.for_student_id = rosterStudentNumeric;
      }
      if (
        rosterStudentNumeric != null &&
        linkedTransferOtherId != null &&
        linkedTransferOtherId !== otherId
      ) {
        payload.from_other_subject_id = linkedTransferOtherId;
      }
      const { data: resBody } = await api.post('/subject-equivalences', payload);
      const n = Number(resBody?.updated_pending_credit_lines ?? 0);
      const batches = Number(resBody?.linked_transfer_intake_batches ?? 0);
      const synth = Number(resBody?.synthesized_student_credit_line ?? 0);
      if (synth > 0 && n > 0 && batches > 0) {
        swalToast(
          'success',
          `Equivalence saved. ${n} intake line(s) mapped; ${batches} batch(es) linked; a student transfer line was added so this row can show Credited.`
        );
      } else if (synth > 0 && n > 0) {
        swalToast(
          'success',
          `Equivalence saved. ${n} intake line(s) mapped and a transfer line was added for this student so the curriculum can show Credited.`
        );
      } else if (synth > 0 && batches > 0) {
        swalToast(
          'success',
          `Equivalence saved. ${batches} batch(es) linked and a transfer line was added for this student so the curriculum can show Credited.`
        );
      } else if (synth > 0) {
        swalToast(
          'success',
          'Subject equivalence saved. A transfer line was recorded for this student for that prior-school course so this PEN row can show Credited.'
        );
      } else if (n > 0 && batches > 0) {
        swalToast(
          'success',
          `Equivalence saved. ${n} intake line(s) mapped to this subject; ${batches} transfer batch(es) linked to this student for curriculum credit.`
        );
      } else if (n > 0) {
        swalToast(
          'success',
          `Equivalence saved. ${n} transfer intake line(s) that had no local subject yet were linked to this catalog course.`
        );
      } else if (batches > 0) {
        swalToast(
          'success',
          `Equivalence saved. ${batches} transfer batch(es) linked to this student so credited subjects appear on the curriculum grid.`
        );
      } else {
        swalToast(
          'success',
          'Subject equivalence saved. New transfer entries that use this external course can match this local subject automatically.'
        );
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Save failed';
      await swalError('Could not save equivalence', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title =
    fixedLocal?.id != null
      ? 'Map a prior-school course to this curriculum subject'
      : 'Add subject equivalence';

  return (
    <div
      className="seq-equiv-overlay"
      role="presentation"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="seq-equiv-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seq-equiv-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="seq-equiv-dialog__head">
          <div>
            <h2 id="seq-equiv-title" className="seq-equiv-dialog__title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="seq-equiv-dialog__close"
            onClick={() => !submitting && onClose()}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="seq-equiv-dialog__body">
          {loading ? <div className="seq-equiv-dialog__loading">Loading lists…</div> : null}

          <form onSubmit={handleSubmit}>
            {fixedLocal?.id != null ? (
              <div className="seq-equiv-dialog__form-group">
                <label>Local subject (this row)</label>
                <div className="seq-equiv-dialog__local-readonly">
                  <strong>{fixedLocal.code || '—'}</strong>
                  {fixedLocal.name ? ` — ${fixedLocal.name}` : ''}
                </div>
              </div>
            ) : (
              <div className="seq-equiv-dialog__form-group">
                <label htmlFor="seq-equiv-local">
                  Local catalog subject <span className="required">*</span>
                </label>
                <SearchableSelect
                  id="seq-equiv-local"
                  value={localSubjectId}
                  onChange={(v) => setLocalSubjectId(v || '')}
                  options={localOptions}
                  emptyLabel="Select subject"
                  placeholder="Search by code or title…"
                  required
                  aria-label="Local catalog subject"
                  disabled={loading}
                />
              </div>
            )}

            <div className="seq-equiv-dialog__form-group">
              <label htmlFor="seq-equiv-oss">
                Other school subject <span className="required">*</span>
              </label>
              <SearchableSelect
                id="seq-equiv-oss"
                value={ossId}
                onChange={(v) => setOssId(v || '')}
                options={ossOptions}
                emptyLabel="Select external course"
                placeholder="Search code or course name…"
                required
                aria-label="Other school subject"
                disabled={loading}
              />
            </div>

            <div className="seq-equiv-dialog__form-group">
              <label htmlFor="seq-equiv-units">Credited units</label>
              <input
                id="seq-equiv-units"
                type="number"
                min="0"
                value={creditedUnits}
                onChange={(e) => setCreditedUnits(e.target.value)}
                placeholder="Optional — defaults can follow school policy"
                disabled={loading || submitting}
              />
            </div>

            <div className="seq-equiv-dialog__form-group">
              <label htmlFor="seq-equiv-basis">Credit basis</label>
              <input
                id="seq-equiv-basis"
                type="text"
                value={creditBasis}
                onChange={(e) => setCreditBasis(e.target.value)}
                placeholder="e.g. TOR, syllabus"
                maxLength={50}
                disabled={loading || submitting}
              />
            </div>

            <div className="seq-equiv-dialog__form-group">
              <label htmlFor="seq-equiv-remarks">Remarks</label>
              <textarea
                id="seq-equiv-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={loading || submitting}
              />
            </div>

            <div className="seq-equiv-dialog__actions">
              <div className="seq-equiv-dialog__actions-left">
                {canRemoveStudentTransferLink ? (
                  <button
                    type="button"
                    className="seq-equiv-dialog__btn-remove"
                    onClick={handleRemoveMapping}
                    disabled={loading || submitting}
                  >
                    Remove mapping
                  </button>
                ) : null}
              </div>
              <div className="seq-equiv-dialog__actions-right">
                <button
                  type="button"
                  className="seq-equiv-dialog__btn-cancel"
                  onClick={() => !submitting && onClose()}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="seq-equiv-dialog__btn-save"
                  disabled={loading || submitting}
                >
                  {submitting ? 'Saving…' : 'Save equivalence'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SubjectEquivalenceQuickModal;
