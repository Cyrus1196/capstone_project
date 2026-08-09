import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_IDLE_MS = 60 * 60 * 1000; // 1 hour

function throttle(fn, wait) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    }
  };
}

/**
 * After idleMs with no user activity, calls onIdleLogout.
 * Any activity (input, scroll, API success, tab focus) restarts the idle window from zero.
 *
 * @param {object} opts
 * @param {boolean} opts.enabled
 * @param {() => void} opts.onIdleLogout
 * @param {number} opts.idleMs
 * @param {number} [opts.warnBeforeLogoutMs=60000] — show warning this many ms before logout; set 0 to disable
 * @param {(evt: { type: 'open'|'tick'|'close'; secondsLeft?: number }) => void} [opts.onSessionWarning]
 */
export function useIdleLogout({
  enabled,
  onIdleLogout,
  idleMs,
  warnBeforeLogoutMs = 60000,
  onSessionWarning,
}) {
  const logoutTimeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const idleMsRef = useRef(idleMs ?? DEFAULT_IDLE_MS);
  idleMsRef.current = idleMs ?? DEFAULT_IDLE_MS;
  const onIdleLogoutRef = useRef(onIdleLogout);
  onIdleLogoutRef.current = onIdleLogout;
  const onSessionWarningRef = useRef(onSessionWarning);
  onSessionWarningRef.current = onSessionWarning;
  const lastActivityRef = useRef(Date.now());

  const clearAllTimers = useCallback(() => {
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    onSessionWarningRef.current?.({ type: 'close' });

    if (!enabled) {
      return;
    }

    const total = idleMsRef.current;
    lastActivityRef.current = Date.now();

    const rawWarn = Number(warnBeforeLogoutMs) > 0 ? Number(warnBeforeLogoutMs) : 0;
    const warnMs =
      rawWarn > 0 ? Math.min(rawWarn, Math.max(5000, total - 2000)) : 0;
    const canWarn =
      rawWarn > 0 && warnMs > 0 && total > warnMs + 1000 && typeof onSessionWarningRef.current === 'function';

    logoutTimeoutRef.current = setTimeout(() => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      onSessionWarningRef.current?.({ type: 'close' });
      onIdleLogoutRef.current();
    }, total);

    if (canWarn) {
      const warnDelay = total - warnMs;
      warningTimeoutRef.current = setTimeout(() => {
        const secs = Math.max(1, Math.ceil(warnMs / 1000));
        onSessionWarningRef.current?.({ type: 'open', secondsLeft: secs });

        countdownIntervalRef.current = setInterval(() => {
          const end = lastActivityRef.current + idleMsRef.current;
          const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
          if (left <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return;
          }
          onSessionWarningRef.current?.({ type: 'tick', secondsLeft: left });
        }, 1000);
      }, warnDelay);
    }
  }, [enabled, clearAllTimers, warnBeforeLogoutMs]);

  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      onSessionWarningRef.current?.({ type: 'close' });
      return undefined;
    }

    resetTimer();

    const throttledReset = throttle(resetTimer, 1000);
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
    events.forEach((e) => window.addEventListener(e, throttledReset, { passive: true }));

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        resetTimer();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onAppActivity = () => resetTimer();
    window.addEventListener('app-activity', onAppActivity);

    return () => {
      clearAllTimers();
      onSessionWarningRef.current?.({ type: 'close' });
      events.forEach((e) => window.removeEventListener(e, throttledReset));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('app-activity', onAppActivity);
    };
  }, [enabled, resetTimer, idleMs, clearAllTimers]);
}
