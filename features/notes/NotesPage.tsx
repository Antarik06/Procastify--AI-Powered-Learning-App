import React, { useState } from 'react';
import MigrationHub from './components/MigrationHub';
import NoteChatbot from './components/NoteChatbot';
import { useDisclosure } from '../../components/ui';
import { StorageService } from '../../services/storageService';
import { NotesLibrary } from './components/NotesLibrary';
import { NoteEditor } from './components/NoteEditor';
import { useNotesLibrary } from './hooks/useNotesLibrary';
import { createNote } from './utils/createNote';
import type { NotesPageProps } from './types';

/**
 * Notes feature entry point. Owns only the "which note is open" decision —
 * the library grid and the editor are separate components with their own state.
 */
const NotesPage: React.FC<NotesPageProps> = ({
  notes,
  setNotes,
  onDeleteNote,
  user,
  onNavigate,
  activeFolderId,
  folders = [],
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const migrationHub = useDisclosure();

  const library = useNotesLibrary({
    notes,
    folders,
    userId: user.id,
    activeFolderId,
    onNotesChange: setNotes,
    onOpenNote: setSelectedNoteId,
  });

  const activeNote = notes.find((note) => note.id === selectedNoteId);

  const handleImport = async (blocks: any[], title: string) => {
    const note = createNote({
      userId: user.id,
      title: title || 'Imported Note',
      folderId: activeFolderId !== undefined ? activeFolderId : null,
      tags: ['Imported'],
      blocks,
    });

    await StorageService.saveNote(note);
    setNotes((current) => [note, ...current]);
    migrationHub.close();
    setSelectedNoteId(note.id);
  };

  const handleDelete = async (noteId: string) => {
    if (selectedNoteId === noteId) setSelectedNoteId(null);
    await onDeleteNote(noteId);
  };

  if (activeNote) {
    return (
      <>
        <NoteEditor
          note={activeNote}
          folders={folders}
          canPublish={!user.isGuest}
          onNotesChange={setNotes}
          onBack={() => setSelectedNoteId(null)}
        />
        <NoteChatbot notes={notes} user={user} onNavigateToNote={setSelectedNoteId} />
      </>
    );
  }

  return (
    <>
      <NotesLibrary
        title={library.title}
        notes={library.visibleNotes}
        folders={folders}
        search={library.search}
        isFiltered={library.isFiltered}
        onSearchChange={library.setSearch}
        onOpenNote={setSelectedNoteId}
        onDeleteNote={handleDelete}
        onCreateNote={() => void library.create()}
        onClearFilter={() => onNavigate('notes')}
        onOpenFolders={() => onNavigate('folders')}
        onOpenCommunity={() => onNavigate('store')}
        onImport={migrationHub.open}
      />

      {migrationHub.isOpen && (
        <MigrationHub onImport={handleImport} onClose={migrationHub.close} />
      )}

      <NoteChatbot notes={notes} user={user} onNavigateToNote={setSelectedNoteId} />
    </>
  );
};

export default NotesPage;
