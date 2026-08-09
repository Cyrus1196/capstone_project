/** Shared pending-request counter for global loading UI (axios interceptors). */

let pending = 0;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(pending);
    } catch {
      // ignore subscriber errors
    }
  });
}

export function beginRequestLoading() {
  pending += 1;
  notify();
}

export function endRequestLoading() {
  pending = Math.max(0, pending - 1);
  notify();
}

export function getPendingRequestCount() {
  return pending;
}

/** @param {(count: number) => void} listener */
export function subscribeRequestLoading(listener) {
  listeners.add(listener);
  listener(pending);
  return () => listeners.delete(listener);
}

export function shouldTrackRequestLoading(config) {
  if (!config) return true;
  if (config.silent === true || config.skipLoading === true) return false;
  const url = String(config.url || '');
  if (url.includes('/jwt/refresh')) return false;
  return true;
}
