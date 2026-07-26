import { useCallback, useState, type RefObject } from 'react';
import { generateDiagramFromText, convertSpecToShapes } from '../../../services/diagramService';
import { useToast } from '../../../components/ui';
import type { CanvasBoardRef } from '../../canvas/CanvasBoard';

interface UseDiagramGenerationOptions {
  canvasRef: RefObject<CanvasBoardRef | null>;
  /** Called after a successful generation so the canvas becomes visible. */
  onDiagramAdded: () => void;
}

/** AI diagram generation from the current text selection in the document pane. */
export function useDiagramGeneration({ canvasRef, onDiagramAdded }: UseDiagramGenerationOptions) {
  const toast = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (selectedText: string) => {
      if (!canvasRef.current) return;

      if (!selectedText.trim()) {
        setError('Select some text first');
        toast.warning('Select some text first', 'Highlight the text you want to visualise.');
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const spec = await generateDiagramFromText(selectedText);

        if (!spec?.nodes?.length) {
          throw new Error('No diagram elements could be generated. Try more specific text.');
        }

        const shapes = convertSpecToShapes(spec);
        if (shapes.length === 0) {
          throw new Error('No shapes could be generated from that text.');
        }

        canvasRef.current.addShapes(shapes);
        onDiagramAdded();
        toast.success('Diagram created', `${shapes.length} elements added to the canvas.`);
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Something went wrong generating the diagram.';
        setError(message);
        toast.error('Diagram generation failed', message);
      } finally {
        setIsGenerating(false);
      }
    },
    [canvasRef, onDiagramAdded, toast],
  );

  return { isGenerating, error, clearError: () => setError(null), generate };
}
