import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Block, Task } from '../types';
import { PRIORITY_DOT, PriorityBadge } from './ui';

interface Props {
  block: Block;
  task: Task;
  isCurrent: boolean;
  timerActive: boolean;
  onFocus: () => void;
  onDone: () => void;
  onSkip: () => void;
  onReset: () => void;
  onNotToday: () => void;
}

export default function SortableBlock({ block, task, isCurrent, timerActive, onFocus, onDone, onSkip, onReset, onNotToday }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const finished = task.status === 'done' || task.status === 'skipped';
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group relative flex gap-3 rounded-xl border bg-white p-3 dark:bg-slate-900 ${
        isDragging ? 'z-10 shadow-lg ring-2 ring-indigo-400' : ''
      } ${isCurrent ? 'border-indigo-400 ring-1 ring-indigo-300 dark:border-indigo-500' : 'border-slate-200 dark:border-slate-800'}`}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${task.title}`}
        className="icon-btn h-auto w-6 shrink-0 cursor-grab touch-none active:cursor-grabbing"
      >
        <svg aria-hidden width="12" height="18" viewBox="0 0 12 18" fill="currentColor"><circle cx="3" cy="3" r="1.5" /><circle cx="9" cy="3" r="1.5" /><circle cx="3" cy="9" r="1.5" /><circle cx="9" cy="9" r="1.5" /><circle cx="3" cy="15" r="1.5" /><circle cx="9" cy="15" r="1.5" /></svg>
      </button>
      <div className="hidden w-[5.5rem] shrink-0 pt-0.5 font-mono text-xs tabular-nums text-slate-600 sm:block dark:text-slate-400">
        {block.start}–{block.end}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 font-mono text-xs tabular-nums text-slate-600 sm:hidden dark:text-slate-400">{block.start}–{block.end}</div>
        <div className="flex flex-wrap items-center gap-2">
          <span aria-hidden className={`h-2 w-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
          <span className={`font-medium ${finished ? 'text-slate-500 line-through dark:text-slate-500' : ''}`}>{task.title}</span>
          <PriorityBadge priority={task.priority} />
          {task.tag && <span className="text-xs text-indigo-700 dark:text-indigo-300">#{task.tag}</span>}
          {task.status === 'skipped' && <span className="text-xs muted">skipped</span>}
          {task.status === 'in_progress' && <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">● focusing</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {finished ? (
            <button className="btn-ghost min-h-[32px] px-2 py-1 text-xs" onClick={onReset}>Undo</button>
          ) : (
            <>
              {!timerActive && <button className="btn-secondary min-h-[32px] px-2 py-1 text-xs" onClick={onFocus}>▶ Focus</button>}
              <button className="btn-ghost min-h-[32px] px-2 py-1 text-xs" onClick={onDone}>✓ Done</button>
              <button className="btn-ghost min-h-[32px] px-2 py-1 text-xs" onClick={onSkip}>Skip</button>
              <button className="btn-ghost min-h-[32px] px-2 py-1 text-xs" onClick={onNotToday}>Not today</button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
