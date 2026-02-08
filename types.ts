export type ViewState = 'landing' | 'onboarding' | 'dashboard' | 'summarizer' | 'notes' | 'routine' | 'focus' | 'quiz' | 'feed' | 'store';

export interface UserPreferences {
  id: string;
  isGuest: boolean;
  name: string;
  freeTimeHours: number;
  energyPeak: 'morning' | 'afternoon' | 'night';
  goal: string;
  distractionLevel: 'low' | 'medium' | 'high';
}

export interface UserStats {
  id: string;
  userId: string;
  totalTimeStudiedMinutes: number;
  notesCreated: number;
  quizzesTaken: number;
  loginStreak: number;
  lastLoginDate: string;
  dailyActivity: Record<string, number>;
  highScore: number;
}


export type NoteElementType = 'text' | 'sticky' | 'arrow' | 'image' | 'flashcard_deck' | 'summary_card';

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

export type BlockType = 'text' | 'h1' | 'h2' | 'h3' | 'bullet' | 'todo' | 'quote' | 'code' | 'image' | 'link';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  isChecked?: boolean;
  // Rich content fields (optional for backward compatibility)
  imageUrl?: string;    // Base64 data URL for image blocks
  linkUrl?: string;     // URL for link blocks
  language?: string;    // Programming language for code blocks
}

export interface NoteDocument {
  blocks: Block[]; // Updated to use Block interface
}

export interface NoteCanvas {
  elements: NoteElement[]; // Replaces top-level elements
  strokes?: any[]; // For future drawing support
}

export interface Note {
  id: string;
  userId: string;
  ownerId?: string; // Firebase owner
  title: string;

  // Dual-section architecture
  document?: NoteDocument;
  canvas?: NoteCanvas;

  // Legacy support (to be migrated)
  elements?: NoteElement[];

  tags: string[];
  folder: string;
  lastModified: number;

  // Persistence
  createdAt?: number | any;
  updatedAt?: number | any;

  isPublic?: boolean; // For community store
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
  mode: string; // Now supports any string (preset modes or custom mode names)
  createdAt: number;
  flashcards?: Flashcard[];
}

export interface RoutineTask {
  id: string;
  userId: string;
  title: string;
  durationMinutes: number;
  type: 'focus' | 'break' | 'buffer' | 'procastify';
  completed: boolean;
  timeSlot?: string;
  noteId?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuizReport {
  overallAccuracy: number;
  difficultyProgression: ('easy' | 'medium' | 'hard')[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  questions: Question[];
  highScore: number;
  lastPlayed?: number;
}


