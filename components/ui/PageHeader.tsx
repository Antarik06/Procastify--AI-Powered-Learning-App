import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Renders a back affordance to the left of the title. */
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

/** Title block every full-page view starts with. */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  onBack,
  actions,
  className,
}) => (
  <header
    className={cn(
      'flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
      className,
    )}
  >
    <div className="flex min-w-0 items-center gap-3">
      {onBack && (
        <IconButton
          label="Go back"
          icon={<ChevronLeft size={18} />}
          onClick={onBack}
          showTooltip={false}
        />
      )}
      {icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-discord-accent/10 text-discord-accent">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight text-white">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-discord-textMuted">{description}</p>
        )}
      </div>
    </div>

    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>
);
