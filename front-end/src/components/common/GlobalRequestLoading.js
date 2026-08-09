import React, { useEffect, useRef, useState } from 'react';
import { subscribeRequestLoading } from '../../api/requestLoading';
import './GlobalRequestLoading.css';

const SHOW_DELAY_MS = 200;

/**
 * Full-screen blocking loader while any tracked API request is in flight.
 * Waits briefly before showing so fast responses don't flash the overlay.
 */
export default function GlobalRequestLoading() {
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    return subscribeRequestLoading((count) => {
      setPending(count);

      if (count > 0) {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        if (!showTimerRef.current && !visibleRef.current) {
          showTimerRef.current = setTimeout(() => {
            visibleRef.current = true;
            setVisible(true);
            showTimerRef.current = null;
          }, SHOW_DELAY_MS);
        }
        return;
      }

      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      hideTimerRef.current = setTimeout(() => {
        visibleRef.current = false;
        setVisible(false);
        hideTimerRef.current = null;
      }, 120);
    });
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="global-request-loading"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="assertive"
      aria-label="Loading, please wait"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="global-request-loading__panel">
        <span className="global-request-loading__spinner" aria-hidden />
        <span className="global-request-loading__text">
          {pending > 1 ? `Loading (${pending})…` : 'Loading…'}
        </span>
      </div>
    </div>
  );
}
