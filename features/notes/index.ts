export { default } from './NotesPage';
export { default as NotesPage } from './NotesPage';

export { NoteEditor } from './components/NoteEditor';
export { NotesLibrary } from './components/NotesLibrary';
export { NoteCard } from './components/NoteCard';

export { useNotesLibrary } from './hooks/useNotesLibrary';
export { useNoteEditor } from './hooks/useNoteEditor';
export { useSplitPane } from './hooks/useSplitPane';
export { useDiagramGeneration } from './hooks/useDiagramGeneration';

export { createNote } from './utils/createNote';
export { filterNotes, getLibraryTitle } from './utils/filterNotes';
export { getCanvasElements, getDocumentContent, getNotePlainText } from './utils/noteContent';
export { buildSummaryBlocks, createSeparatorBlock } from './utils/summaryBlocks';

export type { NoteViewMode, NotesPageProps } from './types';
