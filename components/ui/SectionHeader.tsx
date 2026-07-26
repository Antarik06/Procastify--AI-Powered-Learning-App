import React from 'react';
import { cn } from '../../lib/cn';

export interface SectionHeaderProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Heading row inside a card or a page section. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  description,
  actions,
  className,
}) => (
  <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
    <div className="min-w-0">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        {icon && <span className="text-discord-accent">{icon}</span>}
        {title}
      </h2>
      {description && <p className="mt-0.5 text-xs text-discord-textMuted">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
