import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createId } from '../../../lib/id';
import { ToastItem } from './ToastItem';
import { setToastApi } from './notify';
import type { Toast, ToastApi, ToastInput } from './types';

const ToastContext = createContext<ToastApi | null>(null);

/**
 * App-wide notifications. Replaces `alert()` calls so feedback is consistent
 * and non-blocking.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const toast: Toast = {
        id: input.id ?? createId('toast'),
        tone: input.tone ?? 'info',
        title: input.title,
        description: input.description,
        duration: input.duration ?? 4000,
      };

      setToasts((current) => [...current.slice(-3), toast]);

      if (toast.duration > 0) {
        timers.current.set(
          toast.id,
          setTimeout(() => dismiss(toast.id), toast.duration),
        );
      }

      return toast.id;
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      success: (title, description) => show({ tone: 'success', title, description }),
      error: (title, description) => show({ tone: 'error', title, description, duration: 6000 }),
      info: (title, description) => show({ tone: 'info', title, description }),
      warning: (title, description) => show({ tone: 'warning', title, description }),
    }),
    [show, dismiss],
  );

  // Expose the API to the hook-free `notify` bridge (see notify.ts).
  useEffect(() => {
    setToastApi(api);
    return () => setToastApi(null);
  }, [api]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex flex-col items-end gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * Toast API. Safe to call outside a provider (falls back to console) so
 * components can be rendered in isolation.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  return context ?? FALLBACK_API;
}

const logOnly = (tone: string) => (title: string, description?: string) => {
  console.warn(`[toast:${tone}] ${title}${description ? ` — ${description}` : ''}`);
  return '';
};

const FALLBACK_API: ToastApi = {
  show: ({ title }) => logOnly('info')(title),
  success: logOnly('success'),
  error: logOnly('error'),
  info: logOnly('info'),
  warning: logOnly('warning'),
  dismiss: () => {},
};
