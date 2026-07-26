import React, { useRef, useState } from 'react';
import DocumentEditor from '../../editor/DocumentEditor';
import CanvasBoard, { type CanvasBoardRef } from '../../canvas/CanvasBoard';
import { cn } from '../../../lib/cn';
import { NoteEditorHeader } from './NoteEditorHeader';
import { SplitHandle } from './SplitHandle';
import { useNoteEditor } from '../hooks/useNoteEditor';
import { useSplitPane } from '../hooks/useSplitPane';
import { useDiagramGeneration } from '../hooks/useDiagramGeneration';
import { getDocumentContent } from '../utils/noteContent';
import type { Folder, Note } from '../../../types';
import type { NoteViewMode } from '../types';

export interface NoteEditorProps {
  note: Note;
  folders: Folder[];
  canPublish: boolean;
  onNotesChange: React.Dispatch<React.SetStateAction<Note[]>>;
  onBack: () => void;
}

/** The note workspace: document and canvas in a resizable split. */
export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  folders,
  canPublish,
  onNotesChange,
  onBack,
}) => {
  const [viewMode, setViewMode] = useState<NoteViewMode>('split');
  const canvasRef = useRef<CanvasBoardRef>(null);
  const split = useSplitPane();

  const { updateTitle, updateDocument, moveToFolder, togglePublish } = useNoteEditor({
    note,
    folders,
    onNotesChange,
  });

  const diagram = useDiagramGeneration({
    canvasRef,
    onDiagramAdded: () => setViewMode((mode) => (mode === 'document' ? 'split' : mode)),
  });

  const showDocument = viewMode === 'document' || viewMode === 'split';
  const showCanvas = viewMode === 'canvas' || viewMode === 'split';
  const isSplit = viewMode === 'split';

  const paneClass = cn(
    'overflow-hidden bg-[#1e1f22]',
    isSplit && 'rounded-2xl border border-white/[0.06] shadow-lg shadow-black/20',
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#1e1f22]">
      <NoteEditorHeader
        note={note}
        folders={folders}
        viewMode={viewMode}
        canPublish={canPublish}
        isGeneratingDiagram={diagram.isGenerating}
        diagramError={diagram.error}
        onBack={onBack}
        onTitleChange={updateTitle}
        onFolderChange={moveToFolder}
        onViewModeChange={setViewMode}
        onTogglePublish={togglePublish}
        onDismissError={diagram.clearError}
      />

      <div
        ref={split.containerRef}
        className={cn('relative flex flex-1 overflow-hidden bg-[#151619]', isSplit && 'p-2')}
      >
        {showDocument && (
          <div
            className={cn(paneClass, 'flex flex-col')}
            style={{ width: isSplit ? `calc(${split.position}% - 7px)` : '100%' }}
          >
            <DocumentEditor
              content={getDocumentContent(note)}
              onUpdate={updateDocument}
              onGenerateDiagram={
                diagram.isGenerating ? undefined : (selectedText) => diagram.generate(selectedText)
              }
              compact={isSplit}
            />
          </div>
        )}

        {isSplit && (
          <SplitHandle
            position={split.position}
            isDragging={split.isDragging}
            onDragStart={split.startDrag}
            onNudge={split.nudge}
            onReset={split.reset}
          />
        )}

        {showCanvas && (
          <div
            className={paneClass}
            style={{ width: isSplit ? `calc(${100 - split.position}% - 7px)` : '100%' }}
          >
            <CanvasBoard canvasId={note.id} readOnly={false} ref={canvasRef} />
          </div>
        )}
      </div>
    </div>
  );
};
