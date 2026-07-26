import { useCallback } from 'react';
import { StorageService } from '../../../services/storageService';
import type { Block, Note } from '../../../types';

interface UseNoteEditorOptions {
  note: Note;
  folders: { id: string; name: string }[];
  onNotesChange: React.Dispatch<React.SetStateAction<Note[]>>;
}

/**
 * Mutations for the open note. Each one updates local state optimistically and
 * then persists, so typing never waits on storage.
 */
export function useNoteEditor({ note, folders, onNotesChange }: UseNoteEditorOptions) {
  const applyPatch = useCallback(
    (patch: Partial<Note>) => {
      const updated: Note = { ...note, ...patch, lastModified: Date.now() };
      onNotesChange((current) =>
        current.map((item) => (item.id === note.id ? updated : item)),
      );
      return updated;
    },
    [note, onNotesChange],
  );

  const updateTitle = useCallback(
    (title: string) => {
      void StorageService.saveNote(applyPatch({ title }));
    },
    [applyPatch],
  );

  const updateDocument = useCallback(
    (blocks: Block[]) => {
      void StorageService.saveNote(applyPatch({ document: { blocks } }));
    },
    [applyPatch],
  );

  const moveToFolder = useCallback(
    async (folderId: string | null) => {
      const folderName = folderId
        ? folders.find((folder) => folder.id === folderId)?.name || 'General'
        : 'General';
      await StorageService.saveNote(applyPatch({ folderId, folder: folderName }));
    },
    [applyPatch, folders],
  );

  const togglePublish = useCallback(async () => {
    const isPublic = !note.isPublic;
    const updated = applyPatch({
      isPublic,
      publishedAt: isPublic ? Date.now() : undefined,
    });

    if (isPublic) {
      await StorageService.publishNote(updated);
    } else {
      await StorageService.unpublishNote(note.id);
    }
  }, [note.id, note.isPublic, applyPatch]);

  return { updateTitle, updateDocument, moveToFolder, togglePublish };
}
