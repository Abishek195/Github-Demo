import { useEffect, useRef, type ReactNode } from 'react';
import type { Priority } from '../types';
import { useToast } from '../store/useToast';
import type { Capacity } from '../lib/plan';
import { formatDuration } from '../lib/time';

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-red-50 text-red-700 ring-red-500/40 dark:bg-red-500/10 dark:text-red-300',
  medium: 'bg-amber-50 text-amber-800 ring-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-700 ring-slate-400/50 dark:bg-slate-700/40 dark:text-slate-300',
};
export const PRIORITY_DOT: Record<Priority, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-slate-400' };

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase ring-1 ring-inset ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      <div aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-2xl dark:bg-indigo-500/10">☀️</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="muted max-w-sm text-sm">{body}</p>
      {action}
    </div>
  );
}

export function CapacityBar({ cap }: { cap: Capacity }) {
  const width = Math.min(100, cap.percent);
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span>
          <strong>{formatDuration(cap.plannedMin)}</strong> planned / {formatDuration(cap.availableMin)} available
        </span>
        <span className={cap.over ? 'font-medium text-red-700 dark:text-red-400' : 'muted'}>
          {cap.over ? `Over capacity: ${cap.percent}% requested` : `${cap.percent}% of capacity`}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={cap.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Capacity used">
        <div className={`h-full rounded-full ${cap.over ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function ConfirmDialog(props: { open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.open && !d.open) d.showModal();
    if (!props.open && d.open) d.close();
  }, [props.open]);
  return (
    <dialog ref={ref} onClose={props.onCancel} className="w-[min(92vw,420px)] rounded-2xl bg-white p-0 text-slate-900 backdrop:bg-slate-900/40 dark:bg-slate-900 dark:text-slate-100">
      <div className="p-6">
        <h2 className="text-lg font-semibold">{props.title}</h2>
        <p className="muted mt-2 text-sm">{props.body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={props.onCancel}>Cancel</button>
          <button className="btn-danger" onClick={props.onConfirm}>{props.confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}

export function Toasts() {
  const { toasts, dismiss } = useToast();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
          <span className="flex-1">{t.message}</span>
          {t.onAction && (
            <button className="font-semibold text-indigo-300 hover:underline dark:text-indigo-700" onClick={() => { t.onAction?.(); dismiss(t.id); }}>
              {t.actionLabel}
            </button>
          )}
          <button aria-label="Dismiss notification" className="opacity-70 hover:opacity-100" onClick={() => dismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Brain dump', 'Review', 'Day settings'];
  return (
    <ol className="mb-4 flex items-center gap-2 text-xs font-medium" aria-label="Planning steps">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={i + 1 === current ? 'step' : undefined}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${i + 1 <= current ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{i + 1}</span>
          <span className={i + 1 === current ? '' : 'muted hidden sm:inline'}>{s}</span>
          {i < steps.length - 1 && <span aria-hidden className="h-px w-4 bg-slate-300 sm:w-8 dark:bg-slate-700" />}
        </li>
      ))}
    </ol>
  );
}
