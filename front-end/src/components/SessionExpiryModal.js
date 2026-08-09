import React from 'react';
import { createPortal } from 'react-dom';
import './SessionExpiryModal.css';

/**
 * Shown before idle logout (see useIdleLogout + AuthContext).
 */
const SessionExpiryModal = ({ open, secondsLeft, onContinue, onLogout }) => {
  if (!open) return null;

  return createPortal(
    <div className="session-expiry-overlay" role="presentation">
      <div
        className="session-expiry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expiry-title"
        aria-describedby="session-expiry-desc"
      >
        <div className="session-expiry-modal__icon" aria-hidden>
          <span className="session-expiry-modal__icon-inner">!</span>
        </div>
        <h2 id="session-expiry-title" className="session-expiry-modal__title">
          Your session is about to expire!
        </h2>
        <p id="session-expiry-desc" className="session-expiry-modal__text">
          You will be logged out in <strong>{secondsLeft}</strong>{' '}
          {secondsLeft === 1 ? 'second' : 'seconds'}.
        </p>
        <div className="session-expiry-modal__actions">
          <button type="button" className="session-expiry-modal__btn session-expiry-modal__btn--continue" onClick={onContinue}>
            Continue
          </button>
          <button type="button" className="session-expiry-modal__btn session-expiry-modal__btn--logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SessionExpiryModal;
