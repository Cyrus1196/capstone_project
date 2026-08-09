import React, { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { swalError, swalToast } from '../utils/swal';
import './ForcePasswordChangeModal.css';

function passwordStrengthError(password) {
  const pwd = String(password || '');
  if (!pwd) return 'New password is required.';
  if (pwd.length < 8) return 'The password must be at least 8 characters long.';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'The password must include a special character.';
  return '';
}

/**
 * Blocks portal use until students with a default password set a new one.
 */
const ForcePasswordChangeModal = () => {
  const { user, refreshUser, applyUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user?.must_change_password) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const strengthErr = passwordStrengthError(password);
    if (strengthErr) {
      setFieldError(strengthErr);
      return;
    }
    if (password !== passwordConfirmation) {
      setFieldError('New password and confirmation do not match.');
      return;
    }
    if (!currentPassword) {
      setFieldError('Enter your current (default) password.');
      return;
    }

    setFieldError('');
    setSubmitting(true);
    try {
      const response = await api.post('/password/change', {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      if (response.data?.user) {
        applyUser(response.data.user);
      } else {
        await refreshUser();
      }
      swalToast('success', 'Password updated');
    } catch (error) {
      const data = error.response?.data;
      const msg =
        data?.errors?.current_password?.[0] ||
        data?.errors?.password?.[0] ||
        data?.message ||
        data?.error ||
        'Failed to change password';
      setFieldError(msg);
      await swalError('Could not update password', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="force-pwd-overlay" role="dialog" aria-modal="true" aria-labelledby="force-pwd-title">
      <div className="force-pwd-modal">
        <h2 id="force-pwd-title">Change your password</h2>
        <p className="force-pwd-lead">
          You are using a temporary default password. Set a new password to continue to the portal.
        </p>
        <form onSubmit={handleSubmit} className="force-pwd-form" noValidate>
          <label htmlFor="force-pwd-current">Current password</label>
          <input
            id="force-pwd-current"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <label htmlFor="force-pwd-new">New password</label>
          <input
            id="force-pwd-new"
            type="password"
            className={fieldError ? 'input-error' : undefined}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldError(passwordStrengthError(e.target.value));
            }}
            autoComplete="new-password"
            required
          />

          <label htmlFor="force-pwd-confirm">Confirm new password</label>
          <input
            id="force-pwd-confirm"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            autoComplete="new-password"
            required
          />

          {fieldError ? <p className="force-pwd-error">{fieldError}</p> : (
            <p className="force-pwd-hint">At least 8 characters and one special character.</p>
          )}

          <div className="force-pwd-actions">
            <button type="button" className="force-pwd-secondary" onClick={handleLogout} disabled={submitting}>
              Log out
            </button>
            <button type="submit" className="force-pwd-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save new password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChangeModal;
