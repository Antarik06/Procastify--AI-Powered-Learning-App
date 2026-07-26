import type { Block, Note, NoteElement } from '../../../types';

/** Canvas elements, tolerating the pre-migration top-level `elements` shape. */
export function getCanvasElements(note: Note): NoteElement[] {
  return note.canvas?.elements || note.elements || [];
}

/**
 * Document blocks in the current format.
 *
 * Older notes stored Tiptap nodes here (content is an array, no id). Those are
 * treated as empty so the editor can initialise a fresh document rather than
 * crashing on an unknown shape.
 */
export function getDocumentContent(note: Note): Block[] {
  const blocks = note.document?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return [];

  const first = blocks[0] as any;
  const isCurrentFormat = Boolean(first?.id) && typeof first?.content === 'string';
  return isCurrentFormat ? (blocks as Block[]) : [];
}

/** Plain-text preview used by search, cards and the chatbot. */
export function getNotePlainText(note: Note): string {
  return getDocumentContent(note)
    .map((block) => block.content.replace(/<[^>]*>/g, ' '))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
