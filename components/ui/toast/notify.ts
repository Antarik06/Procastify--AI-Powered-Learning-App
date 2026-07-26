import type { ToastApi } from './types';

/**
 * Hook-free access to the toast system.
 *
 * `useToast()` is the right choice inside components. This bridge exists for
 * call sites that can't use hooks — event handlers in class-free helpers,
 * services, and the many places that used to call `alert()`.
 *
 * Falls back to console logging until <ToastProvider> mounts.
 */
let api: ToastApi | null = null;

export function setToastApi(next: ToastApi | null): void {
  api = next;
}

const fallback = (tone: string) => (title: string, description?: string) => {
  console.warn(`[toast:${tone}] ${title}${description ? ` — ${description}` : ''}`);
  return '';
};

export const notify = {
  success: (title: string, description?: string) =>
    api ? api.success(title, description) : fallback('success')(title, description),
  error: (title: string, description?: string) =>
    api ? api.error(title, description) : fallback('error')(title, description),
  info: (title: string, description?: string) =>
    api ? api.info(title, description) : fallback('info')(title, description),
  warning: (title: string, description?: string) =>
    api ? api.warning(title, description) : fallback('warning')(title, description),
};
