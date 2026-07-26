import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 20, className, label }) => (
  <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
    <Loader2 size={size} className={cn('animate-spin text-discord-accent', className)} />
    {label && <span className="text-sm text-discord-textMuted">{label}</span>}
  </span>
);

/** Full-area loading state for lazily loaded pages and panels. */
export const LoadingScreen: React.FC<{ label?: string; className?: string }> = ({
  label = 'Loading…',
  className,
}) => (
  <div className={cn('flex h-full w-full items-center justify-center py-24', className)}>
    <Spinner size={28} label={label} />
  </div>
);
