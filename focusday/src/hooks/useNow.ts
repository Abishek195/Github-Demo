import { useEffect, useState } from 'react';

/**
 * Re-renders every `intervalMs` and immediately when the tab becomes visible.
 * Only used to refresh the display — time itself always comes from Date.now().
 */
export function useNow(intervalMs = 250, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs, enabled]);
  return now;
}

/** "YYYY-MM-DD" for today, refreshed each minute so it rolls over at midnight. */
export function useToday(): string {
  const now = useNow(60_000);
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
