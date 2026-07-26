import React, { useEffect, useRef, useState } from 'react';
import {
  MousePointer,
  Hand,
  Square,
  Circle,
  Minus,
  Pencil,
  Eraser,
  Type,
  Diamond,
  MoveRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Palette,
  Trash2,
  Check,
} from 'lucide-react';
import { ToolType, StrokeWidth, StrokeStyle, FontSize } from './canvas/types';

export interface ToolBarProps {
  activeTool: ToolType;
  color: string;
  strokeWidth: StrokeWidth;
  strokeStyle: StrokeStyle;
  fontSize: FontSize;
  zoomScale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onSelectTool: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: StrokeWidth) => void;
  onStrokeStyleChange: (style: StrokeStyle) => void;
  onFontSizeChange: (size: FontSize) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onClear: () => void;
}

type ToolDef = { tool: ToolType; icon: React.ReactNode; label: string; shortcut: string };

const SELECT_TOOLS: ToolDef[] = [
  { tool: 'selection', icon: <MousePointer size={17} />, label: 'Select', shortcut: 'V' },
  { tool: 'grab', icon: <Hand size={17} />, label: 'Pan', shortcut: 'H' },
];

const SHAPE_TOOLS: ToolDef[] = [
  { tool: 'rectangle', icon: <Square size={17} />, label: 'Rectangle', shortcut: 'R' },
  { tool: 'diamond', icon: <Diamond size={17} />, label: 'Diamond', shortcut: 'D' },
  { tool: 'ellipse', icon: <Circle size={17} />, label: 'Ellipse', shortcut: 'O' },
  { tool: 'line', icon: <Minus size={17} />, label: 'Line', shortcut: 'L' },
  { tool: 'arrow', icon: <MoveRight size={17} />, label: 'Arrow', shortcut: 'A' },
];

const DRAW_TOOLS: ToolDef[] = [
  { tool: 'free-draw', icon: <Pencil size={17} />, label: 'Draw', shortcut: 'P' },
  { tool: 'text', icon: <Type size={17} />, label: 'Text', shortcut: 'T' },
  { tool: 'eraser', icon: <Eraser size={17} />, label: 'Eraser', shortcut: 'E' },
];

const SWATCHES = [
  '#ffffff',
  '#94a3b8',
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#38bdf8',
  '#a78bfa',
];

/** Shapes that expose stroke/appearance options. */
const STYLEABLE = new Set<ToolType>([
  'rectangle',
  'diamond',
  'ellipse',
  'line',
  'arrow',
  'free-draw',
  'text',
]);

const PANEL =
  'rounded-2xl border border-white/10 bg-[#1a1b1e]/95 shadow-2xl shadow-black/50 backdrop-blur-xl';

/* ------------------------------------------------------------------ */
/* Vertical tool rail (left / right)                                    */
/* ------------------------------------------------------------------ */

