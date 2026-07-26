import React from 'react';
import { cn } from '../../lib/cn';
import { accents, type AccentColor } from './tokens';
import { clamp } from '../../lib/collections';

export interface ProgressBarProps {
  /** 0-100. */
  value: number;
  color?: AccentColor;
  size?: 'sm' | 'md';
  label?: string;
  showValue?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'indigo',
  size = 'md',
  label,
  showValue = false,
  className,
}) => {
  const percent = clamp(Math.round(value), 0, 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="text-discord-textMuted">{label}</span>}
          {showValue && <span className="font-medium text-white">{percent}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn('w-full overflow-hidden rounded-full bg-white/[0.08]', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', accents[color].solid)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
