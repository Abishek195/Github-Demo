import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVertical } from './dndModifiers';
import type { DayPlan, Task } from '../types';
import { useStore } from '../store/useStore';
import { timelineItems } from '../lib/plan';
import SortableBlock from './SortableBlock';

interface Props {
  plan: DayPlan;
  tasks: Record<string, Task>;
  currentBlockId?: string;
}

export default function Timeline({ plan, tasks, currentBlockId }: Props) {
  const timer = useStore((s) => s.timer);
  const { reorder, setStatus, startFocus, moveToNotToday } = useStore.getState();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const taskBlocks = plan.blocks.filter((b) => b.type === 'task');
  const ids = taskBlocks.map((b) => b.id);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const order = arrayMove(taskBlocks, from, to).map((b) => b.taskId as string);
    reorder(plan.date, order);
  };

  if (taskBlocks.length === 0) {
    return <p className="muted rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm dark:border-slate-700">Nothing scheduled. Move a task back from “Not Today” or re-plan the day.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVertical]}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2" aria-label="Today's timeline">
          {timelineItems(plan).map((b) => {
            if (b.type === 'break') {
              return (
                <li key={b.id} className="flex items-center gap-3 pl-9 text-xs text-slate-500 dark:text-slate-400">
                  <span className="w-[5.5rem] font-mono tabular-nums">{b.start}</span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  <span>break</span>
                </li>
              );
            }
            if (b.type === 'fixed') {
              return (
                <li key={b.id} className="flex gap-3 rounded-xl bg-slate-100 p-3 pl-12 text-sm dark:bg-slate-800/60">
                  <span className="w-[5.5rem] shrink-0 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">{b.start}–{b.end}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">📌 {b.label}</span>
                </li>
              );
            }
            const task = b.taskId ? tasks[b.taskId] : undefined;
            if (!task) return null;
            return (
              <SortableBlock
                key={b.id}
                block={b}
                task={task}
                isCurrent={b.id === currentBlockId}
                timerActive={Boolean(timer)}
                onFocus={() => startFocus(plan.date, b.id)}
                onDone={() => setStatus(plan.date, task.id, 'done')}
                onSkip={() => setStatus(plan.date, task.id, 'skipped')}
                onReset={() => setStatus(plan.date, task.id, 'scheduled')}
                onNotToday={() => moveToNotToday(plan.date, task.id)}
              />
            );
          })}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
