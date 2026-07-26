import React from 'react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

/** One empty/zero-data treatment for every list, grid and panel in the app. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  size = 'md',
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center',
      size === 'md' ? 'gap-3 py-16' : 'gap-2 py-8',
      className,
    )}
  >
    {icon && (
      <span
        className={cn(
          'flex items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-discord-textMuted',
          size === 'md' ? 'h-14 w-14' : 'h-11 w-11',
        )}
      >
        {icon}
      </span>
    )}
    <h3 className={cn('font-semibold text-white', size === 'md' ? 'text-lg' : 'text-sm')}>
      {title}
    </h3>
    {description && (
      <p className="max-w-sm text-sm text-discord-textMuted">{description}</p>
    )}
    {action && <div className="mt-1">{action}</div>}
  </div>
);
