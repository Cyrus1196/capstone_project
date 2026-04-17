import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIdleLogout } from '../hooks/useIdleLogout';
import SessionExpiryModal from './SessionExpiryModal';
import api, { jwtAuth } from '../api/axios';

const SESSION_WARN_BEFORE_MS = parseInt(process.env.REACT_APP_SESSION_WARN_BEFORE_MS || '60000', 10);

/**
 * Idle timeout + “session about to expire” modal. Lives outside AuthContext.js so lazy-loaded
 * routes (e.g. StudentPanel) always see a fully initialized context (avoids circular init issues).
 */
const SessionIdleController = () => {
  const { user, loading, logout, sessionIdleMs } = useAuth();
  const [sessionExpiryWarn, setSessionExpiryWarn] = useState({ open: false, secondsLeft: 60 });

  const onSessionWarning = useCallback((evt) => {
    if (evt.type === 'open') {
      setSessionExpiryWarn({
        open: true,
        secondsLeft: evt.secondsLeft ?? 60,
      });
    } else if (evt.type === 'tick') {
      setSessionExpiryWarn((s) =>
        s.open ? { ...s, secondsLeft: evt.secondsLeft ?? s.secondsLeft } : s
      );
    } else if (evt.type === 'close') {
      setSessionExpiryWarn({ open: false, secondsLeft: 60 });
    }
  }, []);

  const handleSessionContinue = useCallback(async () => {
    try {
      const res = await api.post('/jwt/refresh', {}, { silent: true });
      const next = res.data?.access_token;
      if (next) {
        jwtAuth.setToken(next);
      }
    } catch {
      // access token may still be valid; extending idle window is enough
    }
    window.dispatchEvent(new CustomEvent('app-activity'));
  }, []);

  useIdleLogout({
    enabled: !!user && !loading,
    onIdleLogout: logout,
    idleMs: sessionIdleMs,
    warnBeforeLogoutMs: SESSION_WARN_BEFORE_MS,
    onSessionWarning,
  });

  return (
    <SessionExpiryModal
      open={sessionExpiryWarn.open}
      secondsLeft={sessionExpiryWarn.secondsLeft}
      onContinue={handleSessionContinue}
      onLogout={logout}
    />
  );
};

export default SessionIdleController;
