import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { swalToast, swalError } from '../../utils/swal';
import './SecuritySettings.css';

const emptyForm = {
  max_password_length: 64,
  password_expiry_days: 90,
  session_timeout_minutes: 30,
  student_session_timeout_minutes: 30,
  lockout_attempts: 5,
  lockout_duration_minutes: 15,
};

/**
 * @param {{ showBackLink?: boolean }} props
 */
const SecuritySettings = ({ showBackLink = false }) => {
  const navigate = useNavigate();
  const { refreshSessionPolicy } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/settings/security');
      const n = (v, fallback) => {
        const x = Number(v);
        return Number.isFinite(x) ? x : fallback;
      };
      setForm({
        max_password_length: n(data.max_password_length, 64),
        password_expiry_days: n(data.password_expiry_days, 90),
        session_timeout_minutes: n(data.session_timeout_minutes, 30),
        student_session_timeout_minutes: n(
          data.student_session_timeout_minutes,
          n(data.session_timeout_minutes, 30)
        ),
        lockout_attempts: n(data.lockout_attempts, 5),
        lockout_duration_minutes: n(data.lockout_duration_minutes, 15),
      });
    } catch (err) {
      swalError('Load failed', err.response?.data?.message || 'Could not load security settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onChange = (key) => (e) => {
    const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
    setForm((prev) => ({ ...prev, [key]: Number.isNaN(v) ? '' : v }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    const payload = {
      max_password_length: Number(form.max_password_length),
      password_expiry_days: Number(form.password_expiry_days),
      session_timeout_minutes: Number(form.session_timeout_minutes),
      student_session_timeout_minutes: Number(form.student_session_timeout_minutes),
      lockout_attempts: Number(form.lockout_attempts),
      lockout_duration_minutes: Number(form.lockout_duration_minutes),
    };
    if (Object.values(payload).some((n) => Number.isNaN(n))) {
      swalError('Invalid values', 'Please enter valid numbers in all fields.');
      return;
    }
    try {
      setSaving(true);
      await api.put('/settings/security', payload);
      swalToast('success', 'Security settings saved.');
      await load();
      await refreshSessionPolicy();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && JSON.stringify(err.response.data.errors)) ||
        'Save failed.';
      swalError('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="security-settings security-settings--loading">Loading security settings…</div>;
  }

  return (
    <div className="security-settings">
      {showBackLink && (
        <button type="button" className="security-settings__back" onClick={() => navigate('/admin')}>
          ← Admin panel
        </button>
      )}

      <div className="security-settings__card">
        <header className="security-settings__header">
          <h2>Security Settings</h2>
          <p className="security-settings__subtitle">
            Save the password, expiry, timeout, and lockout rules used by the system.
          </p>
        </header>

        <form onSubmit={onSave} className="security-settings__form">
          <div className="security-settings__row">
            <div className="security-settings__label-block">
              <label htmlFor="sec-max-pw-len">Maximum password length</label>
              <p className="security-settings__hint">Default 64. Allowed range: 6 to 256 characters.</p>
            </div>
            <input
              id="sec-max-pw-len"
              type="number"
              min={6}
              max={256}
              className="security-settings__input"
              value={form.max_password_length}
              onChange={onChange('max_password_length')}
            />
          </div>

          <div className="security-settings__row">
            <div className="security-settings__label-block">
              <label htmlFor="sec-pw-expiry">Password expiry (days)</label>
              <p className="security-settings__hint">Default 90. Set to 0 to disable password expiry entirely.</p>
            </div>
            <input
              id="sec-pw-expiry"
              type="number"
              min={0}
              max={3650}
              className="security-settings__input"
              value={form.password_expiry_days}
              onChange={onChange('password_expiry_days')}
            />
          </div>

          <div className="security-settings__row">
            <div className="security-settings__label-block">
              <label htmlFor="sec-session">Session timeout (minutes)</label>
              <p className="security-settings__hint">
                Default 30. Staff and other non-student accounts are signed out after this many minutes of inactivity.
              </p>
            </div>
            <input
              id="sec-session"
              type="number"
              min={1}
              max={10080}
              className="security-settings__input"
              value={form.session_timeout_minutes}
              onChange={onChange('session_timeout_minutes')}
            />
          </div>

          <div className="security-settings__row">
            <div className="security-settings__label-block">
              <label htmlFor="sec-student-session">Student session timeout (minutes)</label>
              <p className="security-settings__hint">
                Default 30. Only accounts with the Student role use this idle limit instead of the general session
                timeout above.
              </p>
            </div>
            <input
              id="sec-student-session"
              type="number"
              min={1}
              max={10080}
              className="security-settings__input"
              value={form.student_session_timeout_minutes}
              onChange={onChange('student_session_timeout_minutes')}
            />
          </div>

          <div className="security-settings__row">
            <div className="security-settings__label-block">
              <label htmlFor="sec-lockout-attempts">Lockout after failed attempts</label>
              <p className="security-settings__hint">Default 5. Accounts lock after this many consecutive failed logins.</p>
            </div>
            <input
              id="sec-lockout-attempts"
              type="number"
              min={1}
              max={50}
              className="security-settings__input"
              value={form.lockout_attempts}
              onChange={onChange('lockout_attempts')}
            />
          </div>

          <div className="security-settings__row">
            <div className="security-settings__label-block">
              <label htmlFor="sec-lockout-mins">Lockout duration (minutes)</label>
              <p className="security-settings__hint">Default 15. Locked accounts unlock automatically after this duration.</p>
            </div>
            <input
              id="sec-lockout-mins"
              type="number"
              min={1}
              max={1440}
              className="security-settings__input"
              value={form.lockout_duration_minutes}
              onChange={onChange('lockout_duration_minutes')}
            />
          </div>

          <div className="security-settings__actions">
            <button type="button" className="security-settings__btn security-settings__btn--secondary" onClick={load}>
              Reset
            </button>
            <button type="submit" className="security-settings__btn security-settings__btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecuritySettings;
