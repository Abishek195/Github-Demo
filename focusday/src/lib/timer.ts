import type { TimerState } from '../types';

/** Elapsed focus time, computed from timestamps so it is correct after backgrounding or reload. */
export function elapsedMs(t: TimerState, now: number): number {
  const pausedNow = t.pausedAt !== undefined ? now - t.pausedAt : 0;
  return Math.max(0, now - t.startedAt - t.pausedMs - pausedNow);
}

export function remainingMs(t: TimerState, now: number): number {
  return Math.max(0, t.durationMs - elapsedMs(t, now));
}

export function startTimer(blockId: string, date: string, durationMin: number, now: number): TimerState {
  return { blockId, date, startedAt: now, durationMs: durationMin * 60_000, pausedMs: 0 };
}

export function pauseTimer(t: TimerState, now: number): TimerState {
  return t.pausedAt !== undefined ? t : { ...t, pausedAt: now };
}

export function resumeTimer(t: TimerState, now: number): TimerState {
  if (t.pausedAt === undefined) return t;
  return { ...t, pausedMs: t.pausedMs + (now - t.pausedAt), pausedAt: undefined };
}

export function extendTimer(t: TimerState, minutes: number): TimerState {
  return { ...t, durationMs: t.durationMs + minutes * 60_000, finished: false };
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
