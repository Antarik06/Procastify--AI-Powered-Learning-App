import React from 'react';
import { cn } from '../../../lib/cn';

export interface SplitHandleProps {
  position: number;
  isDragging: boolean;
  onDragStart: () => void;
  onNudge: (delta: number) => void;
  onReset: () => void;
}

/** Keyboard-accessible drag handle between the document and canvas panes. */
export const SplitHandle: React.FC<SplitHandleProps> = ({
  position,
  isDragging,
  onDragStart,
  onNudge,
  onReset,
}) => (
  <div
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize document and canvas panes"
    aria-valuenow={Math.round(position)}
    aria-valuemin={20}
    aria-valuemax={80}
    tabIndex={0}
    title="Drag to resize · double-click to reset"
    onMouseDown={(event) => {
      event.preventDefault();
      onDragStart();
    }}
    onDoubleClick={onReset}
    onKeyDown={(event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onNudge(-2);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNudge(2);
      } else if (event.key === 'Home') {
        event.preventDefault();
        onReset();
      }
    }}
    className="group flex w-[14px] shrink-0 cursor-col-resize items-center justify-center focus:outline-none"
  >
    <span
      className={cn(
        'w-1 rounded-full transition-all duration-200',
        isDragging
          ? 'h-16 bg-discord-accent'
          : 'h-10 bg-white/15 group-hover:h-14 group-hover:bg-discord-accent/70 group-focus:bg-discord-accent',
      )}
    />
  </div>
);
