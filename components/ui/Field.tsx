import React from 'react';
import { cn } from '../../lib/cn';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error, so every form in the app lines up the same way. */
export const Field: React.FC<FieldProps> = ({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}) => (
  <div className={cn('space-y-1.5', className)}>
    {label && (
      <label htmlFor={htmlFor} className="block text-xs font-medium text-discord-textMuted">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs text-red-400">{error}</p>
    ) : hint ? (
      <p className="text-xs text-zinc-500">{hint}</p>
    ) : null}
  </div>
);
