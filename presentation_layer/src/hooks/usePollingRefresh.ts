import { useEffect, useRef } from 'react';

/**
 * Re-runs an async loader on an interval so a page picks up changes made by
 * other users without a manual refresh. The caller's refresh must be silent —
 * this hook never owns loading or error state, so a tick can never tear down
 * the table or replay entry animations.
 *
 * Timers are paused while the tab is hidden (browsers throttle them anyway, and
 * a background tab has no one reading it) and one refresh fires on return, so
 * the visible rows are always current when the user looks back.
 */
export function usePollingRefresh(
  refresh: () => Promise<void> | void,
  options: { intervalMs: number; enabled?: boolean }
): void {
  const { intervalMs, enabled = true } = options;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (cancelled || inFlight) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        await refreshRef.current();
      } catch {
        // A failed poll must not break the page; the next tick retries.
      } finally {
        inFlight = false;
      }
    };

    tick();
    const interval = setInterval(tick, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}