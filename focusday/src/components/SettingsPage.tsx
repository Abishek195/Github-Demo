import { useState } from 'react';
import { STORAGE_KEY, useStore } from '../store/useStore';
import { useToast } from '../store/useToast';
import { download } from '../lib/export';
import { ConfirmDialog } from './ui';

export default function SettingsPage() {
  const theme = useStore((s) => s.theme);
  const { toggleTheme, deleteAll } = useStore.getState();
  const showToast = useToast((s) => s.show);
  const [confirming, setConfirming] = useState(false);

  const onExport = () => {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '{}';
    download(`focusday-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(JSON.parse(raw), null, 2), 'application/json');
  };

  return (
    <section className="card space-y-6" aria-labelledby="prefs-title">
      <h1 id="prefs-title" className="text-xl font-semibold">Settings</h1>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-medium">Dark mode</h2>
          <p className="muted text-sm">Easier on the eyes in the evening.</p>
        </div>
        <button role="switch" aria-checked={theme === 'dark'} aria-label="Dark mode" onClick={toggleTheme} className={`relative h-7 w-12 rounded-full transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      <div>
        <h2 className="font-medium">Your data</h2>
        <p className="muted text-sm">FocusDay is local-first: everything is stored in this browser only. No accounts, no analytics, no network calls.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={onExport}>Export my data (JSON)</button>
          <button className="btn-danger" onClick={() => setConfirming(true)}>Delete all data</button>
        </div>
      </div>

      <div>
        <h2 className="font-medium">Keyboard shortcuts</h2>
        <ul className="muted mt-1 space-y-1 text-sm">
          <li><kbd className="font-mono">N</kbd> — new task (Review) / open brain dump (Today)</li>
          <li><kbd className="font-mono">Space</kbd> — start / pause the focus timer</li>
          <li><kbd className="font-mono">D</kbd> — mark the current block done</li>
          <li><kbd className="font-mono">Ctrl/⌘ + Enter</kbd> — parse the brain dump</li>
        </ul>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Delete all data?"
        body="This permanently removes every plan, task, review and setting from this browser. Export first if you want a backup."
        confirmLabel="Delete everything"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          deleteAll();
          showToast('All data deleted');
        }}
      />
    </section>
  );
}
