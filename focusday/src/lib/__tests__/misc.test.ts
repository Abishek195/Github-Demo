import { describe, expect, it } from 'vitest';
import type { DayPlan, Task } from '../../types';
import { mergeRollover, summarize } from '../review';
import { elapsedMs, extendTimer, pauseTimer, remainingMs, resumeTimer, startTimer } from '../timer';
import { validateFixedBlocks, validateSettings } from '../validate';
import { toICS } from '../export';

const MIN = 60_000;

describe('timer (timestamp based)', () => {
  it('stays correct after a 10-minute background gap', () => {
    const t0 = 1_000_000;
    const t = startTimer('b1', '2026-11-21', 25, t0);
    // No ticks for 10 minutes (tab backgrounded): just compare timestamps.
    expect(remainingMs(t, t0 + 10 * MIN)).toBe(15 * MIN);
  });

  it('excludes paused time and supports +5 min', () => {
    const t0 = 0;
    let t = startTimer('b1', 'd', 25, t0);
    t = pauseTimer(t, 5 * MIN);
    expect(elapsedMs(t, 20 * MIN)).toBe(5 * MIN); // frozen while paused
    t = resumeTimer(t, 20 * MIN);
    expect(remainingMs(t, 30 * MIN)).toBe(10 * MIN);
    t = extendTimer(t, 5);
    expect(remainingMs(t, 30 * MIN)).toBe(15 * MIN);
  });
});

const tasks: Task[] = [
  { id: 'a', title: 'Alpha', durationMin: 30, priority: 'high', status: 'done', createdAt: '' },
  { id: 'b', title: 'Beta', durationMin: 30, priority: 'medium', tag: 'work', status: 'scheduled', createdAt: '' },
  { id: 'c', title: 'Gamma', durationMin: 60, priority: 'low', status: 'not_today', createdAt: '' },
];
const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
const plan: DayPlan = {
  date: '2026-11-21',
  settings: { workStart: '09:00', workEnd: '18:00', breakMin: 10 },
  fixedBlocks: [{ id: 'l', type: 'fixed', label: 'Lunch', start: '13:00', end: '14:00' }],
  blocks: [
    { id: 'ba', taskId: 'a', type: 'task', label: 'Alpha', start: '09:00', end: '09:30', actualFocusMin: 28 },
    { id: 'bb', taskId: 'b', type: 'task', label: 'Beta', start: '09:40', end: '10:10' },
  ],
  notToday: [{ taskId: 'c', reason: 'Over capacity by 1h' }],
};

describe('review & rollover', () => {
  it('summarizes planned vs done', () => {
    const s = summarize(plan, byId);
    expect(s).toMatchObject({ plannedCount: 2, completedCount: 1, focusMin: 28, completionPct: 50 });
    expect(s.unfinished.map((t) => t.id)).toEqual(['b', 'c']);
  });

  it('rolls over without duplicates', () => {
    const s = summarize(plan, byId);
    const first = mergeRollover('', s.unfinished);
    expect(first.added).toBe(2);
    const second = mergeRollover(first.text, s.unfinished);
    expect(second.added).toBe(0);
    expect(second.text).toBe(first.text);
    expect(mergeRollover('Beta ~45m', s.unfinished).added).toBe(1);
  });
});

describe('validation & export', () => {
  it('validates settings and fixed blocks', () => {
    expect(validateSettings({ workStart: '18:00', workEnd: '09:00', breakMin: 10 })).toHaveLength(1);
    const errs = validateFixedBlocks(
      [
        { id: 'x', type: 'fixed', label: 'A', start: '08:00', end: '09:30' },
        { id: 'y', type: 'fixed', label: 'B', start: '10:00', end: '11:00' },
        { id: 'z', type: 'fixed', label: 'C', start: '10:30', end: '11:30' },
      ],
      plan.settings,
    );
    expect(Object.keys(errs).sort()).toEqual(['x', 'z']);
  });

  it('exports an ICS calendar', () => {
    const ics = toICS(plan, byId, '2026-11-21T08:00:00.000Z');
    expect(ics).toContain('DTSTART:20261121T090000');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  });
});
