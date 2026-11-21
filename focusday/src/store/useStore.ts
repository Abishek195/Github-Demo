import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { addDays, parseISO } from 'date-fns';
import type { Block, DayPlan, DayReviewData, DaySettings, ParseIssue, Screen, Task, TaskStatus, TimerState } from '../types';
import { parseBrainDump } from '../lib/parse';
import { planDay, reflow } from '../lib/plan';
import { mergeRollover, summarize } from '../lib/review';
import { elapsedMs, extendTimer, pauseTimer, resumeTimer, startTimer } from '../lib/timer';
import { isoDate, toMin, uid } from '../lib/time';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'focusday:v1';

export interface Draft {
  text: string;
  taskIds: string[]; // parsed tasks awaiting a plan (Review screen)
  issues: ParseIssue[];
  rolledFrom?: string;
  rolledTitles?: string[];
}

export interface PersistedState {
  schemaVersion: number;
  tasks: Record<string, Task>;
  days: Record<string, DayPlan>;
  drafts: Record<string, Draft>;
  lastSettings: DaySettings;
  lastFixedBlocks: Block[];
  timer?: TimerState;
  theme: 'light' | 'dark';
}

interface Actions {
  go: (screen: Screen) => void;
  setDraftText: (date: string, text: string) => void;
  parseDraft: (date: string) => string[];
  addTask: (date: string) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeFromDraft: (date: string, id: string) => { task: Task; index: number } | undefined;
  restoreToDraft: (date: string, task: Task, index: number) => void;
  setSettings: (s: DaySettings, fixed: Block[]) => void;
  generatePlan: (date: string) => void;
  reorder: (date: string, orderedTaskIds: string[]) => void;
  moveToNotToday: (date: string, taskId: string) => void;
  moveToToday: (date: string, taskId: string) => void;
  setStatus: (date: string, taskId: string, status: TaskStatus) => void;
  startFocus: (date: string, blockId: string) => void;
  togglePause: () => void;
  extend: (minutes: number) => void;
  markTimerFinished: () => void;
  endFocus: (outcome: 'done' | 'skipped' | 'stop') => void;
  saveReview: (date: string, rating: DayReviewData['rating'], note?: string) => void;
  rollover: (date: string) => number;
  clearDay: (date: string) => DayPlan | undefined;
  restoreDay: (plan: DayPlan) => void;
  toggleTheme: () => void;
  deleteAll: () => void;
}

export type AppState = PersistedState & Actions & { screen: Screen };

export const DEFAULT_SETTINGS: DaySettings = { workStart: '09:00', workEnd: '18:00', breakMin: 10 };
const DEFAULT_FIXED: Block[] = [{ id: 'fixed_lunch', type: 'fixed', label: 'Lunch', start: '13:00', end: '14:00' }];

const initial: PersistedState = {
  schemaVersion: SCHEMA_VERSION,
  tasks: {},
  days: {},
  drafts: {},
  lastSettings: DEFAULT_SETTINGS,
  lastFixedBlocks: DEFAULT_FIXED,
  timer: undefined,
  theme: 'light',
};

const emptyDraft: Draft = { text: '', taskIds: [], issues: [] };
export const tomorrowOf = (date: string) => isoDate(addDays(parseISO(date), 1));

