import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: ModalSize;
  /** Rendered in a sticky footer, right-aligned. */
  footer?: React.ReactNode;
  /** Set false for flows that must be completed via explicit actions. */
  dismissable?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  dismissable = true,
  className,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open || !dismissable) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, dismissable, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in"
        onClick={dismissable ? onClose : undefined}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl',
          'border border-white/10 bg-[#1e1f22] shadow-2xl shadow-black/60 focus:outline-none',
          'animate-in fade-in zoom-in-95',
          SIZES[size],
          className,
        )}
      >
        {(title || dismissable) && (
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
              {description && (
                <p className="mt-1 text-sm text-discord-textMuted">{description}</p>
              )}
            </div>
            {dismissable && (
              <IconButton
                label="Close"
                icon={<X size={18} />}
                onClick={onClose}
                showTooltip={false}
                className="-mr-1 shrink-0"
              />
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] bg-black/20 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
