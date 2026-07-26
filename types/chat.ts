export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceNotes?: { id: string; title: string }[];
  timestamp: number;
}

export interface NoteChatContext {
  noteId: string;
  noteTitle: string;
  content: string;
}

export interface ChatResponse {
  answer: string;
  sourceNoteIds: string[];
  confidence: 'high' | 'medium' | 'low' | 'not_found';
}
