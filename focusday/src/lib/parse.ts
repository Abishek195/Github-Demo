import { addDays, isValid, parseISO } from 'date-fns';
import type { ParseIssue, ParseResult, Priority, Task } from '../types';
import { isoDate, uid } from './time';

export const MAX_LINES = 50;
export const DEFAULT_DURATION = 30;
export const MIN_DURATION = 5;
export const MAX_DURATION = 240;

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};

const PRIORITIES: Record<string, Priority> = {
  h: 'high', high: 'high', m: 'medium', med: 'medium', medium: 'medium', l: 'low', low: 'low',
};

export interface ParseOptions {
  now?: Date;
  makeId?: () => string;
}

/** Parses "~1h", "~30m", "~1h30m", "~1.5h", "~45" (bare number = minutes). Returns null if invalid. */
export function parseDuration(raw: string): number | null {
  const s = raw.toLowerCase();
  let m = /^(\d+(?:\.\d+)?)h(?:(\d+)m?)?$/.exec(s);
  if (m) return Math.round(Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0));
  m = /^(\d+)(?:m|min|mins)?$/.exec(s);
  if (m) return Number(m[1]);
  return null;
}

/** Resolves "@fri", "@today", "@tomorrow", "@2026-11-25" relative to `today`. Returns null if invalid. */
export function parseDeadline(raw: string, today: Date): string | null {
  const s = raw.toLowerCase();
  if (s === 'today' || s === 'tod') return isoDate(today);
  if (s === 'tomorrow' || s === 'tmr' || s === 'tom') return isoDate(addDays(today, 1));
  if (s in WEEKDAYS) {
    // ASSUMPTION: a weekday means its next occurrence; the same weekday as today means today.
    const diff = (WEEKDAYS[s] - today.getDay() + 7) % 7;
    return isoDate(addDays(today, diff));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = parseISO(s);
    if (isValid(d) && isoDate(d) === s) return s;
  }
  return null;
}

interface LineResult {
  task: Omit<Task, 'id' | 'createdAt' | 'status'> | null;
  messages: string[];
}

export function parseLine(line: string, today: Date): LineResult {
  const messages: string[] = [];
  let durationMin = DEFAULT_DURATION;
  let priority: Priority = 'medium';
  let tag: string | undefined;
  let deadline: string | undefined;
  const words: string[] = [];

  // Strip common list markers from pasted lists: "- ", "* ", "• ", "1. ", "[ ] ".
  const cleaned = line.replace(/^\s*(?:[-*•]|\d+[.)]|\[\s?\])\s+/, '');

  for (const word of cleaned.split(/\s+/).filter(Boolean)) {
    const sigil = word[0];
    const body = word.slice(1);
    if (sigil === '~' && body) {
      const d = parseDuration(body);
      if (d === null) {
        messages.push(`Unknown duration '${word}', defaulted to ${DEFAULT_DURATION}m`);
      } else if (d < MIN_DURATION || d > MAX_DURATION) {
        durationMin = Math.min(MAX_DURATION, Math.max(MIN_DURATION, d));
        messages.push(`Duration '${word}' out of range (5–240m), set to ${durationMin}m`);
      } else {
        durationMin = d;
      }
    } else if (sigil === '!' && body) {
      const p = PRIORITIES[body.toLowerCase()];
      if (p) priority = p;
      else messages.push(`Unknown priority '${word}', defaulted to medium`);
    } else if (sigil === '#' && /^[\w-]+$/.test(body)) {
      if (tag === undefined) tag = body.toLowerCase();
      else messages.push(`Extra tag '${word}' ignored (one tag per task)`);
    } else if (sigil === '@' && body) {
      const d = parseDeadline(body, today);
      if (d) deadline = d;
      else messages.push(`Unknown deadline '${word}', ignored`);
    } else {
      words.push(word);
    }
  }

  const title = words.join(' ').trim();
  if (!title) {
    messages.push(`Line "${line.trim()}" has no task title, skipped`);
    return { task: null, messages };
  }
  return { task: { title, durationMin, priority, tag, deadline }, messages };
}

/** Pure: converts brain-dump text into structured tasks plus inline issues. */
export function parseBrainDump(text: string, today: Date, opts: ParseOptions = {}): ParseResult {
  const now = opts.now ?? today;
  const makeId = opts.makeId ?? (() => uid('task'));
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { tasks: [], issues: [], errors: ['Add at least one task — one per line.'] };
  }
  if (lines.length > MAX_LINES) {
    return { tasks: [], issues: [], errors: [`Too many lines (${lines.length}). The limit is ${MAX_LINES}.`] };
  }

  const tasks: Task[] = [];
  const issues: ParseIssue[] = [];
  const skipped: string[] = [];
  for (const line of lines) {
    const { task, messages } = parseLine(line, today);
    if (!task) {
      skipped.push(...messages);
      continue;
    }
    const index = tasks.length;
    tasks.push({ ...task, id: makeId(), status: 'pending', createdAt: now.toISOString() });
    for (const message of messages) issues.push({ line: index, message });
  }

  const errors = tasks.length === 0 ? ['No valid tasks found. Each line needs a title.', ...skipped] : skipped;
  return { tasks, issues, errors };
}

/** Turns a task back into a brain-dump line (used for rollover). */
export function serializeTask(task: Pick<Task, 'title' | 'durationMin' | 'priority' | 'tag' | 'deadline'>): string {
  const parts = [task.title, `~${task.durationMin}m`];
  if (task.priority !== 'medium') parts.push(`!${task.priority[0]}`);
  if (task.tag) parts.push(`#${task.tag}`);
  if (task.deadline) parts.push(`@${task.deadline}`);
  return parts.join(' ');
}
