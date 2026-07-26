import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { focusRing } from './tokens';

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
}) => (
  <label
    className={cn(
      'inline-flex items-center gap-2.5',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      className,
    )}
  >
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200',
        focusRing,
        checked
          ? 'border-discord-accent bg-discord-accent text-white'
          : 'border-white/20 bg-black/20 hover:border-white/40',
      )}
    >
      {checked && <Check size={13} strokeWidth={3} />}
    </button>
    {label && <span className="text-sm text-discord-text">{label}</span>}
  </label>
);
