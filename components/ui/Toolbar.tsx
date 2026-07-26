import React from 'react';
import { cn } from '../../lib/cn';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Floating glass toolbar (canvas/editor) instead of a flat inline bar. */
  floating?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  floating = false,
  className,
  children,
  ...props
}) => (
  <div
    role="toolbar"
    className={cn(
      'flex items-center gap-1',
      floating
        ? 'rounded-2xl border border-white/10 bg-[#1a1b1e]/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl'
        : 'rounded-xl border border-white/[0.06] bg-black/25 p-1',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const ToolbarDivider: React.FC<{ orientation?: 'vertical' | 'horizontal' }> = ({
  orientation = 'vertical',
}) => (
  <span
    aria-hidden
    className={cn(
      'bg-white/10',
      orientation === 'vertical' ? 'mx-0.5 h-6 w-px' : 'my-0.5 h-px w-full',
    )}
  />
);

export const ToolbarGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('flex items-center gap-0.5', className)} {...props}>
    {children}
  </div>
);
