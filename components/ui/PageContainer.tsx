import React from 'react';
import { cn } from '../../lib/cn';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'md' | 'lg' | 'xl' | 'full';
  /** Removes the default vertical rhythm between direct children. */
  flush?: boolean;
}

const SIZES = {
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
} as const;

/** Consistent page gutters and max width for every scrollable view. */
export const PageContainer: React.FC<PageContainerProps> = ({
  size = 'xl',
  flush = false,
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'mx-auto w-full px-5 py-6 md:px-8 md:py-8',
      SIZES[size],
      !flush && 'space-y-6',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
