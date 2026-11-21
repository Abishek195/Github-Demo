import { useEffect, useRef } from 'react';

type KeyMap = Partial<Record<string, () => void>>;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Global single-key shortcuts ("n", "d", " "). Ignored while typing in a field,
 * with modifier keys held, or when a button has focus (so Space still clicks it).
 */
export function useKeyboard(map: KeyMap): void {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === ' ' && e.target instanceof HTMLButtonElement) return;
      const fn = ref.current[key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