export const ToolRail: React.FC<ToolBarProps & { side?: 'left' | 'right' }> = (props) => {
  const { side = 'left', activeTool, color, onSelectTool } = props;
  const [panelOpen, setPanelOpen] = useState(false);
  const showStyle = STYLEABLE.has(activeTool);

  useEffect(() => {
    if (!showStyle) setPanelOpen(false);
  }, [showStyle]);

  const renderGroup = (tools: ToolDef[]) =>
    tools.map((t) => (
      <ToolIconButton
        key={t.tool}
        icon={t.icon}
        label={t.label}
        shortcut={t.shortcut}
        active={activeTool === t.tool}
        onClick={() => onSelectTool(t.tool)}
        tooltipSide={side === 'left' ? 'right' : 'left'}
      />
    ));

  return (
    <>
      <div
        className={`absolute top-1/2 -translate-y-1/2 z-20 flex w-[52px] flex-col items-center gap-1 p-1.5 ${PANEL} ${
          side === 'left' ? 'left-3' : 'right-3'
        }`}
      >
        {renderGroup(SELECT_TOOLS)}
        <RailDivider />
        {renderGroup(SHAPE_TOOLS)}
        <RailDivider />
        {renderGroup(DRAW_TOOLS)}

        {showStyle && (
          <>
            <RailDivider />
            <button
              onClick={() => setPanelOpen((v) => !v)}
              title="Style options"
              aria-label="Style options"
              aria-expanded={panelOpen}
              className={`group relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                panelOpen ? 'bg-white/10' : 'hover:bg-white/[0.07]'
              }`}
            >
              <span
                className="h-[18px] w-[18px] rounded-full border border-white/25 shadow-inner"
                style={{ backgroundColor: color }}
              />
              <Tooltip side={side === 'left' ? 'right' : 'left'}>Style</Tooltip>
            </button>
          </>
        )}
      </div>

      {/* Style popover, anchored beside the rail */}
      {panelOpen && showStyle && (
        <StylePanel
          {...props}
          className={`absolute top-1/2 z-20 w-56 -translate-y-1/2 ${
            side === 'left' ? 'left-[72px]' : 'right-[72px]'
          }`}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Horizontal top bar                                                   */
/* ------------------------------------------------------------------ */

export const TopNavBar: React.FC<ToolBarProps> = (props) => {
  const { activeTool, color, onSelectTool } = props;
  const [panelOpen, setPanelOpen] = useState(false);
  const showStyle = STYLEABLE.has(activeTool);

  useEffect(() => {
    if (!showStyle) setPanelOpen(false);
  }, [showStyle]);

  const renderGroup = (tools: ToolDef[]) =>
    tools.map((t) => (
      <ToolIconButton
        key={t.tool}
        icon={t.icon}
        label={t.label}
        shortcut={t.shortcut}
        active={activeTool === t.tool}
        onClick={() => onSelectTool(t.tool)}
        tooltipSide="bottom"
      />
    ));

  return (
    <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
      <div className={`flex items-center gap-1 p-1.5 ${PANEL}`}>
        {renderGroup(SELECT_TOOLS)}
        <BarDivider />
        {renderGroup(SHAPE_TOOLS)}
        <BarDivider />
        {renderGroup(DRAW_TOOLS)}

        {showStyle && (
          <>
            <BarDivider />
            <button
              onClick={() => setPanelOpen((v) => !v)}
              title="Style options"
              aria-label="Style options"
              aria-expanded={panelOpen}
              className={`group relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                panelOpen ? 'bg-white/10' : 'hover:bg-white/[0.07]'
              }`}
            >
              <span
                className="h-[18px] w-[18px] rounded-full border border-white/25 shadow-inner"
                style={{ backgroundColor: color }}
              />
              <Tooltip side="bottom">Style</Tooltip>
            </button>
          </>
        )}
      </div>

      {panelOpen && showStyle && (
        <StylePanel
          {...props}
          className="absolute left-1/2 top-full mt-2 w-56 -translate-x-1/2"
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Zoom + canvas actions pill (shared by every layout)                  */
/* ------------------------------------------------------------------ */

export const CanvasActionBar: React.FC<{
  zoomScale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onClear: () => void;
  align?: 'left' | 'right';
}> = ({
  zoomScale,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onClear,
  align = 'left',
}) => {
  const [confirming, setConfirming] = useState(false);

  // Auto-cancel the clear confirmation so it never gets stuck on screen.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <div
      className={`absolute bottom-3 z-20 flex items-center gap-1 p-1.5 ${PANEL} ${
        align === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      <IconButton
        icon={<ZoomOut size={16} />}
        label="Zoom out"
        onClick={onZoomOut}
        disabled={!canZoomOut}
      />
      <button
        onClick={onResetZoom}
        title="Reset zoom (0)"
        className="min-w-[52px] rounded-lg px-1.5 py-1.5 text-xs font-medium tabular-nums text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white"
      >
        {Math.round(zoomScale * 100)}%
      </button>
      <IconButton
        icon={<ZoomIn size={16} />}
        label="Zoom in"
        onClick={onZoomIn}
        disabled={!canZoomIn}
      />
      <IconButton icon={<Maximize2 size={16} />} label="Fit to 100% (0)" onClick={onResetZoom} />

      <span className="mx-0.5 h-5 w-px bg-white/10" />

      {confirming ? (
        <button
          onClick={() => {
            onClear();
            setConfirming(false);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/25"
        >
          <Check size={14} /> Clear all?
        </button>
      ) : (
        <IconButton
          icon={<Trash2 size={16} />}
          label="Clear canvas"
          danger
          onClick={() => setConfirming(true)}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Style popover                                                        */
/* ------------------------------------------------------------------ */

const StylePanel: React.FC<
  ToolBarProps & { className?: string; onClose: () => void }
> = ({
  activeTool,
  color,
  strokeWidth,
  strokeStyle,
  fontSize,
  onColorChange,
  onStrokeWidthChange,
  onStrokeStyleChange,
  onFontSizeChange,
  className = '',
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Defer so the click that opened the panel doesn't immediately close it.
    const timer = setTimeout(() => document.addEventListener('mousedown', handlePointerDown), 0);
    document.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className={`${PANEL} p-3.5 ${className}`}>
      <Section label="Color">
        <div className="grid grid-cols-8 gap-1.5">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              onClick={() => onColorChange(swatch)}
              title={swatch}
              aria-label={`Color ${swatch}`}
              className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                color.toLowerCase() === swatch.toLowerCase()
                  ? 'border-white ring-2 ring-white/30'
                  : 'border-white/20'
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
        <label className="mt-2.5 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/20">
          <Palette size={14} />
          <span className="flex-1">Custom</span>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-5 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
            title="Custom color"
          />
        </label>
      </Section>

      <Section label="Stroke width">
        <div className="flex gap-1.5">
          {([1, 2, 4] as StrokeWidth[]).map((width) => (
            <button
              key={width}
              onClick={() => onStrokeWidthChange(width)}
              title={`${width}px`}
              className={`flex h-8 flex-1 items-center justify-center rounded-lg border transition-colors ${
                strokeWidth === width
                  ? 'border-discord-accent bg-discord-accent/20'
                  : 'border-white/10 bg-black/20 hover:border-white/25'
              }`}
            >
              <span
                className="w-5 rounded-full bg-zinc-200"
                style={{ height: `${width + 1}px` }}
              />
            </button>
          ))}
        </div>
      </Section>

      <Section label="Stroke style">
        <div className="flex gap-1.5">
          {(['solid', 'dashed', 'dotted'] as StrokeStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => onStrokeStyleChange(style)}
              title={style}
              className={`flex h-8 flex-1 items-center justify-center rounded-lg border transition-colors ${
                strokeStyle === style
                  ? 'border-discord-accent bg-discord-accent/20'
                  : 'border-white/10 bg-black/20 hover:border-white/25'
              }`}
            >
              <svg width="22" height="2" aria-hidden="true">
                <line
                  x1="0"
                  y1="1"
                  x2="22"
                  y2="1"
                  stroke="#e4e4e7"
                  strokeWidth="2"
                  strokeDasharray={
                    style === 'dashed' ? '5 3' : style === 'dotted' ? '1 3' : undefined
                  }
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ))}
        </div>
      </Section>

      {activeTool === 'text' && (
        <Section label="Font size">
          <div className="flex gap-1.5">
            {(['Small', 'Medium', 'Large', 'Extra Large'] as FontSize[]).map((size) => (
              <button
                key={size}
                onClick={() => onFontSizeChange(size)}
                title={size}
                className={`flex h-8 flex-1 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                  fontSize === size
                    ? 'border-discord-accent bg-discord-accent/20 text-white'
                    : 'border-white/10 bg-black/20 text-zinc-400 hover:border-white/25'
                }`}
              >
                {size === 'Extra Large' ? 'XL' : size.charAt(0)}
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Primitives                                                           */
/* ------------------------------------------------------------------ */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function Tooltip({
  side,
  children,
}: {
  side: 'left' | 'right' | 'bottom';
  children: React.ReactNode;
}) {
  const position =
    side === 'right'
      ? 'left-full ml-2.5 top-1/2 -translate-y-1/2'
      : side === 'left'
        ? 'right-full mr-2.5 top-1/2 -translate-y-1/2'
        : 'top-full mt-2.5 left-1/2 -translate-x-1/2';

  return (
    <span
      className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-white/10 bg-[#111214] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 ${position}`}
    >
      {children}
    </span>
  );
}

function ToolIconButton({
  icon,
  label,
  shortcut,
  active,
  onClick,
  tooltipSide,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active: boolean;
  onClick: () => void;
  tooltipSide: 'left' | 'right' | 'bottom';
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
        active
          ? 'bg-discord-accent text-white shadow-md shadow-discord-accent/30'
          : 'text-zinc-400 hover:bg-white/[0.07] hover:text-white'
      }`}
    >
      {icon}
      <Tooltip side={tooltipSide}>
        {label}
        {shortcut && <span className="ml-1.5 text-zinc-500">{shortcut}</span>}
      </Tooltip>
    </button>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`group relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
        disabled
          ? 'cursor-not-allowed text-zinc-600'
          : danger
            ? 'text-zinc-400 hover:bg-red-500/15 hover:text-red-300'
            : 'text-zinc-400 hover:bg-white/[0.07] hover:text-white'
      }`}
    >
      {icon}
    </button>
  );
}

function RailDivider() {
  return <div className="my-0.5 h-px w-7 bg-white/10" />;
}

function BarDivider() {
  return <div className="mx-0.5 h-6 w-px bg-white/10" />;
}
