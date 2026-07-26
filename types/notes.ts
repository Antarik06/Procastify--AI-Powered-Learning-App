import type { NoteElement } from './canvas';

export type BlockType =
  | 'text'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'todo'
  | 'quote'
  | 'code'
  | 'image'
  | 'link';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  isChecked?: boolean;
  /** Base64 data URL for image blocks. */
  imageUrl?: string;
  linkUrl?: string;
  /** Programming language for code blocks. */
  language?: string;
}

export interface NoteDocument {
  blocks: Block[];
}

export interface NoteCanvas {
  elements: NoteElement[];
  strokes?: any[];
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
  /** Computed at read time, not persisted. */
  noteCount?: number;
}

export interface Note {
  id: string;
  userId: string;
  /** Firebase owner. */
  ownerId?: string;
  title: string;

  // Dual-section architecture
  document?: NoteDocument;
  canvas?: NoteCanvas;

  /** Legacy top-level elements, superseded by `canvas.elements`. */
  elements?: NoteElement[];

  tags: string[];
  folder: string;
  folderId?: string | null;
  lastModified: number;

  createdAt?: number | any;
  updatedAt?: number | any;

  isPublic?: boolean;
  publishedAt?: number | any;
  likes?: number;

  aiAnalysis?: {
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedMinutes: number;
    cognitiveLoad: 'light' | 'medium' | 'heavy';
    summary: string;
  };
}

export interface QueueItem {
  id: string;
  userId: string;
  noteId: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: number;
  status: 'pending' | 'in_progress' | 'completed';
}
