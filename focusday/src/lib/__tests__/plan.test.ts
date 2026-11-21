import { describe, expect, it } from 'vitest';
import type { Block, DaySettings, Priority, Task } from '../../types';
import { capacity, deadlineBoost, freeSlots, planDay, reflow, scoreTask, sortTasks } from '../plan';
import { toMin } from '../time';

const TODAY = '2026-11-21';
const settings: DaySettings = { workStart: '09:00', workEnd: '18:00', breakMin: 10 };
const lunch: Block = { id: 'lunch', type: 'fixed', label: 'Lunch', start: '13:00', end: '14:00' };

function task(id: string, durationMin: number, priority: Priority = 'medium', deadline?: string): Task {
  return { id, title: id, durationMin, priority, deadline, status: 'pending', createdAt: '2026-11-21T08:00:00Z' };
}

function assertNoOverlaps(blocks: Block[]) {
  const sorted = [...blocks].sort((a, b) => toMin(a.start) - toMin(b.start));
  for (let i = 1; i < sorted.length; i += 1) {
    expect(toMin(sorted[i].start)).toBeGreaterThanOrEqual(toMin(sorted[i - 1].end));
  }
}

describe('scoring', () => {
  it('weights priority and deadlines per spec', () => {
    expect(scoreTask(task('a', 30, 'high'), TODAY)).toBe(30);
    expect(deadlineBoost('2026-11-21', TODAY)).toBe(25);
    expect(deadlineBoost('2026-11-22', TODAY)).toBe(15);
    expect(deadlineBoost('2026-11-27', TODAY)).toBe(5);
    expect(deadlineBoost('2026-12-25', TODAY)).toBe(0);
    expect(deadlineBoost('2026-11-20', TODAY)).toBe(35); // overdue
  });

  it('sorts by score desc then shorter duration first', () => {
    const sorted = sortTasks([task('long', 90, 'high'), task('low', 10, 'low'), task('short', 15, 'high'), task('overdue', 60, 'low', '2026-11-01')], TODAY);
    expect(sorted.map((t) => t.id)).toEqual(['overdue', 'short', 'long', 'low']);
  });
});

describe('freeSlots', () => {
  it('subtracts fixed blocks from work hours', () => {
    expect(freeSlots(settings, [lunch])).toEqual([
      { start: 540, end: 780 },
      { start: 840, end: 1080 },
    ]);
  });
});

describe('planDay', () => {
  it('fills the day and sends overflow to Not Today with reasons (12h of tasks)', () => {
    const tasks = Array.from({ length: 12 }, (_, i) => task(`t${i}`, 60));
    const plan = planDay(tasks, settings, [lunch], TODAY);
    const taskBlocks = plan.blocks.filter((b) => b.type === 'task');
    expect(taskBlocks).toHaveLength(6);
    expect(plan.notToday).toHaveLength(6);
    for (const n of plan.notToday) expect(n.reason).toMatch(/Over capacity by|No gap long enough/);
    expect(plan.notToday.at(-1)?.reason).toMatch(/Over capacity by/);
    assertNoOverlaps([...plan.blocks, lunch]);
    expect(plan.blocks.every((b) => toMin(b.end) <= 780 || toMin(b.start) >= 840)).toBe(true);
  });

  it('adds breaks after each task', () => {
    const plan = planDay([task('a', 30), task('b', 30)], settings, [], TODAY);
    expect(plan.blocks.map((b) => [b.type, b.start, b.end])).toEqual([
      ['task', '09:00', '09:30'],
      ['break', '09:30', '09:40'],
      ['task', '09:40', '10:10'],
      ['break', '10:10', '10:20'],
    ]);
  });

  it('places high-priority tasks before 13:00 when possible', () => {
    const tasks = [task('m1', 120, 'medium', TODAY), task('m2', 100, 'medium', TODAY), task('h', 60, 'high')];
    const plan = planDay(tasks, settings, [lunch], TODAY);
    const h = plan.blocks.find((b) => b.taskId === 'h');
    expect(h).toBeDefined();
    expect(toMin(h!.end)).toBeLessThanOrEqual(13 * 60);
  });

  it('reports tasks longer than any free slot', () => {
    const shortDay: DaySettings = { workStart: '09:00', workEnd: '11:00', breakMin: 5 };
    const plan = planDay([task('big', 180)], shortDay, [], TODAY);
    expect(plan.blocks).toEqual([]);
    expect(plan.notToday[0].reason).toMatch(/Longer than any free slot/);
  });

  it('handles an empty task list', () => {
    const plan = planDay([], settings, [lunch], TODAY);
    expect(plan.blocks).toEqual([]);
    expect(plan.notToday).toEqual([]);
    expect(plan.fixedBlocks).toEqual([lunch]);
  });

  it('is deterministic and does not mutate inputs', () => {
    const tasks = [task('a', 30, 'low'), task('b', 30, 'high'), task('c', 45)];
    const copy = JSON.parse(JSON.stringify(tasks));
    const p1 = planDay(tasks, settings, [lunch], TODAY);
    const p2 = planDay(tasks, settings, [lunch], TODAY);
    expect(p1).toEqual(p2);
    expect(tasks).toEqual(copy);
    expect(p1.blocks[0].taskId).toBe('b');
  });

  it('uses a later gap if the earliest one is too small', () => {
    const meeting: Block = { id: 'm', type: 'fixed', label: 'Sync', start: '09:20', end: '10:00' };
    const plan = planDay([task('a', 30)], settings, [meeting], TODAY);
    expect(plan.blocks[0]).toMatchObject({ start: '10:00', end: '10:30' });
  });

  it('computes capacity including Not Today work', () => {
    const tasks = Array.from({ length: 12 }, (_, i) => task(`t${i}`, 60));
    const plan = planDay(tasks, settings, [lunch], TODAY);
    const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
    const c = capacity(plan, byId);
    expect(c).toMatchObject({ plannedMin: 360, availableMin: 480, requestedMin: 720, over: true, percent: 150 });
  });
});

describe('reflow', () => {
  it('keeps the dragged order and recalculates times without overlaps', () => {
    const tasks = [task('a', 60), task('b', 30), task('c', 90)];
    const plan = planDay(tasks, settings, [lunch], TODAY);
    const reordered = [tasks[2], tasks[0], tasks[1]];
    const { blocks, notToday } = reflow(reordered, settings, [lunch], plan.blocks);
    const order = blocks.filter((b) => b.type === 'task').map((b) => b.taskId);
    expect(order).toEqual(['c', 'a', 'b']);
    expect(blocks[0]).toMatchObject({ start: '09:00', end: '10:30' });
    expect(notToday).toEqual([]);
    assertNoOverlaps([...blocks, lunch]);
  });

  it('pushes tasks that no longer fit to Not Today and preserves block ids/focus', () => {
    const tasks = [task('a', 200), task('b', 200), task('c', 100)];
    const prev: Block[] = [{ id: 'keep', taskId: 'a', type: 'task', label: 'a', start: '09:00', end: '12:20', actualFocusMin: 12 }];
    const { blocks, notToday } = reflow(tasks, settings, [lunch], prev);
    expect(blocks[0]).toMatchObject({ id: 'keep', actualFocusMin: 12 });
    expect(blocks.filter((b) => b.type === 'task').map((b) => b.taskId)).toEqual(['a', 'b']);
    expect(notToday.map((n) => n.taskId)).toEqual(['c']);
    assertNoOverlaps([...blocks, lunch]);
  });
});
