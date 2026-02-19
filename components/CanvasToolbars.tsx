import React from 'react';
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
  RotateCcw,
  Settings,
  X,
} from 'lucide-react';
import { ToolType, StrokeWidth, StrokeStyle, FontSize } from './canvas/types';

interface ToolBarProps {
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

/**
 * Top Navigation Bar Toolbar Layout
 * Horizontal layout at the top of the canvas
 */
export const TopNavBar: React.FC<ToolBarProps> = ({
  activeTool,
  color,
  strokeWidth,
  strokeStyle,
  fontSize,
  zoomScale,
  canZoomIn,
  canZoomOut,
  onSelectTool,
  onColorChange,
  onStrokeWidthChange,
  onStrokeStyleChange,
  onFontSizeChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onClear,
}) => {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-zinc-900 shadow-xl rounded-lg p-3 flex gap-2 z-10 border border-zinc-800 max-w-5xl">
      <div className="flex gap-2 items-center flex-wrap">
        {/* Selection Tools */}
        <ToolButton
          icon={<MousePointer size={18} />}
          active={activeTool === 'selection'}
          onClick={() => onSelectTool('selection')}
          title="Select (V)"
        />
        <ToolButton
          icon={<Hand size={18} />}
          active={activeTool === 'grab'}
          onClick={() => onSelectTool('grab')}
          title="Pan (Space)"
        />

        <Divider />

        {/* Shape Tools */}
        <ToolButton
          icon={<Square size={18} />}
          active={activeTool === 'rectangle'}
          onClick={() => onSelectTool('rectangle')}
          title="Rectangle (R)"
        />
        <ToolButton
          icon={<Diamond size={18} />}
          active={activeTool === 'diamond'}
          onClick={() => onSelectTool('diamond')}
          title="Diamond (D)"
        />
        <ToolButton
          icon={<Circle size={18} />}
          active={activeTool === 'ellipse'}
          onClick={() => onSelectTool('ellipse')}
          title="Ellipse (E)"
        />
        <ToolButton
          icon={<Minus size={18} />}
          active={activeTool === 'line'}
          onClick={() => onSelectTool('line')}
          title="Line (L)"
        />
        <ToolButton
          icon={<MoveRight size={18} />}
          active={activeTool === 'arrow'}
          onClick={() => onSelectTool('arrow')}
          title="Arrow (A)"
        />

        <Divider />

        {/* Draw Tools */}
        <ToolButton
          icon={<Pencil size={18} />}
          active={activeTool === 'free-draw'}
          onClick={() => onSelectTool('free-draw')}
          title="Free Draw (F)"
        />
        <ToolButton
          icon={<Type size={18} />}
          active={activeTool === 'text'}
          onClick={() => onSelectTool('text')}
          title="Text (T)"
        />
        <ToolButton
          icon={<Eraser size={18} />}
          active={activeTool === 'eraser'}
          onClick={() => onSelectTool('eraser')}
          title="Eraser (X)"
        />

        <Divider />

        {/* Color */}
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-8 h-8 cursor-pointer rounded border border-zinc-600 bg-transparent"
          title="Color"
        />

        <Divider />

        {/* Stroke Width */}
        <div className="flex gap-1">
          {([1, 2, 3, 4, 5] as StrokeWidth[]).map((width) => (
            <StrokeWidthButton
              key={width}
              width={width}
              active={strokeWidth === width}
              onClick={() => onStrokeWidthChange(width)}
            />
          ))}
        </div>

        <Divider />

        {/* Stroke Style */}
        <div className="flex gap-1">
          <StyleButton
            style="solid"
            active={strokeStyle === 'solid'}
            onClick={() => onStrokeStyleChange('solid')}
          />
          <StyleButton
            style="dashed"
            active={strokeStyle === 'dashed'}
            onClick={() => onStrokeStyleChange('dashed')}
          />
          <StyleButton
            style="dotted"
            active={strokeStyle === 'dotted'}
            onClick={() => onStrokeStyleChange('dotted')}
          />
        </div>

        {/* Font Size (for text tool) */}
        {activeTool === 'text' && (
          <>
            <Divider />
            <select
              value={fontSize}
              onChange={(e) => onFontSizeChange(e.target.value as FontSize)}
              className="bg-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded border border-zinc-600"
              aria-label="Font size"
              title="Font size selection"
            >
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
              <option value="Extra Large">XL</option>
            </select>
          </>
        )}

        <Divider />

        {/* Zoom Controls */}
        <div className="flex gap-1 items-center">
          <ToolButton
            icon={<ZoomOut size={18} />}
            active={false}
            onClick={onZoomOut}
            title="Zoom Out (-)"
            disabled={!canZoomOut}
          />
          <button
            onClick={onResetZoom}
            className="text-xs px-2 py-1 text-zinc-400 hover:text-zinc-200 rounded"
            title="Reset Zoom (0)"
          >
            {Math.round(zoomScale * 100)}%
          </button>
          <ToolButton
            icon={<ZoomIn size={18} />}
            active={false}
            onClick={onZoomIn}
            title="Zoom In (+)"
            disabled={!canZoomIn}
          />
        </div>

        <Divider />

        {/* Clear */}
        <button
          onClick={onClear}
          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded font-medium"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

/**
 * Sidebar Toolbar Layout
 * Vertical layout on left or right side
 */
export const SidebarToolBar: React.FC<
  ToolBarProps & { side?: 'left' | 'right'; width?: number }
> = ({
  side = 'left',
  width = 280,
  activeTool,
  color,
  strokeWidth,
  strokeStyle,
  fontSize,
  zoomScale,
  canZoomIn,
  canZoomOut,
  onSelectTool,
  onColorChange,
  onStrokeWidthChange,
  onStrokeStyleChange,
  onFontSizeChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onClear,
}) => {
  const sidebarWidth = width ? `${width}px` : '280px';
  return (
    <div
      className={`absolute top-0 ${
        side === 'left' ? 'left-0' : 'right-0'
      } h-full bg-zinc-900 shadow-xl border-r border-zinc-800 p-3 z-10 flex flex-col gap-3 overflow-y-auto`}
      style={{ width: sidebarWidth }}
    >
      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Tools
      </div>

      {/* Selection Section */}
      <ToolGroup title="Selection">
        <ToolButton
          icon={<MousePointer size={18} />}
          active={activeTool === 'selection'}
          onClick={() => onSelectTool('selection')}
          title="Select (V)"
          fullWidth
        />
        <ToolButton
          icon={<Hand size={18} />}
          active={activeTool === 'grab'}
          onClick={() => onSelectTool('grab')}
          title="Pan (Space)"
          fullWidth
        />
      </ToolGroup>

      <DividerH />

      {/* Shapes Section */}
      <ToolGroup title="Shapes">
        <ToolButton
          icon={<Square size={18} />}
          active={activeTool === 'rectangle'}
          onClick={() => onSelectTool('rectangle')}
          title="Rectangle (R)"
          fullWidth
        />
        <ToolButton
          icon={<Diamond size={18} />}
          active={activeTool === 'diamond'}
          onClick={() => onSelectTool('diamond')}
          title="Diamond (D)"
          fullWidth
        />
        <ToolButton
          icon={<Circle size={18} />}
          active={activeTool === 'ellipse'}
          onClick={() => onSelectTool('ellipse')}
          title="Ellipse (E)"
          fullWidth
        />
        <ToolButton
          icon={<Minus size={18} />}
          active={activeTool === 'line'}
          onClick={() => onSelectTool('line')}
          title="Line (L)"
          fullWidth
        />
        <ToolButton
          icon={<MoveRight size={18} />}
          active={activeTool === 'arrow'}
          onClick={() => onSelectTool('arrow')}
          title="Arrow (A)"
          fullWidth
        />
      </ToolGroup>

      <DividerH />

      {/* Drawing Section */}
      <ToolGroup title="Draw">
        <ToolButton
          icon={<Pencil size={18} />}
          active={activeTool === 'free-draw'}
          onClick={() => onSelectTool('free-draw')}
          title="Free Draw (F)"
          fullWidth
        />
        <ToolButton
          icon={<Type size={18} />}
          active={activeTool === 'text'}
          onClick={() => onSelectTool('text')}
          title="Text (T)"
          fullWidth
        />
        <ToolButton
          icon={<Eraser size={18} />}
          active={activeTool === 'eraser'}
          onClick={() => onSelectTool('eraser')}
          title="Eraser (X)"
          fullWidth
        />
      </ToolGroup>

      <DividerH />

      {/* Style Section */}
      <ToolGroup title="Style">
        <div className="space-y-2">
          <label className="text-xs text-zinc-500">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-full h-9 cursor-pointer rounded border border-zinc-600 bg-transparent"
            title="Color"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500">Width</label>
          <div className="flex gap-1 flex-wrap">
            {([1, 2, 3, 4, 5] as StrokeWidth[]).map((width) => (
              <StrokeWidthButton
                key={width}
                width={width}
                active={strokeWidth === width}
                onClick={() => onStrokeWidthChange(width)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500">Style</label>
          <div className="flex gap-1 flex-wrap">
            <StyleButton
              style="solid"
              active={strokeStyle === 'solid'}
              onClick={() => onStrokeStyleChange('solid')}
            />
            <StyleButton
              style="dashed"
              active={strokeStyle === 'dashed'}
              onClick={() => onStrokeStyleChange('dashed')}
            />
            <StyleButton
              style="dotted"
              active={strokeStyle === 'dotted'}
              onClick={() => onStrokeStyleChange('dotted')}
            />
          </div>
        </div>

        {activeTool === 'text' && (
          <div className="space-y-2">
            <label className="text-xs text-zinc-500">Font Size</label>
            <select
              value={fontSize}
              onChange={(e) => onFontSizeChange(e.target.value as FontSize)}
              className="w-full bg-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded border border-zinc-600"
              aria-label="Font size"
              title="Font size selection"
            >
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
              <option value="Extra Large">XL</option>
            </select>
          </div>
        )}
      </ToolGroup>

      <DividerH />

      {/* View Section */}
      <ToolGroup title="View">
        <div className="flex gap-1 flex-wrap justify-between">
          <ToolButton
            icon={<ZoomOut size={18} />}
            active={false}
            onClick={onZoomOut}
            title="Zoom Out (-)"
            disabled={!canZoomOut}
            compact
          />
          <button
            onClick={onResetZoom}
            className="text-xs px-2 py-1 text-zinc-400 hover:text-zinc-200 rounded flex-1"
            title="Reset Zoom (0)"
          >
            {Math.round(zoomScale * 100)}%
          </button>
          <ToolButton
            icon={<ZoomIn size={18} />}
            active={false}
            onClick={onZoomIn}
            title="Zoom In (+)"
            disabled={!canZoomIn}
            compact
          />
        </div>
      </ToolGroup>

      <DividerH />

      {/* Actions Section */}
      <ToolGroup title="Actions">
        <button
          onClick={onClear}
          className="w-full text-xs text-red-400 hover:text-red-300 px-2 py-2 rounded font-medium border border-red-400/30 hover:border-red-400/50 transition-colors"
        >
          Clear Canvas
        </button>
      </ToolGroup>

      <div className="flex-1" />
    </div>
  );
};

// Helper Components

function ToolButton({
  icon,
  active,
  onClick,
  title,
  disabled = false,
  fullWidth = false,
  compact = false,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`rounded-md transition-all ${
        fullWidth ? 'w-full' : ''
      } ${compact ? 'p-1' : 'p-2'} ${
        active
          ? 'bg-indigo-600 text-white'
          : disabled
            ? 'text-zinc-600 cursor-not-allowed'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
    >
      {icon}
    </button>
  );
}

function StrokeWidthButton({
  width,
  active,
  onClick,
}: {
  width: StrokeWidth;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={`Stroke Width: ${width}px`}
      className={`p-2 rounded-md transition-all flex items-center justify-center ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
    >
      <div
        className="bg-current rounded-full"
        style={{
          width: `${Math.min(width * 2, 8)}px`,
          height: `${Math.min(width * 2, 8)}px`,
        }}
      />
    </button>
  );
}

function StyleButton({
  style,
  active,
  onClick,
}: {
  style: StrokeStyle;
  active: boolean;
  onClick: () => void;
}) {
  const getLinePattern = () => {
    switch (style) {
      case 'solid':
        return '────';
      case 'dashed':
        return '- - -';
      case 'dotted':
        return '· · ·';
      default:
        return '────';
    }
  };

  return (
    <button
      onClick={onClick}
      title={`Stroke Style: ${style}`}
      className={`px-2 py-1 rounded-md transition-all text-xs font-mono ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
    >
      {getLinePattern()}
    </button>
  );
}

function Divider() {
  return <div className="w-px bg-zinc-700 h-6" />;
}

function DividerH() {
  return <div className="h-px bg-zinc-700 w-full" />;
}

function ToolGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
