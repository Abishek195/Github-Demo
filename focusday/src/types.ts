export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'scheduled' | 'in_progress' | 'done' | 'skipped' | 'not_today';

export interface Task {
  id: string;
  title: string;
  durationMin: number; // 5–240
  priority: Priority;
  tag?: string;
  deadline?: string; // ISO date "YYYY-MM-DD"
  status: TaskStatus;
  createdAt: string;
  rolledOverFrom?: string; // date it came from
}

export interface Block {
  id: string;
  taskId?: string; // undefined for fixed blocks / breaks
  type: 'task' | 'fixed' | 'break';
  label: string;
  start: string; // "HH:mm"
  end: string;
  actualFocusMin?: number;
}

export interface DaySettings {
  workStart: string;
  workEnd: string;
  breakMin: number;
}

export interface NotTodayEntry {
  taskId: string;
  reason: string;
}

export interface DayReviewData {
  rating: 1 | 2 | 3 | 4 | 5;
  note?: string;
  completedCount: number;
  focusMin: number;
}

export interface DayPlan {
  date: string; // "YYYY-MM-DD"
  settings: DaySettings;
  fixedBlocks: Block[];
  blocks: Block[];
  notToday: NotTodayEntry[];
  review?: DayReviewData;
  rolledOver?: boolean;
}

/** One timer at a time. Times are epoch ms so the countdown survives backgrounding & reloads. */
export interface TimerState {
  blockId: string;
  date: string;
  startedAt: number;
  durationMs: number;
  pausedAt?: number;
  pausedMs: number; // accumulated paused time
  finished?: boolean; // countdown reached zero, waiting for Done / More / Skip
}

export interface ParseIssue {
  line: number; // 0-based index into the parsed tasks
  message: string;
}

export interface ParseResult {
  tasks: Task[];
  issues: ParseIssue[];
  errors: string[]; // fatal (no tasks produced / too many lines)
}

export type Screen = 'today' | 'dump' | 'review' | 'settings' | 'stats' | 'prefs' | 'dayReview';
