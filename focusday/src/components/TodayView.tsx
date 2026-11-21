import { format, parseISO } from 'date-fns';
import { useStore } from '../store/useStore';
import { useToast } from '../store/useToast';
import { useKeyboard } from '../hooks/useKeyboard';
import { useNow } from '../hooks/useNow';
import { requestNotificationPermission } from '../hooks/useNotify';
import { capacity } from '../lib/plan';
import { download, toICS, toText } from '../lib/export';
import { nowMinutes, toMin } from '../lib/time';
import { CapacityBar, EmptyState } from './ui';
import Timeline from './Timeline';
import NotTodayList from './NotTodayList';
import FocusTimer from './FocusTimer';

export default function TodayView({ date }: { date: string }) {
  const plan = useStore((s) => s.days[date]);
  const tasks = useStore((s) => s.tasks);
  const draft = useStore((s) => s.drafts[date]);
  const timer = useStore((s) => s.timer);
  const { go, clearDay, restoreDay, togglePause, startFocus, endFocus, setStatus } = useStore.getState();
  const showToast = useToast((s) => s.show);
  const now = useNow(30_000);

  const open = plan?.blocks.filter((b) => b.type === 'task' && b.taskId && ['scheduled', 'in_progress'].includes(tasks[b.taskId]?.status ?? '')) ?? [];
  const current = (timer && plan?.blocks.find((b) => b.id === timer.blockId)) || open[0];
  const next = open.find((b) => b.id !== current?.id && (!current || toMin(b.start) >= toMin(current.start)));

  useKeyboard({
    n: () => go('dump'),
    ' ': () => {
      if (!plan) return;
      if (timer) togglePause();
      else if (current) {
        requestNotificationPermission();
        startFocus(date, current.id);
      }
    },
    d: () => {
      if (!plan || !current?.taskId) return;
      if (timer?.blockId === current.id) endFocus('done');
      else setStatus(date, current.taskId, 'done');
    },
  });

  if (!plan) {
    const hasDraft = Boolean(draft?.taskIds.length);
    const rolled = draft?.rolledFrom ? ` ${draft.rolledTitles?.length ?? 0} unfinished tasks from ${draft.rolledFrom} are waiting in your brain dump.` : '';
    return (
      <EmptyState
        title={hasDraft ? 'Your plan is half-way there' : 'Start your day'}
        body={hasDraft ? 'You parsed tasks but haven’t generated a plan yet.' : `Dump everything on your mind, review it, and get a time-blocked plan in under two minutes.${rolled}`}
        action={
          <button className="btn-primary" onClick={() => go(hasDraft ? 'review' : 'dump')}>
            {hasDraft ? 'Continue planning' : 'Start your day'}
          </button>
        }
      />
    );
  }

  const cap = capacity(plan, tasks);
  const dayOver = nowMinutes(new Date(now)) >= toMin(plan.settings.workEnd);

  const onClear = () => {
    const removed = clearDay(date);
    if (removed) showToast('Day plan cleared', { label: 'Undo', run: () => restoreDay(removed) });
  };

  return (
    <div className="space-y-4">
      {dayOver && !plan.review && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200">
          <span>It's past {plan.settings.workEnd} — time to wrap up?</span>
          <button className="btn-primary min-h-[32px] py-1" onClick={() => go('dayReview')}>Review my day</button>
        </div>
      )}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">{format(parseISO(date), 'EEEE, d MMMM')}</h1>
            <p className="muted text-sm">{plan.settings.workStart}–{plan.settings.workEnd} · drag the handle to reorder</p>
          </div>
          <div className="flex flex-wrap gap-1">
            <button className="btn-ghost min-h-[36px] px-2 text-xs" onClick={() => download(`focusday-${date}.ics`, toICS(plan, tasks, new Date().toISOString()), 'text/calendar')}>.ics</button>
            <button className="btn-ghost min-h-[36px] px-2 text-xs" onClick={() => download(`focusday-${date}.txt`, toText(plan, tasks), 'text/plain')}>.txt</button>
            <button className="btn-ghost min-h-[36px] px-2 text-xs" onClick={onClear}>Clear day</button>
            <button className="btn-primary min-h-[36px]" onClick={() => go('dayReview')}>{plan.review ? 'View review' : 'End day'}</button>
          </div>
        </div>
        <CapacityBar cap={cap} />
      </section>
      <FocusTimer plan={plan} tasks={tasks} current={current} next={next} />
      <section className="card">
        <Timeline plan={plan} tasks={tasks} currentBlockId={current?.id} />
      </section>
      <NotTodayList plan={plan} tasks={tasks} />
    </div>
  );
}
