import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Block, DayPlan, DaySettings, NotTodayEntry, Priority, Task } from '../types';
import { formatDuration, toHHmm, toMin } from './time';

export const PRIORITY_WEIGHT: Record<Priority, number> = { high: 30, medium: 20, low: 10 };
export const MORNING_CUTOFF = 13 * 60;

interface Slot {
  start: number;
  end: number;
  cursor: number;
}

export function deadlineBoost(deadline: string | undefined, today: string): number {
  if (!deadline) return 0;
  const days = differenceInCalendarDays(parseISO(deadline), parseISO(today));
  if (days < 0) return 35;
  if (days === 0) return 25;
  if (days === 1) return 15;
  if (days <= 7) return 5;
  return 0;
}

export function scoreTask(task: Task, today: string): number {
  return PRIORITY_WEIGHT[task.priority] + deadlineBoost(task.deadline, today);
}

/** Score desc, then shorter first, then original order (keeps the result deterministic). */
export function sortTasks(tasks: Task[], today: string): Task[] {
  return tasks
    .map((task, index) => ({ task, index, score: scoreTask(task, today) }))
    .sort((a, b) => b.score - a.score || a.task.durationMin - b.task.durationMin || a.index - b.index)
    .map((x) => x.task);
}

/** Work hours minus fixed blocks, as minute ranges. */
export function freeSlots(settings: DaySettings, fixedBlocks: Block[]): { start: number; end: number }[] {
  const dayStart = toMin(settings.workStart);
  const dayEnd = toMin(settings.workEnd);
  const fixed = fixedBlocks
    .map((b) => ({ start: Math.max(dayStart, toMin(b.start)), end: Math.min(dayEnd, toMin(b.end)) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);
  const slots: { start: number; end: number }[] = [];
  let cursor = dayStart;
  for (const f of fixed) {
    if (f.start > cursor) slots.push({ start: cursor, end: f.start });
    cursor = Math.max(cursor, f.end);
  }
  if (dayEnd > cursor) slots.push({ start: cursor, end: dayEnd });
  return slots;
}

export function availableMinutes(settings: DaySettings, fixedBlocks: Block[]): number {
  return freeSlots(settings, fixedBlocks).reduce((sum, s) => sum + (s.end - s.start), 0);
}

function makeBlocks(task: Task, start: number, slot: Slot, breakMin: number, prev?: Block): Block[] {
  const end = start + task.durationMin;
  const blocks: Block[] = [
    {
      id: prev?.id ?? `blk_${task.id}`,
      taskId: task.id,
      type: 'task',
      label: task.title,
      start: toHHmm(start),
      end: toHHmm(end),
      ...(prev?.actualFocusMin !== undefined ? { actualFocusMin: prev.actualFocusMin } : {}),
    },
  ];
  // ASSUMPTION: a break is trimmed (or dropped) if it would run past the end of its free slot.
  const breakLen = Math.min(breakMin, slot.end - end);
  slot.cursor = end;
  if (breakLen > 0) {
    blocks.push({ id: `brk_${task.id}`, type: 'break', label: 'Break', start: toHHmm(end), end: toHHmm(end + breakLen) });
    slot.cursor = end + breakLen;
  }
  return blocks;
}

function reasonFor(task: Task, slots: Slot[], originalMax: number, overflowMin: number): string {
  if (task.durationMin > originalMax) {
    return `Longer than any free slot (${formatDuration(task.durationMin)} vs ${formatDuration(originalMax)} max)`;
  }
  const remaining = slots.reduce((s, x) => s + (x.end - x.cursor), 0);
  const over = overflowMin - remaining;
  if (over > 0) return `Over capacity by ${formatDuration(over)}`;
  const largest = Math.max(0, ...slots.map((s) => s.end - s.cursor));
  return `No gap long enough left (largest is ${formatDuration(largest)})`;
}

function toSlots(settings: DaySettings, fixedBlocks: Block[]): Slot[] {
  return freeSlots(settings, fixedBlocks).map((s) => ({ ...s, cursor: s.start }));
}

/**
 * Pure, deterministic planner (spec §6): score → sort → greedy earliest-fit with breaks.
 * High-priority tasks first try a slot that lets them finish by 13:00.
 * `today` ("YYYY-MM-DD") is the plan date and the reference for deadline scoring.
 * ASSUMPTION: passed explicitly (4th arg) so the function stays pure and testable.
 */
export function planDay(tasks: Task[], settings: DaySettings, fixedBlocks: Block[], today: string): DayPlan {
  const slots = toSlots(settings, fixedBlocks);
  const originalMax = Math.max(0, ...slots.map((s) => s.end - s.start));
  const blocks: Block[] = [];
  const notToday: NotTodayEntry[] = [];
  let overflow = 0;
  const sorted = sortTasks(tasks, today);
  let pendingHighMin = sorted
    .filter((t) => t.priority === 'high')
    .reduce((s, t) => s + t.durationMin + settings.breakMin, 0);
  const morningLeft = () => slots.reduce((s, x) => s + Math.max(0, Math.min(x.end, MORNING_CUTOFF) - x.cursor), 0);

  for (const task of sorted) {
    const fits = (s: Slot) => s.cursor + task.durationMin <= s.end;
    const inMorning = (s: Slot) => s.cursor + task.durationMin <= MORNING_CUTOFF;
    let slot: Slot | undefined;
    if (task.priority === 'high') {
      pendingHighMin -= task.durationMin + settings.breakMin;
      slot = slots.find((s) => fits(s) && inMorning(s)) ?? slots.find(fits);
    } else {
      slot = slots.find(fits);
      // ASSUMPTION: "high before 13:00 when possible" — keep enough morning time for
      // high tasks still waiting; move this task to a later slot if one exists.
      const needed = task.durationMin + settings.breakMin;
      if (slot && inMorning(slot) && pendingHighMin > 0 && morningLeft() - needed < pendingHighMin) {
        slot = slots.find((s) => fits(s) && !inMorning(s)) ?? slot;
      }
    }
    if (slot) {
      blocks.push(...makeBlocks(task, slot.cursor, slot, settings.breakMin));
    } else {
      overflow += task.durationMin;
      notToday.push({ taskId: task.id, reason: reasonFor(task, slots, originalMax, overflow) });
    }
  }

  blocks.sort((a, b) => toMin(a.start) - toMin(b.start));
  return { date: today, settings, fixedBlocks, blocks, notToday };
}

/**
 * Re-flows tasks in exactly the given order (drag-and-drop, moving tasks between
 * Today / Not Today). Each task starts no earlier than the previous one ended, so
 * the order is kept and nothing overlaps. Tasks that no longer fit go to Not Today.
 */
export function reflow(
  orderedTasks: Task[],
  settings: DaySettings,
  fixedBlocks: Block[],
  previousBlocks: Block[] = [],
): { blocks: Block[]; notToday: NotTodayEntry[] } {
  const slots = toSlots(settings, fixedBlocks);
  const originalMax = Math.max(0, ...slots.map((s) => s.end - s.start));
  const prevByTask = new Map(previousBlocks.filter((b) => b.taskId).map((b) => [b.taskId as string, b]));
  const blocks: Block[] = [];
  const notToday: NotTodayEntry[] = [];
  let slotIndex = 0;
  let overflow = 0;

  for (const task of orderedTasks) {
    let placed = false;
    for (let i = slotIndex; i < slots.length; i += 1) {
      const slot = slots[i];
      if (slot.cursor + task.durationMin <= slot.end) {
        blocks.push(...makeBlocks(task, slot.cursor, slot, settings.breakMin, prevByTask.get(task.id)));
        slotIndex = i;
        placed = true;
        break;
      }
    }
    if (!placed) {
      overflow += task.durationMin;
      // Only slots at/after the current position are usable when order is fixed.
      notToday.push({ taskId: task.id, reason: reasonFor(task, slots.slice(slotIndex), originalMax, overflow) });
    }
  }
  return { blocks, notToday };
}

export interface Capacity {
  plannedMin: number;
  requestedMin: number;
  availableMin: number;
  percent: number;
  over: boolean;
}

export function capacity(plan: DayPlan, tasksById: Record<string, Task>): Capacity {
  const plannedMin = plan.blocks
    .filter((b) => b.type === 'task')
    .reduce((s, b) => s + (toMin(b.end) - toMin(b.start)), 0);
  const notTodayMin = plan.notToday.reduce((s, n) => s + (tasksById[n.taskId]?.durationMin ?? 0), 0);
  const availableMin = availableMinutes(plan.settings, plan.fixedBlocks);
  const requestedMin = plannedMin + notTodayMin;
  const percent = availableMin > 0 ? Math.round((requestedMin / availableMin) * 100) : 0;
  return { plannedMin, requestedMin, availableMin, percent, over: requestedMin > availableMin };
}

/** Task and fixed blocks merged in time order, for rendering the timeline. */
export function timelineItems(plan: DayPlan): Block[] {
  return [...plan.blocks, ...plan.fixedBlocks].sort((a, b) => toMin(a.start) - toMin(b.start));
}
