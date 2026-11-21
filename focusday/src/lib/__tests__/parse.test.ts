import { describe, expect, it } from 'vitest';
import { parseBrainDump, parseDeadline, parseDuration, serializeTask } from '../parse';

// Saturday 21 Nov 2026
const TODAY = new Date(2026, 10, 21, 8, 0, 0);
let n = 0;
const opts = { makeId: () => `t${++n}` };
const parse = (text: string) => parseBrainDump(text, TODAY, opts);

describe('parseBrainDump', () => {
  it('parses the acceptance example', () => {
    const { tasks, issues } = parse('Write QC report ~1h !h #work @fri');
    expect(issues).toEqual([]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      title: 'Write QC report',
      durationMin: 60,
      priority: 'high',
      tag: 'work',
      deadline: '2026-11-27',
      status: 'pending',
    });
  });

  it('applies defaults when no shortcuts are given', () => {
    const { tasks } = parse('Call the bank');
    expect(tasks[0]).toMatchObject({ title: 'Call the bank', durationMin: 30, priority: 'medium' });
    expect(tasks[0].tag).toBeUndefined();
    expect(tasks[0].deadline).toBeUndefined();
  });

  it('accepts shortcuts in any position', () => {
    const { tasks } = parse('!l #personal Buy groceries ~45m');
    expect(tasks[0]).toMatchObject({ title: 'Buy groceries', durationMin: 45, priority: 'low', tag: 'personal' });
  });

  it('parses one task per line and skips blank lines', () => {
    const { tasks } = parse('A\n\n   \nB\r\nC');
    expect(tasks.map((t) => t.title)).toEqual(['A', 'B', 'C']);
  });

  it('flags unknown durations inline and defaults to 30m', () => {
    const { tasks, issues } = parse('Ok task\nFix bug ~abc');
    expect(tasks[1].durationMin).toBe(30);
    expect(issues).toEqual([{ line: 1, message: "Unknown duration '~abc', defaulted to 30m" }]);
  });

  it('clamps durations to 5–240 minutes with a warning', () => {
    const { tasks, issues } = parse('Huge ~5h\nTiny ~2m');
    expect(tasks[0].durationMin).toBe(240);
    expect(tasks[1].durationMin).toBe(5);
    expect(issues).toHaveLength(2);
  });

  it('supports compound and decimal durations', () => {
    expect(parseDuration('1h30m')).toBe(90);
    expect(parseDuration('1.5h')).toBe(90);
    expect(parseDuration('2h')).toBe(120);
    expect(parseDuration('20')).toBe(20);
    expect(parseDuration('x1')).toBeNull();
  });

  it('resolves weekday, relative and ISO deadlines', () => {
    expect(parseDeadline('fri', TODAY)).toBe('2026-11-27');
    expect(parseDeadline('mon', TODAY)).toBe('2026-11-23');
    expect(parseDeadline('sat', TODAY)).toBe('2026-11-21'); // same weekday = today
    expect(parseDeadline('today', TODAY)).toBe('2026-11-21');
    expect(parseDeadline('tomorrow', TODAY)).toBe('2026-11-22');
    expect(parseDeadline('2026-11-25', TODAY)).toBe('2026-11-25');
    expect(parseDeadline('2026-02-30', TODAY)).toBeNull();
  });

  it('warns on unknown priority and deadline tokens', () => {
    const { tasks, issues } = parse('Thing !x @someday');
    expect(tasks[0].priority).toBe('medium');
    expect(tasks[0].deadline).toBeUndefined();
    expect(issues.map((i) => i.message)).toEqual([
      "Unknown priority '!x', defaulted to medium",
      "Unknown deadline '@someday', ignored",
    ]);
  });

  it('rejects empty input', () => {
    const r = parse('  \n \n');
    expect(r.tasks).toEqual([]);
    expect(r.errors[0]).toMatch(/at least one task/);
  });

  it('rejects more than 50 lines', () => {
    const r = parse(Array.from({ length: 51 }, (_, i) => `Task ${i}`).join('\n'));
    expect(r.tasks).toEqual([]);
    expect(r.errors[0]).toMatch(/Too many lines/);
  });

  it('skips lines with only shortcuts and reports them', () => {
    const r = parse('~1h !h\nReal task');
    expect(r.tasks).toHaveLength(1);
    expect(r.errors[0]).toMatch(/no task title/);
  });

  it('strips list markers from pasted lists and keeps the first tag only', () => {
    const { tasks, issues } = parse('- Email Sam #work #urgent\n2. Pay rent\n[ ] Gym');
    expect(tasks.map((t) => t.title)).toEqual(['Email Sam', 'Pay rent', 'Gym']);
    expect(tasks[0].tag).toBe('work');
    expect(issues[0].message).toMatch(/Extra tag/);
  });

  it('round-trips through serializeTask', () => {
    const [t] = parse('Write QC report ~1h !h #work @fri').tasks;
    const [again] = parse(serializeTask(t)).tasks;
    expect(again).toMatchObject({ title: t.title, durationMin: 60, priority: 'high', tag: 'work', deadline: '2026-11-27' });
  });
});