/** Order of task ids currently on the timeline. */
const planOrder = (plan: DayPlan) => plan.blocks.filter((b) => b.type === 'task' && b.taskId).map((b) => b.taskId as string);

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      /** Re-flow a day in the given order and sync task statuses. */
      const applyOrder = (date: string, order: string[], extraNotToday: string[] = []) => {
        const { days, tasks } = get();
        const plan = days[date];
        if (!plan) return;
        const ordered = order.map((id) => tasks[id]).filter((t): t is Task => Boolean(t));
        const { blocks, notToday } = reflow(ordered, plan.settings, plan.fixedBlocks, plan.blocks);
        const kept = plan.notToday.filter((n) => !order.includes(n.taskId) && !notToday.some((x) => x.taskId === n.taskId));
        const manual = extraNotToday.map((taskId) => ({ taskId, reason: 'Moved to Not Today by you' }));
        const allNot = [...notToday, ...kept.filter((k) => !extraNotToday.includes(k.taskId)), ...manual];
        const nextTasks = { ...tasks };
        for (const b of blocks) {
          const t = b.taskId ? nextTasks[b.taskId] : undefined;
          if (t && t.status === 'not_today') nextTasks[t.id] = { ...t, status: 'scheduled' };
        }
        for (const n of allNot) if (nextTasks[n.taskId]) nextTasks[n.taskId] = { ...nextTasks[n.taskId], status: 'not_today' };
        set({ tasks: nextTasks, days: { ...days, [date]: { ...plan, blocks, notToday: allNot } } });
      };

      return {
        ...initial,
        screen: 'today',
        go: (screen) => set({ screen }),

        setDraftText: (date, text) => {
          const drafts = get().drafts;
          set({ drafts: { ...drafts, [date]: { ...(drafts[date] ?? emptyDraft), text } } });
        },

        parseDraft: (date) => {
          const { drafts, tasks } = get();
          const draft = drafts[date] ?? emptyDraft;
          const result = parseBrainDump(draft.text, parseISO(date), { now: new Date() });
          if (result.tasks.length === 0) return result.errors;
          const rolled = new Set((draft.rolledTitles ?? []).map((t) => t.toLowerCase()));
          const nextTasks = { ...tasks };
          for (const id of draft.taskIds) delete nextTasks[id]; // re-parse replaces previous parse
          for (const t of result.tasks) {
            nextTasks[t.id] = rolled.has(t.title.toLowerCase()) && draft.rolledFrom ? { ...t, rolledOverFrom: draft.rolledFrom } : t;
          }
          set({
            tasks: nextTasks,
            drafts: { ...drafts, [date]: { ...draft, taskIds: result.tasks.map((t) => t.id), issues: result.issues } },
          });
          return result.errors;
        },

        addTask: (date) => {
          const id = uid('task');
          const task: Task = { id, title: '', durationMin: 30, priority: 'medium', status: 'pending', createdAt: new Date().toISOString() };
          const { drafts, tasks } = get();
          const draft = drafts[date] ?? emptyDraft;
          set({ tasks: { ...tasks, [id]: task }, drafts: { ...drafts, [date]: { ...draft, taskIds: [...draft.taskIds, id] } } });
          return id;
        },

        updateTask: (id, patch) => {
          const t = get().tasks[id];
          if (t) set({ tasks: { ...get().tasks, [id]: { ...t, ...patch } } });
        },

        removeFromDraft: (date, id) => {
          const { drafts, tasks } = get();
          const draft = drafts[date];
          const task = tasks[id];
          if (!draft || !task) return undefined;
          const index = draft.taskIds.indexOf(id);
          const nextTasks = { ...tasks };
          delete nextTasks[id];
          const issues = draft.issues.filter((i) => i.line !== index).map((i) => (i.line > index ? { ...i, line: i.line - 1 } : i));
          set({ tasks: nextTasks, drafts: { ...drafts, [date]: { ...draft, issues, taskIds: draft.taskIds.filter((x) => x !== id) } } });
          return { task, index };
        },

        restoreToDraft: (date, task, index) => {
          const { drafts, tasks } = get();
          const draft = drafts[date] ?? emptyDraft;
          const ids = [...draft.taskIds];
          ids.splice(index, 0, task.id);
          const issues = draft.issues.map((i) => (i.line >= index ? { ...i, line: i.line + 1 } : i));
          set({ tasks: { ...tasks, [task.id]: task }, drafts: { ...drafts, [date]: { ...draft, issues, taskIds: ids } } });
        },

        setSettings: (s, fixed) => set({ lastSettings: s, lastFixedBlocks: fixed }),

        generatePlan: (date) => {
          const { drafts, tasks, lastSettings, lastFixedBlocks, days } = get();
          const draft = drafts[date] ?? emptyDraft;
          const list = draft.taskIds.map((id) => tasks[id]).filter((t): t is Task => Boolean(t) && t.title.trim() !== '');
          const plan = planDay(list, lastSettings, lastFixedBlocks, date);
          const nextTasks = { ...tasks };
          for (const t of list) nextTasks[t.id] = { ...t, status: 'scheduled' };
          for (const n of plan.notToday) nextTasks[n.taskId] = { ...nextTasks[n.taskId], status: 'not_today' };
          set({ tasks: nextTasks, days: { ...days, [date]: plan }, screen: 'today' });
        },

        reorder: (date, order) => applyOrder(date, order),

        moveToNotToday: (date, taskId) => {
          const plan = get().days[date];
          if (plan) applyOrder(date, planOrder(plan).filter((id) => id !== taskId), [taskId]);
        },

        moveToToday: (date, taskId) => {
          const plan = get().days[date];
          if (plan) applyOrder(date, [...planOrder(plan), taskId]);
        },

        setStatus: (date, taskId, status) => {
          get().updateTask(taskId, { status });
          const timer = get().timer;
          const block = get().days[date]?.blocks.find((b) => b.id === timer?.blockId);
          if (timer && block?.taskId === taskId && status !== 'in_progress') get().endFocus('stop');
        },

        startFocus: (date, blockId) => {
          const plan = get().days[date];
          const block = plan?.blocks.find((b) => b.id === blockId);
          if (!plan || !block?.taskId) return;
          if (get().timer) get().endFocus('stop'); // one active timer at a time
          const minutes = toMin(block.end) - toMin(block.start);
          get().updateTask(block.taskId, { status: 'in_progress' });
          set({ timer: startTimer(blockId, date, minutes, Date.now()) });
        },

        togglePause: () => {
          const t = get().timer;
          if (!t || t.finished) return;
          set({ timer: t.pausedAt !== undefined ? resumeTimer(t, Date.now()) : pauseTimer(t, Date.now()) });
        },

        extend: (minutes) => {
          const t = get().timer;
          if (!t) return;
          // Extending after the countdown hit zero restarts the clock from "now".
          const base = t.finished ? resumeTimer({ ...t, durationMs: elapsedMs(t, Date.now()) }, Date.now()) : t;
          set({ timer: extendTimer(base, minutes) });
        },

        markTimerFinished: () => {
          const t = get().timer;
          if (t && !t.finished) set({ timer: { ...pauseTimer(t, t.startedAt + t.pausedMs + t.durationMs), finished: true } });
        },

        endFocus: (outcome) => {
          const { timer, days } = get();
          if (!timer) return;
          const plan = days[timer.date];
          const block = plan?.blocks.find((b) => b.id === timer.blockId);
          if (plan && block) {
            const focused = Math.round(elapsedMs(timer, Date.now()) / 60_000);
            const blocks = plan.blocks.map((b) => (b.id === block.id ? { ...b, actualFocusMin: (b.actualFocusMin ?? 0) + focused } : b));
            set({ days: { ...days, [timer.date]: { ...plan, blocks } } });
            const status: TaskStatus = outcome === 'done' ? 'done' : outcome === 'skipped' ? 'skipped' : 'scheduled';
            if (block.taskId) get().updateTask(block.taskId, { status });
          }
          set({ timer: undefined });
        },

        saveReview: (date, rating, note) => {
          const { days, tasks } = get();
          const plan = days[date];
          if (!plan) return;
          const s = summarize(plan, tasks);
          const review: DayReviewData = { rating, note: note?.slice(0, 280) || undefined, completedCount: s.completedCount, focusMin: s.focusMin };
          set({ days: { ...days, [date]: { ...plan, review } } });
        },

        rollover: (date) => {
          const { days, tasks, drafts } = get();
          const plan = days[date];
          if (!plan) return 0;
          const unfinished = summarize(plan, tasks).unfinished;
          const next = tomorrowOf(date);
          const draft = drafts[next] ?? emptyDraft;
          const { text, added } = mergeRollover(draft.text, unfinished);
          const rolledTitles = Array.from(new Set([...(draft.rolledTitles ?? []), ...unfinished.map((t) => t.title)]));
          set({
            drafts: { ...drafts, [next]: { ...draft, text, rolledFrom: date, rolledTitles } },
            days: { ...days, [date]: { ...plan, rolledOver: true } },
          });
          return added;
        },

        clearDay: (date) => {
          const plan = get().days[date];
          if (!plan) return undefined;
          const days = { ...get().days };
          delete days[date];
          if (get().timer?.date === date) set({ timer: undefined });
          set({ days });
          return plan;
        },

        restoreDay: (plan) => set({ days: { ...get().days, [plan.date]: plan } }),

        toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),

        deleteAll: () => {
          localStorage.removeItem(STORAGE_KEY);
          set({ ...initial, screen: 'today' });
        },
      };
    },
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedState => ({
        schemaVersion: SCHEMA_VERSION,
        tasks: s.tasks,
        days: s.days,
        drafts: s.drafts,
        lastSettings: s.lastSettings,
        lastFixedBlocks: s.lastFixedBlocks,
        timer: s.timer,
        theme: s.theme,
      }),
      // Future schema changes go here (e.g. `if (version < 2) { ... }`).
      migrate: (persisted) => ({ ...initial, ...(persisted as Partial<PersistedState>) }) as PersistedState,
    },
  ),
);
