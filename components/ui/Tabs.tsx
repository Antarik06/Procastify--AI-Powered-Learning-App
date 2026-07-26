import React from 'react';
import { cn } from '../../lib/cn';
import { focusRing } from './tokens';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps<T extends string> {
  value: T;
  items: TabItem<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/** Underlined tabs for page-level sections (classroom detail, quiz setup…). */
export function Tabs<T extends string>({ value, items, onChange, className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-1 border-b border-white/[0.06]', className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
              focusRing,
              active ? 'text-white' : 'text-discord-textMuted hover:text-white',
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  active ? 'bg-discord-accent/20 text-discord-accent' : 'bg-white/[0.06] text-zinc-400',
                )}
              >
                {item.count}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-discord-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
