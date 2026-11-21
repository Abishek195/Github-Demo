# FocusDay

Turn a messy brain dump into a prioritized, time-blocked day plan, run focus sessions, and close the day with a short review. Local-first: no accounts, no backend, no network calls. Everything lives in your browser's `localStorage`.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

**Just want the HTML / CSS / JS files?** Open [`standalone/index.html`](standalone/index.html) in any modern browser. It works straight from disk (`file://`) with no server and no install. The folder holds three files:

| File | What it is |
|---|---|
| `standalone/index.html` | the page |
| `standalone/styles.css` | all styles (compiled Tailwind) |
| `standalone/app.js` | the whole app (React + logic), bundled as a classic script |

Regenerate them with `npm run build:standalone`.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production build to `dist/` (code-split; Stats/Recharts lazy-loaded) |
| `npm run build:standalone` | Single-file-per-type build to `standalone/` that opens from `file://` |
| `npm run preview` | Serve `dist/` locally |
| `npm run typecheck` | `tsc` only |
| `npm test` | Vitest unit tests (parser, planner, reflow, timer, review/rollover, validation, export) |

## Brain dump syntax

One task per line. Shortcuts can appear anywhere in the line:

| Shortcut | Meaning | Default |
|---|---|---|
| `~30m`, `~1h`, `~1h30m`, `~1.5h`, `~45` | duration (5–240 min) | 30m |
| `!h` / `!m` / `!l` (or `!high` …) | priority | medium |
| `#work` | tag (first one wins) | none |
| `@fri`, `@today`, `@tomorrow`, `@2026-11-25` | deadline | none |

Example: `Write QC report ~1h !h #work @fri`

## Keyboard shortcuts

`N` new task (Review) or open the brain dump (Today) · `Space` start/pause timer · `D` mark current block done · `Ctrl/⌘+Enter` parse brain dump. Drag handles also work with the keyboard: focus the handle, then Space, arrows, Space.

## Folder structure

```
focusday/
├─ index.html                 Vite entry
├─ standalone/                Ready-to-open HTML + CSS + JS (generated, committed)
├─ scripts/make-standalone.mjs  post-build step for the standalone folder
└─ src/
   ├─ types.ts                Data model (Task, Block, DayPlan, TimerState …)
   ├─ lib/                    Pure, UI-free logic
   │  ├─ parse.ts             parseBrainDump(), serializeTask()
   │  ├─ plan.ts              planDay(), reflow(), capacity(), scoring
   │  ├─ timer.ts             timestamp-based timer maths
   │  ├─ review.ts            summarize(), mergeRollover()
   │  ├─ validate.ts          settings / fixed-block validation
   │  ├─ export.ts            .ics / .txt export, file download
   │  ├─ time.ts              HH:mm helpers, ids
   │  └─ __tests__/           Vitest suites
   ├─ store/                  Zustand store (persisted, schemaVersion 1) + toast store
   ├─ hooks/                  useNow, useKeyboard, notifications/chime
   └─ components/             Screens and UI pieces
```

## How planning works

`planDay(tasks, settings, fixedBlocks, today)` is pure and deterministic:

1. Score = priority (high 30 / medium 20 / low 10) + deadline boost (overdue 35, today 25, tomorrow 15, within 7 days 5).
2. Sort by score (highest first), then shorter tasks first, then input order.
3. Free slots = work hours minus fixed blocks.
4. Greedy earliest-fit, with a break after each task. High-priority tasks first try to finish by 13:00, and lower-priority tasks give up morning time if a high task still needs it.
5. Anything that doesn't fit goes to **Not Today** with a reason: "Over capacity by 1h 30m", "Longer than any free slot …", or "No gap long enough left …".

Dragging a block calls `reflow()`. It keeps your exact order and recalculates every start and end time from the top, so nothing overlaps. Tasks that no longer fit drop into Not Today.

## Assumptions

All are also marked `// ASSUMPTION:` in the code.

- `@fri` means the next Friday. If today *is* Friday, it means today.
- A bare number after `~` (`~45`) is minutes. Out-of-range durations are clamped to 5–240 and flagged.
- Only one tag per task. Extra `#tags` are ignored with a warning. Common list markers (`- `, `* `, `1. `, `[ ] `) are stripped from pasted lines.
- `planDay` takes `today` as a 4th argument so it stays pure and testable.
- A break is shortened or dropped if it would run past the end of a free slot, for example into lunch.
- "High priority before 13:00" means the task should *finish* by 13:00 when there is room.
- Focus time counts only time measured by the timer. Marking a block done without a timer adds 0 focus minutes.
- Unfinished = scheduled-but-not-done tasks plus the Not Today list. Rollover writes them into tomorrow's brain dump and skips titles already there, so it never duplicates.
- Re-parsing the brain dump replaces the previously parsed (unplanned) tasks for that day.
- Break length is limited to 5, 10 or 15 minutes, per the spec's input table.
- `.ics` export uses floating local times (no timezone id).
- The "HTML, CSS and JS files" deliverable is the compiled app in `standalone/`, not a hand-written vanilla rewrite.

## Trade-offs

- **Greedy, not optimal.** The planner is predictable and explainable, but it doesn't bin-pack. A later short task may fit a gap a longer, higher-scored task couldn't use, and that is intentional.
- **localStorage.** It is simple and private, but limited to about 5 MB and to one browser and device. Export/Delete live in Settings, and the store is versioned (`schemaVersion: 1`) with a `migrate` hook for future changes.
- **Timer accuracy over ticking.** Remaining time is always computed from timestamps, so it stays correct after the tab is backgrounded or the page reloads. The interval only refreshes the display. With no service worker, the end-of-timer notification fires only while the tab is open (even in the background). If the tab was closed, the "Time is up" prompt appears when you return.
- **Sound** is a short WebAudio chime generated in code, so there is no audio file to load.
- **Bundle size.** Recharts is about 390 KB, so it is lazy-loaded in the normal build. The standalone build has to inline everything into one `app.js` (about 650 KB, 190 KB gzipped) so it works from `file://`.
- **Undo vs confirm.** Deleting a task and clearing the day use an undo toast. Deleting all data uses a confirm dialog, because it can't be undone.
