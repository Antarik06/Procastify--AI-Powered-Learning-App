import React from 'react';
import { cn } from '../../lib/cn';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  label,
  className,
}) => {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <span className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>
    );
  }

  return (
    <span
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'bg-white/[0.08]',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    />
  );
};
