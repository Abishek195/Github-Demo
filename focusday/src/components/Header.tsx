import { useStore } from '../store/useStore';
import type { Screen } from '../types';

const NAV: { screen: Screen; label: string }[] = [
  { screen: 'today', label: 'Today' },
  { screen: 'stats', label: 'Stats' },
  { screen: 'prefs', label: 'Settings' },
];
const PLANNING: Screen[] = ['today', 'dump', 'review', 'settings', 'dayReview'];

export default function Header() {
  const screen = useStore((s) => s.screen);
  const theme = useStore((s) => s.theme);
  const { go, toggleTheme } = useStore.getState();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        <button className="mr-auto flex items-center gap-2 font-semibold" onClick={() => go('today')} aria-label="FocusDay home">
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">◷</span>
          <span className="hidden min-[400px]:inline">FocusDay</span>
        </button>
        <nav aria-label="Main" className="flex gap-1">
          {NAV.map((n) => {
            const active = n.screen === 'today' ? PLANNING.includes(screen) : screen === n.screen;
            return (
              <button
                key={n.screen}
                onClick={() => go(n.screen)}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-2.5 py-1.5 text-sm font-medium sm:px-3 ${active ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
              >
                {n.label}
              </button>
            );
          })}
        </nav>
        <button className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
        </button>
      </div>
    </header>
  );
}
