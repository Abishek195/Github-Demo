import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Block, DaySettings } from '../types';
import { validateFixedBlocks, validateSettings } from '../lib/validate';
import { availableMinutes } from '../lib/plan';
import { formatDuration } from '../lib/time';
import FixedBlockEditor from './FixedBlockEditor';
import { Steps } from './ui';

export default function DaySettingsForm({ date }: { date: string }) {
  const lastSettings = useStore((s) => s.lastSettings);
  const lastFixed = useStore((s) => s.lastFixedBlocks);
  const draft = useStore((s) => s.drafts[date]);
  const tasks = useStore((s) => s.tasks);
  const { setSettings, generatePlan, go } = useStore.getState();
  const [settings, setLocal] = useState<DaySettings>(lastSettings);
  const [fixed, setFixed] = useState<Block[]>(lastFixed);

  const settingErrors = validateSettings(settings);
  const blockErrors = useMemo(() => (settingErrors.length ? {} : validateFixedBlocks(fixed, settings)), [fixed, settings, settingErrors.length]);
  const hasErrors = settingErrors.length > 0 || Object.keys(blockErrors).length > 0;
  const available = hasErrors ? 0 : availableMinutes(settings, fixed);
  const requested = (draft?.taskIds ?? []).reduce((s, id) => s + (tasks[id]?.title.trim() ? tasks[id].durationMin : 0), 0);

  const onGenerate = () => {
    if (hasErrors) return;
    setSettings(settings, fixed);
    generatePlan(date);
  };

  return (
    <section className="card" aria-labelledby="settings-title">
      <Steps current={3} />
      <h1 id="settings-title" className="text-xl font-semibold">Shape your day</h1>
      <p className="muted mt-1 text-sm">Pre-filled from last time.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="ws">Work start</label>
          <input id="ws" className="input" type="time" value={settings.workStart} onChange={(e) => setLocal({ ...settings, workStart: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="we">Work end</label>
          <input id="we" className="input" type="time" value={settings.workEnd} onChange={(e) => setLocal({ ...settings, workEnd: e.target.value })} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="br">Break after each task</label>
          <select id="br" className="input" value={settings.breakMin} onChange={(e) => setLocal({ ...settings, breakMin: Number(e.target.value) })}>
            {[5, 10, 15].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
      </div>
      {settingErrors.length > 0 && (
        <ul role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">{settingErrors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}

      <div className="mt-6">
        <FixedBlockEditor blocks={fixed} errors={blockErrors} onChange={setFixed} />
      </div>

      {!hasErrors && (
        <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${requested > available ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-slate-100 dark:bg-slate-800'}`}>
          {formatDuration(requested)} of tasks for {formatDuration(available)} of free time
          {requested > available && ' — some tasks will land in “Not Today”.'}
        </p>
      )}

      <div className="mt-6 flex justify-between gap-2">
        <button className="btn-ghost" onClick={() => go('review')}>← Back</button>
        <button className="btn-primary" disabled={hasErrors} onClick={onGenerate}>Generate plan</button>
      </div>
    </section>
  );
}
