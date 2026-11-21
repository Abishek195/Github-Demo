import { lazy, Suspense, useEffect } from 'react';
import { useStore } from './store/useStore';
import { useNow, useToday } from './hooks/useNow';
import { notify, playChime } from './hooks/useNotify';
import { remainingMs } from './lib/timer';
import Header from './components/Header';
import TodayView from './components/TodayView';
import BrainDump from './components/BrainDump';
import TaskReview from './components/TaskReview';
import DaySettingsForm from './components/DaySettingsForm';
import DayReview from './components/DayReview';
import SettingsPage from './components/SettingsPage';
import { Toasts } from './components/ui';

// Recharts is only needed on the Stats page — keep it out of the initial bundle.
const StatsPage = lazy(() => import('./components/StatsPage'));

/** Watches the active timer from anywhere in the app; fires the chime + notification once at zero. */
function useTimerWatcher() {
  const timer = useStore((s) => s.timer);
  const tasks = useStore((s) => s.tasks);
  const days = useStore((s) => s.days);
  const now = useNow(500, Boolean(timer && !timer.finished));
  useEffect(() => {
    if (!timer || timer.finished || timer.pausedAt !== undefined) return;
    if (remainingMs(timer, now) > 0) return;
    const block = days[timer.date]?.blocks.find((b) => b.id === timer.blockId);
    const title = block?.taskId ? tasks[block.taskId]?.title : undefined;
    useStore.getState().markTimerFinished();
    playChime();
    notify('Focus block finished', title ? `“${title}” — done, more time, or skip?` : 'Time is up.');
  }, [now, timer, days, tasks]);
}

export default function App() {
  const screen = useStore((s) => s.screen);
  const theme = useStore((s) => s.theme);
  const date = useToday();
  useTimerWatcher();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
        {screen === 'today' && <TodayView date={date} />}
        {screen === 'dump' && <BrainDump date={date} />}
        {screen === 'review' && <TaskReview date={date} />}
        {screen === 'settings' && <DaySettingsForm date={date} />}
        {screen === 'dayReview' && <DayReview date={date} />}
        {screen === 'prefs' && <SettingsPage />}
        {screen === 'stats' && (
          <Suspense fallback={<div className="card h-64 animate-pulse" aria-busy="true" />}>
            <StatsPage date={date} />
          </Suspense>
        )}
      </main>
      <Toasts />
    </div>
  );
}
