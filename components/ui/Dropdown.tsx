import React, { useRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useClickOutside } from './hooks/useClickOutside';
import { useDisclosure } from './hooks/useDisclosure';

export interface DropdownItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

export interface DropdownProps {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  width?: string;
  className?: string;
}

/** Menu popover used for layout switchers, row actions and filters. */
export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  width = 'w-52',
  className,
}) => {
  const { isOpen, close, toggle } = useDisclosure();
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, close, isOpen);

  return (
    <div ref={ref} className={cn('relative', className)}>
      {trigger({ open: isOpen, toggle })}

      {isOpen && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-50 mt-2 p-1.5',
            'rounded-2xl border border-white/10 bg-[#1a1b1e]/95 shadow-2xl shadow-black/50 backdrop-blur-xl',
            align === 'right' ? 'right-0' : 'left-0',
            width,
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              onClick={() => {
                item.onSelect();
                close();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                item.danger
                  ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                  : item.selected
                    ? 'bg-discord-accent/15 text-white'
                    : 'text-zinc-300 hover:bg-white/[0.07] hover:text-white',
              )}
            >
              {item.icon && (
                <span className={item.selected ? 'text-discord-accent' : 'text-zinc-400'}>
                  {item.icon}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{item.label}</span>
                {item.description && (
                  <span className="block truncate text-[11px] text-zinc-500">
                    {item.description}
                  </span>
                )}
              </span>
              {item.selected && <Check size={14} className="text-discord-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
