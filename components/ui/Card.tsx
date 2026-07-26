import React from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds hover affordance for cards that act as links/buttons. */
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
} as const;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ interactive = false, padding = 'md', className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-discord-panel shadow-sm shadow-black/20',
        PADDING[padding],
        interactive &&
          'cursor-pointer transition-all duration-200 hover:border-white/15 hover:shadow-lg hover:shadow-black/30',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('mb-4 flex items-start justify-between gap-4', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<
  React.HTMLAttributes<HTMLHeadingElement> & { icon?: React.ReactNode }
> = ({ className, icon, children, ...props }) => (
  <h3
    className={cn('flex items-center gap-2 text-base font-semibold text-white', className)}
    {...props}
  >
    {icon}
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-sm text-discord-textMuted', className)} {...props}>
    {children}
  </p>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn('mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-4', className)}
    {...props}
  >
    {children}
  </div>
);
