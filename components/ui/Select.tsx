import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { focusRing } from './tokens';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  selectSize?: 'sm' | 'md';
}

const SIZES = {
  sm: 'h-8 text-xs pl-3 pr-8',
  md: 'h-10 text-sm pl-3.5 pr-9',
} as const;

/** Native select with app styling — keeps mobile pickers and keyboard behaviour. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, selectSize = 'md', className, children, ...props }, ref) => (
    <div className="relative inline-flex w-full items-center">
      <select
        ref={ref}
        className={cn(
          'w-full appearance-none rounded-xl border border-white/[0.08] bg-black/20 text-white',
          'transition-colors duration-200 hover:border-white/15 focus:border-discord-accent',
          focusRing,
          SIZES[selectSize],
          className,
        )}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 text-discord-textMuted"
      />
    </div>
  ),
);

Select.displayName = 'Select';
