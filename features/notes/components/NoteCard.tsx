import React from 'react';
import { Trash2, PenLine, Shapes, Globe } from 'lucide-react';
import { Badge, Card, IconButton } from '../../../components/ui';
import { formatRelativeTime } from '../../../lib/date';
import { getCanvasElements, getNotePlainText } from '../utils/noteContent';
import { truncate } from '../../../lib/format';
import type { Folder, Note } from '../../../types';

export interface NoteCardProps {
  note: Note;
  folder?: Folder;
  onOpen: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, folder, onOpen, onDelete }) => {
  const elementCount = getCanvasElements(note).length;
  const preview = getNotePlainText(note);

  return (
    <Card
      interactive
      padding="none"
      onClick={() => onOpen(note.id)}
      className="group relative flex flex-col overflow-hidden"
    >
      {/* Preview */}
      <div className="relative flex-1 border-b border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent p-4">
        <div className="flex items-start justify-between gap-2">
          {folder ? (
            <Badge
              className="border-transparent text-white"
              style={{ backgroundColor: `${folder.color || '#5865F2'}33` }}
            >
              {folder.name}
            </Badge>
          ) : (
            <span />
          )}
          {note.isPublic && (
            <Badge color="green" icon={<Globe size={11} />}>
              Public
            </Badge>
          )}
        </div>

        <p className="mt-3 line-clamp-3 min-h-[3.5rem] text-xs leading-relaxed text-discord-textMuted">
          {preview ? truncate(preview, 160) : 'Empty note — open it to start writing.'}
        </p>
      </div>

      {/* Meta */}
      <div className="p-4">
        <h3 className="truncate text-sm font-semibold text-white">{note.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-discord-textMuted">
          <span className="inline-flex items-center gap-1">
            <PenLine size={11} />
            {formatRelativeTime(note.lastModified)}
          </span>
          {elementCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Shapes size={11} />
              {elementCount} on canvas
            </span>
          )}
        </div>
      </div>

      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <IconButton
          label="Delete note"
          icon={<Trash2 size={15} />}
          variant="danger"
          size="sm"
          showTooltip={false}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(note.id);
          }}
          className="bg-black/60 backdrop-blur-sm"
        />
      </div>
    </Card>
  );
};
