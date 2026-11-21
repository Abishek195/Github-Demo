import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from '../store/useToast';
import { useKeyboard } from '../hooks/useKeyboard';
import type { Task } from '../types';
import { formatDuration } from '../lib/time';
import TaskRow from './TaskRow';
import { EmptyState, Steps } from './ui';

export default function TaskReview({ date }: { date: string }) {
  const draft = useStore((s) => s.drafts[date]);
  const tasksById = useStore((s) => s.tasks);
  const { updateTask, removeFromDraft, restoreToDraft, addTask, go } = useStore.getState();
  const showToast = useToast((s) => s.show);
  const [focusId, setFocusId] = useState<string>();

  const tasks = (draft?.taskIds ?? []).map((id) => tasksById[id]).filter((t): t is Task => Boolean(t));
  const valid = tasks.filter((t) => t.title.trim());
  const total = valid.reduce((s, t) => s + t.durationMin, 0);

  const onAdd = () => setFocusId(addTask(date));
  useKeyboard({ n: onAdd });

  const onDelete = (task: Task) => {
    const removed = removeFromDraft(date, task.id);
    if (removed) {
      showToast(`Deleted "${task.title || 'untitled'}"`, { label: 'Undo', run: () => restoreToDraft(date, removed.task, removed.index) });
    }
  };

  return (
    <section className="card" aria-labelledby="review-title">
      <Steps current={2} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 id="review-title" className="text-xl font-semibold">Review your tasks</h1>
        <span className="muted text-sm">{valid.length} tasks · {formatDuration(total)}</span>
      </div>
      <p className="muted mt-1 text-sm">Fix anything that looks off. Highlighted rows had parse warnings.</p>

      {tasks.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No tasks yet" body="Add a task here or go back to your brain dump." action={<button className="btn-primary" onClick={onAdd}>Add task</button>} />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {tasks.map((t, i) => (
            <TaskRow
              key={t.id}
              task={t}
              autoFocus={t.id === focusId}
              issues={(draft?.issues ?? []).filter((x) => x.line === i).map((x) => x.message)}
              onChange={(patch) => updateTask(t.id, patch)}
              onDelete={() => onDelete(t)}
            />
          ))}
        </ul>
      )}

      <button className="btn-ghost mt-3" onClick={onAdd}>
        + Add task <kbd className="rounded border border-slate-300 px-1 text-[10px] dark:border-slate-700">N</kbd>
      </button>

      <div className="mt-6 flex justify-between gap-2">
        <button className="btn-ghost" onClick={() => go('dump')}>← Back</button>
        <button className="btn-primary" disabled={valid.length === 0} onClick={() => go('settings')}>Day settings →</button>
      </div>
    </section>
  );
}
