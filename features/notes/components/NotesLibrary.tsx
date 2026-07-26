import React, { useState } from 'react';
import { BookOpen, FolderOpen, Globe, Plus, Upload, X } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PageContainer,
  PageHeader,
  SearchInput,
  useDisclosure,
} from '../../../components/ui';
import { pluralize } from '../../../lib/format';
import { NoteCard } from './NoteCard';
import type { Folder, Note } from '../../../types';

export interface NotesLibraryProps {
  title: string;
  notes: Note[];
  folders: Folder[];
  search: string;
  isFiltered: boolean;
  onSearchChange: (value: string) => void;
  onOpenNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => Promise<void> | void;
  onCreateNote: () => void;
  onClearFilter: () => void;
  onOpenFolders: () => void;
  onOpenCommunity: () => void;
  onImport: () => void;
}

/** Grid of note cards with search, filters and the primary create action. */
export const NotesLibrary: React.FC<NotesLibraryProps> = ({
  title,
  notes,
  folders,
  search,
  isFiltered,
  onSearchChange,
  onOpenNote,
  onDeleteNote,
  onCreateNote,
  onClearFilter,
  onOpenFolders,
  onOpenCommunity,
  onImport,
}) => {
  const confirm = useDisclosure();
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);

  const requestDelete = (noteId: string) => {
    setPendingDelete(notes.find((note) => note.id === noteId) ?? null);
    confirm.open();
  };

  const confirmDelete = async () => {
    if (pendingDelete) await onDeleteNote(pendingDelete.id);
    setPendingDelete(null);
    confirm.close();
  };

  return (
    <PageContainer size="lg">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {title}
            {isFiltered && (
              <IconButton
                label="Clear folder filter"
                icon={<X size={16} />}
                size="sm"
                onClick={onClearFilter}
              />
            )}
          </span>
        }
        description={pluralize(notes.length, 'note')}
        actions={
          <>
            <Button variant="ghost" icon={<FolderOpen size={16} />} onClick={onOpenFolders}>
              Folders
            </Button>
            <Button variant="ghost" icon={<Globe size={16} />} onClick={onOpenCommunity}>
              Community
            </Button>
            <Button variant="ghost" icon={<Upload size={16} />} onClick={onImport}>
              Import
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={onCreateNote}>
              New note
            </Button>
          </>
        }
      />

      <SearchInput
        value={search}
        onValueChange={onSearchChange}
        placeholder="Search notes by title…"
        className="max-w-md"
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title={search ? 'No notes match that search' : 'No notes yet'}
          description={
            search
              ? 'Try a different title or clear the search.'
              : 'Create a note to start writing and sketching side by side.'
          }
          action={
            !search && (
              <Button variant="primary" icon={<Plus size={16} />} onClick={onCreateNote}>
                Create your first note
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              folder={folders.find((folder) => folder.id === note.folderId)}
              onOpen={onOpenNote}
              onDelete={requestDelete}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirm.isOpen}
        title="Delete note?"
        message={
          <>
            <strong className="text-white">{pendingDelete?.title || 'This note'}</strong> and its
            canvas will be permanently removed. This can't be undone.
          </>
        }
        confirmLabel="Delete note"
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(null);
          confirm.close();
        }}
      />
    </PageContainer>
  );
};
