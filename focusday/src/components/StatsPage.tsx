import { addDays, format, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../store/useStore';
import { summarize } from '../lib/review';
import { isoDate } from '../lib/time';
import { EmptyState } from './ui';

export default function StatsPage({ date }: { date: string }) {
  const days = useStore((s) => s.days);
  const tasks = useStore((s) => s.tasks);
  const dark = useStore((s) => s.theme === 'dark');

  const data = Array.from({ length: 7 }, (_, i) => {
    const d = isoDate(addDays(parseISO(date), i - 6));
    const plan = days[d];
    const s = plan ? summarize(plan, tasks) : undefined;
    return {
      day: format(parseISO(d), 'EEE d'),
      completion: s?.completionPct ?? 0,
      focusHours: s ? Math.round((s.focusMin / 60) * 10) / 10 : 0,
      planned: Boolean(plan),
    };
  });
  const active = data.filter((d) => d.planned);
  const avg = active.length ? Math.round(active.reduce((s, d) => s + d.completion, 0) / active.length) : 0;
  const hours = Math.round(data.reduce((s, d) => s + d.focusHours, 0) * 10) / 10;

  if (active.length === 0) {
    return <EmptyState title="No stats yet" body="Plan and finish a day to see your weekly completion and focus hours here." />;
  }

  const axis = dark ? '#94a3b8' : '#475569';
  const grid = dark ? '#1e293b' : '#e2e8f0';
  const tooltip = { backgroundColor: dark ? '#0f172a' : '#fff', border: `1px solid ${grid}`, borderRadius: 8 };

  return (
    <section className="card space-y-6" aria-labelledby="stats-title">
      <div>
        <h1 id="stats-title" className="text-xl font-semibold">This week</h1>
        <p className="muted text-sm">Last 7 days · {active.length} planned days · avg completion {avg}% · {hours}h focused</p>
      </div>
      {(
        [
          { key: 'completion', title: 'Completion %', color: '#4f46e5', unit: '%' },
          { key: 'focusHours', title: 'Focus hours', color: '#0d9488', unit: 'h' },
        ] as const
      ).map((c) => (
        <figure key={c.key}>
          <figcaption className="mb-2 text-sm font-medium">{c.title}</figcaption>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={grid} />
                <XAxis dataKey="day" tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} unit={c.unit} />
                <Tooltip contentStyle={tooltip} cursor={{ fill: grid, opacity: 0.4 }} formatter={(v: number) => `${v}${c.unit}`} />
                <Bar dataKey={c.key} fill={c.color} radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      ))}
    </section>
  );
}
