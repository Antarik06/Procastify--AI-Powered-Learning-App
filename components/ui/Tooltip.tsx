import React from 'react';
import { cn } from '../../lib/cn';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

const POSITIONS: Record<TooltipSide, string> = {
  top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
  bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  left: 'right-full mr-2 top-1/2 -translate-y-1/2',
  right: 'left-full ml-2 top-1/2 -translate-y-1/2',
};

export interface TooltipProps {
  content: React.ReactNode;
  side?: TooltipSide;
  children: React.ReactNode;
  className?: string;
}

/**
 * CSS-only tooltip: no portal, no timers. Wraps a single interactive child and
 * reveals on hover/focus of the wrapper.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  side = 'bottom',
  children,
  className,
}) => (
  <span className={cn('group/tooltip relative inline-flex', className)}>
    {children}
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute z-[100] whitespace-nowrap rounded-lg border border-white/10 bg-[#111214] px-2 py-1',
        'text-[11px] font-medium text-white opacity-0 shadow-xl transition-opacity duration-150',
        'group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
        POSITIONS[side],
      )}
    >
      {content}
    </span>
  </span>
);
