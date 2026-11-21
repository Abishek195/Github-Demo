import type { DayPlan, Task } from '../types';
import { useStore } from '../store/useStore';
import { formatDuration } from '../lib/time';
import { PriorityBadge } from './ui';

export default function NotTodayList({ plan, tasks }: { plan: DayPlan; tasks: Record<string, Task> }) {
  const moveToToday = useStore((s) => s.moveToToday);
  if (plan.notToday.length === 0) return null;
  return (
    <section className="card" aria-labelledby="nt-title">
      <h2 id="nt-title" className="font-semibold">Not today <span className="muted text-sm font-normal">({plan.notToday.length})</span></h2>
      <p className="muted mt-1 text-sm">These didn't fit. Move one back and the day re-flows; anything that no longer fits drops here.</p>
      <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
        {plan.notToday.map((n) => {
          const t = tasks[n.taskId];
          if (!t) return null;
          return (
            <li key={n.taskId} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t.title}</span>
                  <PriorityBadge priority={t.priority} />
                  <span className="muted text-xs">{formatDuration(t.durationMin)}</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">{n.reason}</p>
              </div>
              <button className="btn-secondary min-h-[32px] px-2 py-1 text-xs" onClick={() => moveToToday(plan.date, t.id)} aria-label={`Move ${t.title} to today`}>
                ↑ Today
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
