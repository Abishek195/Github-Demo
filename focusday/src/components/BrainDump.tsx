import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from '../store/useToast';
import { MAX_LINES } from '../lib/parse';
import { Steps } from './ui';

const PLACEHOLDER = `Write QC report ~1h !h #work @fri
Reply to client emails ~30m #work
Book dentist ~10m !l #personal @tomorrow
Prep slides for Monday ~1h30m !h #work @mon`;

export default function BrainDump({ date }: { date: string }) {
  const draft = useStore((s) => s.drafts[date]);
  const setDraftText = useStore((s) => s.setDraftText);
  const parseDraft = useStore((s) => s.parseDraft);
  const go = useStore((s) => s.go);
  const showToast = useToast((s) => s.show);
  const [errors, setErrors] = useState<string[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const text = draft?.text ?? '';
  const lineCount = text.split(/\r?\n/).filter((l) => l.trim()).length;

  useEffect(() => ref.current?.focus(), []);

  const onParse = () => {
    const errs = parseDraft(date);
    const fatal = lineCount === 0 || lineCount > MAX_LINES || !useStore.getState().drafts[date]?.taskIds.length;
    if (fatal) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    errs.forEach((e) => showToast(e));
    go('review');
  };

  return (
    <section className="card" aria-labelledby="dump-title">
      <Steps current={1} />
      <h1 id="dump-title" className="text-xl font-semibold">What's on your mind?</h1>
      <p className="muted mt-1 text-sm">
        One task per line. Shortcuts: <code>~30m</code> <code>~1h</code> duration · <code>!h</code> <code>!m</code> <code>!l</code> priority ·{' '}
        <code>#work</code> tag · <code>@fri</code> <code>@2026-11-25</code> deadline.
      </p>
      {draft?.rolledFrom && (
        <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200">
          Includes unfinished tasks rolled over from {draft.rolledFrom}.
        </p>
      )}
      <label htmlFor="dump" className="sr-only">Brain dump, one task per line</label>
      <textarea
        id="dump"
        ref={ref}
        value={text}
        onChange={(e) => setDraftText(date, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onParse();
        }}
        rows={12}
        placeholder={PLACEHOLDER}
        className="input mt-4 resize-y font-mono leading-relaxed"
        aria-describedby="dump-help"
      />
      <div id="dump-help" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={lineCount > MAX_LINES ? 'font-medium text-red-700 dark:text-red-400' : 'muted'}>
          {lineCount} / {MAX_LINES} lines
        </span>
        <span className="muted">Ctrl/⌘ + Enter to parse</span>
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <div className="mt-6 flex justify-between gap-2">
        <button className="btn-ghost" onClick={() => go('today')}>Cancel</button>
        <button className="btn-primary" onClick={onParse} disabled={lineCount === 0}>Parse tasks →</button>
      </div>
    </section>
  );
}
