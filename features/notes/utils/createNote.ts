import { createTimestampId } from '../../../lib/id';
import type { Block, Note } from '../../../types';

export interface CreateNoteOptions {
  userId: string;
  title?: string;
  folderId?: string | null;
  tags?: string[];
  blocks?: Block[];
}

/** Single place where a Note is constructed, so defaults never drift. */
export function createNote({
  userId,
  title = 'Untitled Note',
  folderId = null,
  tags = [],
  blocks = [],
}: CreateNoteOptions): Note {
  const now = Date.now();

  return {
    id: createTimestampId(),
    userId,
    title,
    tags,
    folder: 'General',
    folderId,
    lastModified: now,
    createdAt: now,
    document: { blocks },
    canvas: { elements: [] },
    // Legacy field kept in sync for readers that still look at it.
    elements: [],
  };
}
