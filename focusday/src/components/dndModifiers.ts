import type { Modifier } from '@dnd-kit/core';

/** Locks dragging to the vertical axis (avoids pulling in @dnd-kit/modifiers for one function). */
export const restrictToVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });
