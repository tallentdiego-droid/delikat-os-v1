type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners: Set<Listener> = new Set();

const notify = () => {
  const copy = [...toasts];
  listeners.forEach((l) => l(copy));
};

const add = (message: string, type: ToastType, duration: number) => {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); notify(); }, duration);
};

export const toast = {
  success: (message: string) => add(message, 'success', 3500),
  error: (message: string) => add(message, 'error', 4500),
  info: (message: string) => add(message, 'info', 3000),
  dismiss: (id: string) => { toasts = toasts.filter((t) => t.id !== id); notify(); },
};

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
