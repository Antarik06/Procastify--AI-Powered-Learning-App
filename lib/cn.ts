import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names and resolves conflicting Tailwind utilities
 * (the last one wins), so component variants can be overridden by callers.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
