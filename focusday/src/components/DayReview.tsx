import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { tomorrowOf, useStore } from '../store/useStore';
import { useToast } from '../store/useToast';
import { summarize } from '../lib/review';
import { formatDuration } from '../lib/time';
import type { DayReviewData } from '../types';
import { EmptyState, PriorityBadge } from './ui';

const RATINGS: DayReviewData['rating'][] = [1, 2, 3, 4, 5];
const RATING_LABEL = ['Rough', 'Meh', 'Okay', 'Good', 'Great'];

export default function DayReview({ date }: { date: string }) {
  const plan = useStore((s) => s.days[date]);
  const tasks = useStore((s) => s.tasks);
  const { saveReview, rollover, go, endFocus } = useStore.getState();
  const showToast = useToast((s) => s.show);
  const [rating, setRating] = useState<DayReviewData['rating'] | undefined>(plan?.review?.rating);
  const [note, setNote] = useState(plan?.review?.note ?? '');

  if (!plan) {
    return <EmptyState title="Nothing to review" body="Plan your day first, then come back here at the end of it." action={<button className="btn-primary" onClick={() => go('dump')}>Start your day</button>} />;
  }

  const s = summarize(plan, tasks);
  const onSave = () => {
    if (!rating) return;
    if (useStore.getState().timer?.date === date) endFocus('stop');
    saveReview(date, rating, note.trim());
    showToast('Review saved');
  };
  const onRollover = () => {
    const added = rollover(date);
    showToast(added ? `${added} task${added > 1 ? 's' : ''} added to tomorrow's brain dump` : 'Already rolled over — nothing new to add');
  };

  const stats = [
    { label: 'Completed', value: `${s.completedCount}/${s.plannedCount}` },
    { label: 'Completion', value: `${s.completionPct}%` },
    { label: 'Focus time', value: formatDuration(s.focusMin) },
    { label: 'Unfinished', value: String(s.unfinished.length) },
  ];

  return (
    <section className="card space-y-6" aria-labelledby="dr-title">
      <div>
        <h1 id="dr-title" className="text-xl font-semibold">Day review</h1>
        <p className="muted text-sm">{format(parseISO(date), 'EEEE, d MMMM')} · planned {formatDuration(s.plannedMin)}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((x) => (
          <div key={x.label} className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <dt className="label">{x.label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{x.value}</dd>
          </div>
        ))}
      </dl>

      <fieldset>
        <legend className="label">How was your day?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {RATINGS.map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={rating === r}
              onClick={() => setRating(r)}
              className={`btn min-w-[64px] flex-col border ${rating === r ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}
            >
              <span className="text-lg font-semibold">{r}</span>
              <span className="text-[11px]">{RATING_LABEL[r - 1]}</span>
            </button>
          ))}
        </div>
        <label htmlFor="note" className="label mt-4">Note (optional)</label>
        <textarea id="note" className="input" rows={3} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What went well? What got in the way?" />
        <p className="muted mt-1 text-right text-xs">{note.length}/280</p>
        <button className="btn-primary mt-2" disabled={!rating} onClick={onSave}>{plan.review ? 'Update review' : 'Save review'}</button>
      </fieldset>

      <div>
        <h2 className="font-semibold">Roll over to {format(parseISO(tomorrowOf(date)), 'EEEE')}</h2>
        {s.unfinished.length === 0 ? (
          <p className="muted mt-1 text-sm">Everything's done. Nothing to roll over 🎉</p>
        ) : (
          <>
            <ul className="mt-2 space-y-1 text-sm">
              {s.unfinished.map((t) => (
                <li key={t.id} className="flex items-center gap-2"><PriorityBadge priority={t.priority} /> {t.title} <span className="muted text-xs">{formatDuration(t.durationMin)}</span></li>
              ))}
            </ul>
            <button className="btn-secondary mt-3" onClick={onRollover} disabled={plan.rolledOver}>
              {plan.rolledOver ? '✓ Rolled over' : `Move ${s.unfinished.length} to tomorrow's brain dump`}
            </button>
          </>
        )}
      </div>

      <button className="btn-ghost" onClick={() => go('today')}>← Back to today</button>
    </section>
  );
}
