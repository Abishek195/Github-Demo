import type { Block, DayPlan, Task } from '../types';
import { useStore } from '../store/useStore';
import { useNow } from '../hooks/useNow';
import { formatClock, remainingMs } from '../lib/timer';
import { requestNotificationPermission } from '../hooks/useNotify';

interface Props {
  plan: DayPlan;
  tasks: Record<string, Task>;
  current?: Block;
  next?: Block;
}

export default function FocusTimer({ plan, tasks, current, next }: Props) {
  const timer = useStore((s) => s.timer);
  const { startFocus, togglePause, extend, endFocus } = useStore.getState();
  const now = useNow(250, Boolean(timer));
  const active = timer && timer.date === plan.date ? timer : undefined;
  const block = active ? plan.blocks.find((b) => b.id === active.blockId) : current;
  const task = block?.taskId ? tasks[block.taskId] : undefined;
  const nextTask = next?.taskId ? tasks[next.taskId] : undefined;

  if (!block || !task) {
    return (
      <section className="card text-center" aria-label="Focus timer">
        <p className="muted text-sm">No tasks left to focus on. Nice work — end the day when you're ready.</p>
      </section>
    );
  }

  const remaining = active ? remainingMs(active, now) : (task.durationMin) * 60_000;
  const total = active?.durationMs ?? task.durationMin * 60_000;
  const pct = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  const paused = active?.pausedAt !== undefined && !active.finished;

  return (
    <section className="card" aria-label="Focus timer">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="label">{active ? (active.finished ? 'Time is up' : paused ? 'Paused' : 'Focusing on') : 'Up next'}</p>
          <p className="truncate text-lg font-semibold">{task.title}</p>
          {nextTask && <p className="muted mt-1 truncate text-sm">Then: {nextTask.title} at {next?.start}</p>}
        </div>
        <div className="font-mono text-4xl font-semibold tabular-nums sm:text-5xl" role="timer" aria-live="off" aria-label={`Time remaining ${formatClock(remaining)}`}>
          {formatClock(remaining)}
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full bg-indigo-500 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      {active?.finished ? (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Session finished">
          <button className="btn-primary" onClick={() => endFocus('done')}>✓ Done</button>
          <button className="btn-secondary" onClick={() => extend(5)}>Need more time (+5m)</button>
          <button className="btn-ghost" onClick={() => endFocus('skipped')}>Skip</button>
        </div>
      ) : active ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={togglePause}>{paused ? '▶ Resume' : '❚❚ Pause'} <kbd className="text-[10px] opacity-80">Space</kbd></button>
          <button className="btn-secondary" onClick={() => endFocus('done')}>Finish early <kbd className="text-[10px] opacity-70">D</kbd></button>
          <button className="btn-secondary" onClick={() => extend(5)}>+5 min</button>
          <button className="btn-ghost" onClick={() => endFocus('stop')}>Stop</button>
        </div>
      ) : (
        <div className="mt-4">
          <button
            className="btn-primary"
            onClick={() => {
              requestNotificationPermission();
              startFocus(plan.date, block.id);
            }}
          >
            ▶ Start focus <kbd className="text-[10px] opacity-80">Space</kbd>
          </button>
        </div>
      )}
    </section>
  );
}
