import type { Priority, Task } from '../types';
import { clampDuration } from '../lib/validate';

interface Props {
  task: Task;
  issues: string[];
  onChange: (patch: Partial<Task>) => void;
  onDelete: () => void;
  autoFocus?: boolean;
}

export default function TaskRow({ task, issues, onChange, onDelete, autoFocus }: Props) {
  const invalidTitle = task.title.trim() === '';
  const id = `t-${task.id}`;
  return (
    <li className={`rounded-xl border p-3 ${issues.length ? 'border-amber-400 bg-amber-50/60 dark:border-amber-500/60 dark:bg-amber-500/5' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_90px_110px_110px_150px_auto] sm:items-end">
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor={`${id}-title`}>Task</label>
          <input
            id={`${id}-title`}
            className={`input ${invalidTitle ? 'border-red-500' : ''}`}
            value={task.title}
            autoFocus={autoFocus}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Task title"
            aria-invalid={invalidTitle}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-dur`}>Minutes</label>
          <input
            id={`${id}-dur`}
            className="input"
            type="number"
            min={5}
            max={240}
            step={5}
            value={task.durationMin}
            onChange={(e) => onChange({ durationMin: Number(e.target.value) })}
            onBlur={(e) => onChange({ durationMin: clampDuration(Number(e.target.value)) })}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-pri`}>Priority</label>
          <select id={`${id}-pri`} className="input" value={task.priority} onChange={(e) => onChange({ priority: e.target.value as Priority })}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${id}-tag`}>Tag</label>
          <input
            id={`${id}-tag`}
            className="input"
            value={task.tag ?? ''}
            placeholder="work"
            onChange={(e) => onChange({ tag: e.target.value.replace(/^#/, '').trim().toLowerCase() || undefined })}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-due`}>Deadline</label>
          <input id={`${id}-due`} className="input" type="date" value={task.deadline ?? ''} onChange={(e) => onChange({ deadline: e.target.value || undefined })} />
        </div>
        <div className="col-span-2 flex justify-end sm:col-span-1">
          <button className="icon-btn" aria-label={`Delete task ${task.title || 'untitled'}`} onClick={onDelete}>
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
          </button>
        </div>
      </div>
      {(issues.length > 0 || invalidTitle) && (
        <ul className="mt-2 space-y-0.5 text-xs text-amber-900 dark:text-amber-300">
          {invalidTitle && <li className="text-red-700 dark:text-red-400">Title is required — empty tasks are skipped.</li>}
          {issues.map((m) => <li key={m}>⚠ {m}</li>)}
        </ul>
      )}
    </li>
  );
}
