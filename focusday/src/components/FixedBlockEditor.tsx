import type { Block } from '../types';
import { uid } from '../lib/time';

interface Props {
  blocks: Block[];
  errors: Record<string, string>;
  onChange: (blocks: Block[]) => void;
}

export default function FixedBlockEditor({ blocks, errors, onChange }: Props) {
  const update = (id: string, patch: Partial<Block>) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const add = () => onChange([...blocks, { id: uid('fixed'), type: 'fixed', label: 'Meeting', start: '11:00', end: '11:30' }]);

  return (
    <fieldset>
      <legend className="label">Fixed blocks (meetings, lunch…)</legend>
      {blocks.length === 0 && <p className="muted text-sm">No fixed blocks — the whole day is free.</p>}
      <ul className="space-y-2">
        {blocks.map((b) => (
          <li key={b.id}>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`${b.id}-label`}>Block name</label>
              <input id={`${b.id}-label`} className="input min-w-0 flex-1 basis-40" value={b.label} onChange={(e) => update(b.id, { label: e.target.value })} />
              <label className="sr-only" htmlFor={`${b.id}-start`}>Start time</label>
              <input id={`${b.id}-start`} className="input w-[7.5rem]" type="time" value={b.start} onChange={(e) => update(b.id, { start: e.target.value })} />
              <span aria-hidden className="muted">–</span>
              <label className="sr-only" htmlFor={`${b.id}-end`}>End time</label>
              <input id={`${b.id}-end`} className="input w-[7.5rem]" type="time" value={b.end} onChange={(e) => update(b.id, { end: e.target.value })} />
              <button className="icon-btn" aria-label={`Remove ${b.label || 'block'}`} onClick={() => onChange(blocks.filter((x) => x.id !== b.id))}>✕</button>
            </div>
            {errors[b.id] && <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400">{errors[b.id]}</p>}
          </li>
        ))}
      </ul>
      <button className="btn-ghost mt-2" onClick={add}>+ Add fixed block</button>
    </fieldset>
  );
}
