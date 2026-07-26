import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../../../lib/collections';

const MIN_PERCENT = 20;
const MAX_PERCENT = 80;
const DEFAULT_PERCENT = 50;

export interface SplitPaneController {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Left pane width as a percentage of the container. */
  position: number;
  isDragging: boolean;
  startDrag: () => void;
  nudge: (delta: number) => void;
  reset: () => void;
}

/** Drag-to-resize state for the note editor's document/canvas split. */
export function useSplitPane(initial = DEFAULT_PERCENT): SplitPaneController {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(initial);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const percent = ((event.clientX - rect.left) / rect.width) * 100;
      setPosition(clamp(percent, MIN_PERCENT, MAX_PERCENT));
    },
    [],
  );

  useEffect(() => {
    if (!isDragging) return;

    const stop = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stop);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stop);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove]);

  return {
    containerRef,
    position,
    isDragging,
    startDrag: useCallback(() => setIsDragging(true), []),
    nudge: useCallback(
      (delta: number) => setPosition((current) => clamp(current + delta, MIN_PERCENT, MAX_PERCENT)),
      [],
    ),
    reset: useCallback(() => setPosition(DEFAULT_PERCENT), []),
  };
}
