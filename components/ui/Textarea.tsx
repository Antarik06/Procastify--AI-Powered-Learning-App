import React from 'react';
import { cn } from '../../lib/cn';
import { focusRing } from './tokens';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ invalid = false, className, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-xl border bg-black/20 px-3.5 py-3 text-sm text-white',
        'placeholder:text-discord-textMuted/70 transition-colors duration-200 resize-y',
        focusRing,
        invalid
          ? 'border-red-500/50 focus:border-red-500'
          : 'border-white/[0.08] hover:border-white/15 focus:border-discord-accent',
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
