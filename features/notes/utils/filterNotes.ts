import type { Folder, Note } from '../../../types';

export interface NoteFilterOptions {
  search: string;
  /** null = uncategorised only, undefined = every note. */
  activeFolderId?: string | null;
}

export function filterNotes(notes: Note[], { search, activeFolderId }: NoteFilterOptions): Note[] {
  const query = search.trim().toLowerCase();

  return notes.filter((note) => {
    if (query && !note.title.toLowerCase().includes(query)) return false;

    if (activeFolderId === undefined) return true;
    if (activeFolderId === null) return !note.folderId;
    return note.folderId === activeFolderId;
  });
}

/** Heading for the library, based on the folder filter in effect. */
export function getLibraryTitle(
  activeFolderId: string | null | undefined,
  folders: Folder[],
): string {
  if (activeFolderId === undefined) return 'My Notes';
  if (activeFolderId === null) return 'Uncategorized';
  return folders.find((folder) => folder.id === activeFolderId)?.name || 'Unknown folder';
}
