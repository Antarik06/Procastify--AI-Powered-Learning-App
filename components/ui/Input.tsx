import React from 'react';
import { cn } from '../../lib/cn';
import { focusRing } from './tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  invalid?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'h-8 text-xs',
  md: 'h-10 text-sm',
  lg: 'h-12 text-base',
} as const;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ icon, iconRight, invalid = false, inputSize = 'md', className, ...props }, ref) => (
    <div className="relative flex w-full items-center">
      {icon && (
        <span className="pointer-events-none absolute left-3 text-discord-textMuted">{icon}</span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full rounded-xl border bg-black/20 text-white placeholder:text-discord-textMuted/70',
          'transition-colors duration-200',
          focusRing,
          invalid
            ? 'border-red-500/50 focus:border-red-500'
            : 'border-white/[0.08] hover:border-white/15 focus:border-discord-accent',
          SIZES[inputSize],
          icon ? 'pl-10' : 'pl-3.5',
          iconRight ? 'pr-10' : 'pr-3.5',
          className,
        )}
        {...props}
      />
      {iconRight && <span className="absolute right-3 text-discord-textMuted">{iconRight}</span>}
    </div>
  ),
);

Input.displayName = 'Input';
