import { useCallback, useMemo, useState } from 'react';
import { StorageService } from '../../../services/storageService';
import { createNote } from '../utils/createNote';
import { filterNotes, getLibraryTitle } from '../utils/filterNotes';
import type { Block, Folder, Note } from '../../../types';

interface UseNotesLibraryOptions {
  notes: Note[];
  folders: Folder[];
  userId: string;
  activeFolderId?: string | null;
  onNotesChange: React.Dispatch<React.SetStateAction<Note[]>>;
  onOpenNote: (noteId: string) => void;
}

/** Search, filtering and creation for the notes grid. */
export function useNotesLibrary({
  notes,
  folders,
  userId,
  activeFolderId,
  onNotesChange,
  onOpenNote,
}: UseNotesLibraryOptions) {
  const [search, setSearch] = useState('');

  const visibleNotes = useMemo(
    () => filterNotes(notes, { search, activeFolderId }),
    [notes, search, activeFolderId],
  );

  const title = useMemo(
    () => getLibraryTitle(activeFolderId, folders),
    [activeFolderId, folders],
  );

  const create = useCallback(
    async (options?: { title?: string; blocks?: Block[] }) => {
      const note = createNote({
        userId,
        folderId: activeFolderId !== undefined ? activeFolderId : null,
        ...options,
      });

      await StorageService.saveNote(note);
      onNotesChange((current) => [note, ...current]);
      onOpenNote(note.id);
      return note;
    },
    [userId, activeFolderId, onNotesChange, onOpenNote],
  );

  return {
    search,
    setSearch,
    visibleNotes,
    title,
    isFiltered: activeFolderId !== undefined,
    create,
  };
}
