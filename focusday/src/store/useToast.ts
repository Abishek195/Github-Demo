import { create } from 'zustand';

export interface ToastItem {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, action?: { label: string; run: () => void }) => void;
  dismiss: (id: number) => void;
}

let next = 1;

/** Transient (not persisted) toasts, used for undo after destructive actions. */
export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, action) => {
    const id = next++;
    set({ toasts: [...get().toasts, { id, message, actionLabel: action?.label, onAction: action?.run }] });
    setTimeout(() => get().dismiss(id), 6000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
