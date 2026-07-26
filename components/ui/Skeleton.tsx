import React from 'react';
import { cn } from '../../lib/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'block' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'block', className, ...props }) => (
  <div
    aria-hidden
    className={cn(
      'animate-pulse bg-white/[0.06]',
      variant === 'text' && 'h-4 rounded-md',
      variant === 'block' && 'rounded-xl',
      variant === 'circle' && 'rounded-full',
      className,
    )}
    {...props}
  />
);

/** Card-shaped placeholder for grids while data loads. */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'space-y-3 rounded-2xl border border-white/[0.06] bg-discord-panel p-5',
      className,
    )}
  >
    <Skeleton className="h-10 w-10" variant="circle" />
    <Skeleton variant="text" className="w-2/3" />
    <Skeleton variant="text" className="w-1/3" />
  </div>
);
