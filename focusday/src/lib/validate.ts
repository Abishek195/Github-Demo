import type { Block, DaySettings } from '../types';
import { isHHmm, toMin } from './time';

export function validateSettings(s: DaySettings): string[] {
  const errors: string[] = [];
  if (!isHHmm(s.workStart)) errors.push('Work start must be in 24h HH:mm format.');
  if (!isHHmm(s.workEnd)) errors.push('Work end must be in 24h HH:mm format.');
  if (errors.length === 0 && toMin(s.workEnd) <= toMin(s.workStart)) errors.push('Work end must be after work start.');
  if (![5, 10, 15].includes(s.breakMin)) errors.push('Break length must be 5, 10 or 15 minutes.');
  return errors;
}

/** Returns one message per invalid fixed block, keyed by block id. */
export function validateFixedBlocks(blocks: Block[], s: DaySettings): Record<string, string> {
  const errors: Record<string, string> = {};
  const dayStart = toMin(s.workStart);
  const dayEnd = toMin(s.workEnd);
  const sorted = [...blocks].sort((a, b) => toMin(a.start) - toMin(b.start));
  sorted.forEach((b, i) => {
    if (!b.label.trim()) errors[b.id] = 'Give this block a name.';
    else if (!isHHmm(b.start) || !isHHmm(b.end)) errors[b.id] = 'Use HH:mm times.';
    else if (toMin(b.end) <= toMin(b.start)) errors[b.id] = 'End must be after start.';
    else if (toMin(b.start) < dayStart || toMin(b.end) > dayEnd) errors[b.id] = 'Must sit inside work hours.';
    else if (i > 0 && toMin(b.start) < toMin(sorted[i - 1].end)) errors[b.id] = `Overlaps "${sorted[i - 1].label}".`;
  });
  return errors;
}

export function clampDuration(n: number): number {
  if (!Number.isFinite(n)) return 30;
  return Math.min(240, Math.max(5, Math.round(n)));
}
