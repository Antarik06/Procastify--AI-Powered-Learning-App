import type { Folder, Note, UserPreferences } from '../../types';

/** How the note editor splits its two panes. */
export type NoteViewMode = 'split' | 'document' | 'canvas';

export interface NotesPageProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  onDeleteNote: (id: string) => Promise<void>;
  user: UserPreferences;
  onNavigate: (view: any, folderId?: string | null) => void;
  /** null = uncategorised, undefined = all notes. */
  activeFolderId?: string | null;
  folders?: Folder[];
}
