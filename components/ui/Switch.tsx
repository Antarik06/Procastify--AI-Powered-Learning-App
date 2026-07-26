import React from 'react';
import { cn } from '../../lib/cn';
import { focusRing } from './tokens';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
}) => (
  <label
    className={cn(
      'flex items-center justify-between gap-4',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      className,
    )}
  >
    {(label || description) && (
      <span className="min-w-0">
        {label && <span className="block text-sm font-medium text-white">{label}</span>}
        {description && (
          <span className="block text-xs text-discord-textMuted">{description}</span>
        )}
      </span>
    )}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
        focusRing,
        checked ? 'bg-discord-accent' : 'bg-white/15',
      )}
    >
      <span
        className={cn(
          'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  </label>
);
