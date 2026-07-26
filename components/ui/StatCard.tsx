import React from 'react';
import { cn } from '../../lib/cn';
import { accents, type AccentColor } from './tokens';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  color?: AccentColor;
  hint?: string;
  trend?: { value: string; positive: boolean };
  onClick?: () => void;
  className?: string;
}

/** The single stat tile used across dashboards, quiz results and classrooms. */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color = 'indigo',
  hint,
  trend,
  onClick,
  className,
}) => {
  const palette = accents[color];
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col gap-3 rounded-2xl border border-white/[0.06] bg-discord-panel p-5 text-left',
        'transition-all duration-200',
        onClick && 'hover:border-white/15 hover:shadow-lg hover:shadow-black/30',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        {icon && (
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200',
              palette.bg,
              palette.text,
              onClick && 'group-hover:scale-105',
            )}
          >
            {icon}
          </span>
        )}
        {trend && (
          <span
            className={cn(
              'text-xs font-medium',
              trend.positive ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      <div>
        <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
        <p className="mt-0.5 text-sm font-medium text-discord-textMuted">{label}</p>
        {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      </div>
    </Component>
  );
};
