export type CanvasLayoutMode = 'topbar' | 'sidebar-left' | 'sidebar-right' | 'minimal';

export interface CanvasPreferences {
  layoutMode: CanvasLayoutMode;
  sidebarWidth?: number;
  showGridLines?: boolean;
  snapToGrid?: boolean;
}

export type NoteElementType =
  | 'text'
  | 'sticky'
  | 'arrow'
  | 'image'
  | 'flashcard_deck'
  | 'summary_card';

export interface NoteElement {
  id: string;
  type: NoteElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  src?: string;
  color?: string;
  fontSize?: 'small' | 'medium' | 'large';

  startId?: string;
  endId?: string;

  zIndex: number;
}
