import React from 'react';
import { cn } from '../../lib/cn';
import { accents, type AccentColor } from './tokens';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: AccentColor;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  /** Filled pill instead of the default tinted style. */
  solid?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  color = 'slate',
  size = 'sm',
  icon,
  solid = false,
  className,
  children,
  ...props
}) => {
  const palette = accents[color];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        solid
          ? cn(palette.solid, 'border-transparent text-white')
          : cn(palette.bg, palette.border, palette.text),
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
};
