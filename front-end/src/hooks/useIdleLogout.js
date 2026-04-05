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
 */
export function useIdleLogout({ enabled, onIdleLogout, idleMs }) {
  const timeoutRef = useRef(null);
  const idleMsRef = useRef(idleMs ?? DEFAULT_IDLE_MS);
  idleMsRef.current = idleMs ?? DEFAULT_IDLE_MS;
  const onIdleLogoutRef = useRef(onIdleLogout);
  onIdleLogoutRef.current = onIdleLogout;

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onIdleLogoutRef.current();
    }, idleMsRef.current);
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      events.forEach((e) => window.removeEventListener(e, throttledReset));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('app-activity', onAppActivity);
    };
  }, [enabled, resetTimer, idleMs]);
}
