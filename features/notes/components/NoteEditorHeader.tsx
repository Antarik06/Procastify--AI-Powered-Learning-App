import React, { useState } from 'react';
import { ChevronLeft, FileText, Globe, Image as ImageIcon, Loader2, SplitSquareHorizontal, X } from 'lucide-react';
import { Badge, IconButton, SegmentedControl, Select } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import type { Folder, Note } from '../../../types';
import type { NoteViewMode } from '../types';

const VIEW_OPTIONS = [
  { value: 'document' as const, label: 'Document', icon: <FileText size={15} />, labelBreakpoint: 'xl' },
  { value: 'split' as const, label: 'Split', icon: <SplitSquareHorizontal size={15} />, labelBreakpoint: 'xl' },
  { value: 'canvas' as const, label: 'Canvas', icon: <ImageIcon size={15} />, labelBreakpoint: 'xl' },
];

export interface NoteEditorHeaderProps {
  note: Note;
  folders: Folder[];
  viewMode: NoteViewMode;
  canPublish: boolean;
  isGeneratingDiagram: boolean;
  diagramError: string | null;
  onBack: () => void;
  onTitleChange: (title: string) => void;
  onFolderChange: (folderId: string | null) => void;
  onViewModeChange: (mode: NoteViewMode) => void;
  onTogglePublish: () => void;
  onDismissError: () => void;
}

/** Compact editor toolbar: identity on the left, view controls on the right. */
export const NoteEditorHeader: React.FC<NoteEditorHeaderProps> = ({
  note,
  folders,
  viewMode,
  canPublish,
  isGeneratingDiagram,
  diagramError,
  onBack,
  onTitleChange,
  onFolderChange,
  onViewModeChange,
  onTogglePublish,
  onDismissError,
}) => {
  const [editingTitle, setEditingTitle] = useState(false);

  return (
    <header className="z-50 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-[#1a1b1e] px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <IconButton
          label="Back to all notes"
          icon={<ChevronLeft size={18} />}
          onClick={onBack}
          showTooltip={false}
        />

        <input
          value={note.title}
          onChange={(event) => onTitleChange(event.target.value)}
          onFocus={() => setEditingTitle(true)}
          onBlur={() => setEditingTitle(false)}
          placeholder="Untitled note"
          aria-label="Note title"
          className={cn(
            'min-w-0 max-w-sm flex-1 rounded-lg border border-transparent bg-transparent px-2.5 py-1.5',
            'text-base font-semibold text-white transition-all focus:outline-none',
            editingTitle ? 'border-white/10 bg-black/25' : 'hover:bg-white/5',
          )}
        />

        <div className="hidden w-36 shrink-0 md:block">
          <Select
            selectSize="sm"
            aria-label="Move to folder"
            value={note.folderId || ''}
            onChange={(event) => onFolderChange(event.target.value || null)}
          >
            <option value="">Uncategorized</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </Select>
        </div>

        {isGeneratingDiagram && (
          <Badge color="blue" size="md" icon={<Loader2 size={12} className="animate-spin" />} className="hidden lg:inline-flex">
            Generating diagram…
          </Badge>
        )}

        {diagramError && (
          <Badge color="red" size="md" className="hidden max-w-xs lg:inline-flex">
            <span className="truncate" title={diagramError}>
              {diagramError}
            </span>
            <button onClick={onDismissError} aria-label="Dismiss error" className="hover:text-red-200">
              <X size={12} />
            </button>
          </Badge>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canPublish && (
          <button
            onClick={onTogglePublish}
            title={note.isPublic ? 'Published — click to unpublish' : 'Publish to Community'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
              note.isPublic
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                : 'border-white/10 text-discord-textMuted hover:border-white/25 hover:text-white',
            )}
          >
            <Globe size={14} />
            <span className="hidden sm:inline">{note.isPublic ? 'Published' : 'Publish'}</span>
          </button>
        )}

        <SegmentedControl
          aria-label="Note view"
          value={viewMode}
          options={VIEW_OPTIONS}
          onChange={onViewModeChange}
        />
      </div>
    </header>
  );
};
