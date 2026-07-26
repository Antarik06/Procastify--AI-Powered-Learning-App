import React from 'react';
import { cn } from '../../lib/cn';
import { focusRing } from './tokens';
import { Tooltip } from './Tooltip';

export type IconButtonVariant = 'ghost' | 'solid' | 'outline' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'text-discord-textMuted hover:text-white hover:bg-white/[0.07]',
  solid: 'bg-discord-accent text-white hover:bg-discord-accentHover',
  outline: 'border border-white/10 text-discord-textMuted hover:text-white hover:border-white/25',
  danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/10',
};

const SIZES: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-11 w-11 rounded-xl',
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: doubles as the accessible name and the hover tooltip. */
  label: string;
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
  /** Set false to rely on the native title attribute instead of the tooltip. */
  showTooltip?: boolean;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      label,
      icon,
      variant = 'ghost',
      size = 'md',
      active = false,
      showTooltip = true,
      tooltipSide = 'bottom',
      className,
      ...props
    },
    ref,
  ) => {
    const button = (
      <button
        ref={ref}
        aria-label={label}
        aria-pressed={active || undefined}
        title={showTooltip ? undefined : label}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200',
          'disabled:cursor-not-allowed disabled:opacity-40',
          focusRing,
          active
            ? 'bg-discord-accent text-white shadow-md shadow-discord-accent/30'
            : VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      >
        {icon}
      </button>
    );

    if (!showTooltip) return button;

    return (
      <Tooltip content={label} side={tooltipSide}>
        {button}
      </Tooltip>
    );
  },
);

IconButton.displayName = 'IconButton';
