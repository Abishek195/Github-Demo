import type { DayPlan, Task } from '../types';
import { serializeTask } from './parse';
import { toMin } from './time';

export interface DaySummary {
  plannedCount: number;
  completedCount: number;
  skippedCount: number;
  focusMin: number;
  plannedMin: number;
  completionPct: number;
  unfinished: Task[];
}

/** Unfinished = scheduled-but-not-done tasks plus everything in Not Today. */
export function summarize(plan: DayPlan, tasksById: Record<string, Task>): DaySummary {
  const taskBlocks = plan.blocks.filter((b) => b.type === 'task' && b.taskId);
  const planned = taskBlocks.map((b) => tasksById[b.taskId as string]).filter((t): t is Task => Boolean(t));
  const completed = planned.filter((t) => t.status === 'done');
  const skipped = planned.filter((t) => t.status === 'skipped');
  const focusMin = taskBlocks.reduce((s, b) => s + (b.actualFocusMin ?? 0), 0);
  const plannedMin = taskBlocks.reduce((s, b) => s + (toMin(b.end) - toMin(b.start)), 0);
  const notToday = plan.notToday.map((n) => tasksById[n.taskId]).filter((t): t is Task => Boolean(t));
  const unfinished = [...planned.filter((t) => t.status !== 'done'), ...notToday.filter((t) => t.status !== 'done')];
  return {
    plannedCount: planned.length,
    completedCount: completed.length,
    skippedCount: skipped.length,
    focusMin: Math.round(focusMin),
    plannedMin,
    completionPct: planned.length ? Math.round((completed.length / planned.length) * 100) : 0,
    unfinished,
  };
}

/**
 * Appends unfinished tasks to an existing brain dump, skipping any line whose
 * title is already present (case-insensitive) so repeated rollovers never duplicate.
 */
export function mergeRollover(existingDump: string, tasks: Task[]): { text: string; added: number } {
  const lines = existingDump.split(/\r?\n/).filter((l) => l.trim());
  const seen = new Set(lines.map((l) => normalizeTitle(l)));
  let added = 0;
  for (const t of tasks) {
    const key = t.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(serializeTask(t));
    added += 1;
  }
  return { text: lines.join('\n'), added };
}

/** Title portion of a dump line (strips shortcut tokens) for duplicate detection. */
export function normalizeTitle(line: string): string {
  return line
    .split(/\s+/)
    .filter((w) => w && !/^[~!#@]\S+$/.test(w))
    .join(' ')
    .trim()
    .toLowerCase();
}
