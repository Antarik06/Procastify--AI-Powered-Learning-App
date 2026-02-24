import React, { useState } from 'react';
import {
  Layout,
  LayoutList,
  LayoutPanelLeft,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { CanvasLayoutMode } from '../types';
import { CanvasLayoutService } from '../services/canvasLayoutService';

interface LayoutSwitcherProps {
  currentLayout: CanvasLayoutMode;
  onLayoutChange: (layout: CanvasLayoutMode) => void;
}

export const LayoutSwitcher: React.FC<LayoutSwitcherProps> = ({
  currentLayout,
  onLayoutChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const layouts: Array<{
    mode: CanvasLayoutMode;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
      {
        mode: 'topbar',
        label: 'Top Navbar',
        description: 'Horizontal toolbar at the top',
        icon: <Layout size={18} />,
      },
      {
        mode: 'sidebar-left',
        label: 'Left Sidebar',
        description: 'Vertical tools on the left',
        icon: <LayoutPanelLeft size={18} />,
      },
      {
        mode: 'sidebar-right',
        label: 'Right Sidebar',
        description: 'Vertical tools on the right',
        icon: <LayoutPanelLeft size={18} className="rotate-180" />,
      },
      {
        mode: 'minimal',
        label: 'Minimal',
        description: 'Hide controls for focus',
        icon: <Eye size={18} />,
      },
    ];

  const currentLayoutInfo = layouts.find((l) => l.mode === currentLayout);

  const handleLayoutChange = (mode: CanvasLayoutMode) => {
    CanvasLayoutService.setLayoutMode(mode);
    onLayoutChange(mode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md border border-zinc-600 transition-colors text-sm"
        title="Change canvas layout"
      >
        {currentLayoutInfo?.icon}
        <span>{currentLayoutInfo?.label}</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-zinc-900 rounded-lg border border-zinc-700 shadow-xl z-50 min-w-56">
          <div className="p-2">
            {layouts.map((layout) => (
              <button
                key={layout.mode}
                onClick={() => handleLayoutChange(layout.mode)}
                className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-all ${currentLayout === layout.mode
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {layout.icon}
                  <div>
                    <div className="font-medium text-sm">{layout.label}</div>
                    <div className="text-xs text-zinc-400">{layout.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Floating action button for layout switching (useful for minimal mode)
 */
export const LayoutSwitcherFAB: React.FC<{
  currentLayout: CanvasLayoutMode;
  onLayoutChange: (layout: CanvasLayoutMode) => void;
}> = ({ currentLayout, onLayoutChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (currentLayout === 'minimal') {
    return (
      <div className="absolute bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
            title="Show layout options"
          >
            <Layout size={20} />
          </button>
        )}

        {isOpen && (
          <div className="absolute bottom-0 right-0 bg-zinc-900 rounded-lg border border-zinc-700 shadow-xl p-3 space-y-2">
            <button
              onClick={() => {
                onLayoutChange('topbar');
                CanvasLayoutService.setLayoutMode('topbar');
                setIsOpen(false);
              }}
              className="block w-full text-left px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-sm transition-colors"
            >
              Top Navbar
            </button>
            <button
              onClick={() => {
                onLayoutChange('sidebar-left');
                CanvasLayoutService.setLayoutMode('sidebar-left');
                setIsOpen(false);
              }}
              className="block w-full text-left px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-sm transition-colors"
            >
              Left Sidebar
            </button>
            <button
              onClick={() => {
                onLayoutChange('sidebar-right');
                CanvasLayoutService.setLayoutMode('sidebar-right');
                setIsOpen(false);
              }}
              className="block w-full text-left px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-sm transition-colors"
            >
              Right Sidebar
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="block w-full text-left px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-md text-sm transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
};
