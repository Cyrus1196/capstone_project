/**
 * Persist idle-session activity so timeout still applies after tab close,
 * browser suspend (common on phones), or returning to /login with a leftover JWT.
 */

const ACTIVITY_KEY = 'aes_session_last_activity_at';
const IDLE_MS_KEY = 'aes_session_idle_ms';

const DEFAULT_IDLE_MS = 30 * 60 * 1000;

export function getStoredIdleMs() {
  try {
    const n = Number(localStorage.getItem(IDLE_MS_KEY));
    if (Number.isFinite(n) && n >= 1000) {
      return n;
    }
  } catch {
    // ignore
  }
  return DEFAULT_IDLE_MS;
}

export function setStoredIdleMs(ms) {
  try {
    const n = Number(ms);
    if (Number.isFinite(n) && n >= 1000) {
      localStorage.setItem(IDLE_MS_KEY, String(Math.floor(n)));
    }
  } catch {
    // ignore
  }
}

export function getLastActivityAt() {
  try {
    const n = Number(localStorage.getItem(ACTIVITY_KEY));
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  } catch {
    // ignore
  }
  return null;
}

export function touchSessionActivity(at = Date.now()) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(at));
  } catch {
    // ignore
  }
  return at;
}

export function clearSessionActivity() {
  try {
    localStorage.removeItem(ACTIVITY_KEY);
    localStorage.removeItem(IDLE_MS_KEY);
  } catch {
    // ignore
  }
}

/** True when stored last activity is older than the idle window. */
export function isSessionIdleExpired(now = Date.now(), idleMs = getStoredIdleMs()) {
  const last = getLastActivityAt();
  if (last == null) {
    return false;
  }
  const windowMs = Number(idleMs);
  if (!Number.isFinite(windowMs) || windowMs < 1000) {
    return false;
  }
  return now - last >= windowMs;
}

/**
 * If idle window already elapsed, clear JWT + activity markers.
 * @returns {boolean} true when the session was expired and cleared
 */
export function expireClientSessionIfIdle(removeToken) {
  if (!isSessionIdleExpired()) {
    return false;
  }
  try {
    if (typeof removeToken === 'function') {
      removeToken();
    }
  } catch {
    // ignore
  }
  clearSessionActivity();
  return true;
}
