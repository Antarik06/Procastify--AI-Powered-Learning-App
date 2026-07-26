import React from 'react';
import { cn } from '../../lib/cn';

/** Keyboard key hint, used in tooltips and shortcut legends. */
export const Kbd: React.FC<React.HTMLAttributes<HTMLElement>> = ({
  className,
  children,
  ...props
}) => (
  <kbd
    className={cn(
      'rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400',
      className,
    )}
    {...props}
  >
    {children}
  </kbd>
);
