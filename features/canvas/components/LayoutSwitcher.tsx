import React, { useEffect, useRef, useState } from 'react';
import {
  Layout,
  LayoutPanelLeft,
  Eye,
  ChevronDown,
  Check,
  Maximize,
} from 'lucide-react';
import { CanvasLayoutMode } from '../../../types';
import { CanvasLayoutService } from '../../../services/canvasLayoutService';

interface LayoutOption {
  mode: CanvasLayoutMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const LAYOUTS: LayoutOption[] = [
  {
    mode: 'topbar',
    label: 'Top bar',
    description: 'Tools across the top',
    icon: <Layout size={16} />,
  },
  {
    mode: 'sidebar-left',
    label: 'Left rail',
    description: 'Vertical tools on the left',
    icon: <LayoutPanelLeft size={16} />,
  },
  {
    mode: 'sidebar-right',
    label: 'Right rail',
    description: 'Vertical tools on the right',
    icon: <LayoutPanelLeft size={16} className="rotate-180" />,
  },
  {
    mode: 'minimal',
    label: 'Focus',
    description: 'Hide every control',
    icon: <Eye size={16} />,
  },
];

const PANEL =
  'rounded-2xl border border-white/10 bg-[#1a1b1e]/95 shadow-2xl shadow-black/50 backdrop-blur-xl';

interface LayoutSwitcherProps {
  currentLayout: CanvasLayoutMode;
  onLayoutChange: (layout: CanvasLayoutMode) => void;
  /** Icon-only trigger, for narrow panes such as split view. */
  compact?: boolean;
}

export const LayoutSwitcher: React.FC<LayoutSwitcherProps> = ({
  currentLayout,
  onLayoutChange,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const current = LAYOUTS.find((l) => l.mode === currentLayout);

  const handleLayoutChange = (mode: CanvasLayoutMode) => {
    CanvasLayoutService.setLayoutMode(mode);
    onLayoutChange(mode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={`Canvas layout: ${current?.label ?? ''}`}
        aria-label="Change canvas layout"
        aria-expanded={isOpen}
        className={`flex items-center rounded-xl border border-white/10 bg-[#1a1b1e]/95 text-zinc-300 shadow-xl backdrop-blur-xl transition-colors hover:bg-white/[0.09] hover:text-white ${
          compact ? 'h-9 w-9 justify-center' : 'gap-2 px-2.5 py-2 text-xs font-medium'
        }`}
      >
        {current?.icon}
        {!compact && (
          <>
            <span>{current?.label}</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full z-50 mt-2 w-52 p-1.5 ${PANEL}`}>
          {LAYOUTS.map((layout) => {
            const active = currentLayout === layout.mode;
            return (
              <button
                key={layout.mode}
                onClick={() => handleLayoutChange(layout.mode)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                  active ? 'bg-discord-accent/15 text-white' : 'text-zinc-300 hover:bg-white/[0.07]'
                }`}
              >
                <span className={active ? 'text-discord-accent' : 'text-zinc-400'}>
                  {layout.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">{layout.label}</span>
                  <span className="block truncate text-[11px] text-zinc-500">
                    {layout.description}
                  </span>
                </span>
                {active && <Check size={14} className="text-discord-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Floating action button used in minimal ("Focus") mode, where every other
 * control is hidden.
 */
export const LayoutSwitcherFAB: React.FC<{
  currentLayout: CanvasLayoutMode;
  onLayoutChange: (layout: CanvasLayoutMode) => void;
}> = ({ currentLayout, onLayoutChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (currentLayout !== 'minimal') return null;

  const exitTo = (mode: CanvasLayoutMode) => {
    CanvasLayoutService.setLayoutMode(mode);
    onLayoutChange(mode);
    setIsOpen(false);
  };

  return (
    <div className="absolute bottom-3 right-3 z-30">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          title="Show canvas tools"
          aria-label="Show canvas tools"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#1a1b1e]/95 text-zinc-300 shadow-xl backdrop-blur-xl transition-colors hover:bg-white/[0.09] hover:text-white"
        >
          <Maximize size={17} />
        </button>
      ) : (
        <div className={`w-48 p-1.5 ${PANEL}`}>
          {LAYOUTS.filter((l) => l.mode !== 'minimal').map((layout) => (
            <button
              key={layout.mode}
              onClick={() => exitTo(layout.mode)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <span className="text-zinc-400">{layout.icon}</span>
              {layout.label}
            </button>
          ))}
          <button
            onClick={() => setIsOpen(false)}
            className="mt-0.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
