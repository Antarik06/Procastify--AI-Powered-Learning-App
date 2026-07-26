import React from 'react';
import { cn } from '../../lib/cn';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  ring?: boolean;
}

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
} as const;

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  className,
  ring = true,
}) => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-discord-accent/20 font-semibold text-white',
      ring && 'border border-white/15',
      SIZES[size],
      className,
    )}
  >
    {src ? (
      <img src={src} alt={`${name}'s avatar`} className="h-full w-full object-cover" />
    ) : (
      name.charAt(0).toUpperCase()
    )}
  </span>
);
