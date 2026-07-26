import React from 'react';
import { cn } from '../../lib/cn';
import { focusRing } from './tokens';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  /** Hide the text label below this breakpoint utility (e.g. "xl"). */
  labelBreakpoint?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

/** Mutually exclusive view/mode switcher — the app's standard for 2-4 options. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  className,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border border-white/[0.06] bg-black/25 p-1',
        className,
      )}
      {...props}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            title={option.label}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200',
              focusRing,
              size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
              active
                ? 'bg-discord-accent text-white shadow-sm shadow-discord-accent/30'
                : 'text-discord-textMuted hover:bg-white/5 hover:text-white',
            )}
          >
            {option.icon}
            <span className={option.labelBreakpoint ? `hidden ${option.labelBreakpoint}:inline` : undefined}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
