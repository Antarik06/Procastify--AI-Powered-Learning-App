export interface Flashcard {
  id: string;
  front: string;
  back: string;
  status: 'new' | 'learning' | 'mastered';
}

export interface Attachment {
  id: string;
  type: 'image' | 'audio' | 'pdf' | 'url';
  content: string;
  mimeType?: string;
  name?: string;
}

export interface CustomMode {
  id: string;
  userId: string;
  name: string;
  systemPrompt: string;
  createdAt: number;
}

export interface Summary {
  id: string;
  userId: string;
  originalSource: string;
  summaryText: string;
  type: 'text' | 'video' | 'article' | 'pdf' | 'audio' | 'mixed';
  /** Preset mode id or a custom mode name. */
  mode: string;
  createdAt: number;
  flashcards?: Flashcard[];
  /** Full original input, kept so history can replay a session. */
  originalText?: string;
  attachments?: Attachment[];
}

/** A summary that carries everything needed to restore its session. */
export type SummarySession = Required<Pick<Summary, 'originalText' | 'attachments'>> & Summary;

export function isSummarySession(summary: Summary): summary is SummarySession {
  return (
    'originalText' in summary &&
    'attachments' in summary &&
    summary.originalText !== undefined &&
    summary.attachments !== undefined
  );
}
