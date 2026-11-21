import type { DayPlan, Task } from '../types';
import { timelineItems } from './plan';

function icsStamp(date: string, hhmm: string): string {
  return `${date.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** ASSUMPTION: floating local times (no TZID) — calendars show them in the viewer's local zone. */
export function toICS(plan: DayPlan, tasksById: Record<string, Task>, nowIso: string): string {
  const stamp = nowIso.replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = timelineItems(plan)
    .filter((b) => b.type !== 'break')
    .map((b) => {
      const task = b.taskId ? tasksById[b.taskId] : undefined;
      const summary = task ? `${task.title} [${task.priority.toUpperCase()}]` : b.label;
      return [
        'BEGIN:VEVENT',
        `UID:${b.id}-${plan.date}@focusday.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsStamp(plan.date, b.start)}`,
        `DTEND:${icsStamp(plan.date, b.end)}`,
        `SUMMARY:${icsEscape(summary)}`,
        'END:VEVENT',
      ].join('\r\n');
    });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FocusDay//EN', ...events, 'END:VCALENDAR', ''].join('\r\n');
}

export function toText(plan: DayPlan, tasksById: Record<string, Task>): string {
  const lines = [`FocusDay plan — ${plan.date}`, ''];
  for (const b of timelineItems(plan)) {
    const task = b.taskId ? tasksById[b.taskId] : undefined;
    if (task) {
      const tag = task.tag ? ` #${task.tag}` : '';
      const mark = task.status === 'done' ? '[x]' : '[ ]';
      lines.push(`${b.start}–${b.end} ${mark} ${task.title} [${task.priority.toUpperCase()}]${tag}`);
    } else {
      lines.push(`${b.start}–${b.end}     ${b.label}`);
    }
  }
  if (plan.notToday.length) {
    lines.push('', 'Not today:');
    for (const n of plan.notToday) lines.push(`- ${tasksById[n.taskId]?.title ?? '?'} (${n.reason})`);
  }
  return lines.join('\n');
}

/** Triggers a client-side file download. No network involved. */
export function download(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
