// View State Types
export type ViewState =
  | "landing"
  | "auth"
  | "roleSelection"
  | "dashboard"
  | "summarizer"
  | "notes"
  | "folders"
  | "routine"
  | "quiz"
  | "feed"
  | "store"
  | "classrooms"
  | "classroomDetail"
  | "studentClassrooms"
  | "studentClassroomView"
  | "focus";

// User Types
export type UserRole = "student" | "teacher";

export interface UserPreferences {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
  freeTimeHours: number;
  energyPeak: "morning" | "afternoon" | "evening";
  goal: string;
  distractionLevel: "low" | "medium" | "high";
  role?: UserRole;
  avatarUrl?: string;
}

export interface UserStats {
  notesCreated?: number;
  summariesCreated?: number;
  studyMinutes?: number;
  loginStreak?: number;
  lastLoginDate?: number;
  [key: string]: any;
}

// Routine Types
export interface RoutineTask {
  id: string;
  title: string;
  durationMinutes: number;
  type: "focus" | "break" | "procastify" | "buffer";
  completed: boolean;
  noteId: string | null;
  confidence?: "high" | "medium" | "low";
}

// Summary Types
export type SummaryType = "text" | "url" | "article" | "video" | "pdf" | "audio" | "mixed";

export interface Attachment {
  id?: string;
  name?: string;
  type: string;
  url?: string;
  content?: string;
  [key: string]: any;
}

export interface Summary {
  id: string;
  userId: string;
  originalSource: string;
  summaryText: string;
  type: SummaryType;
  mode: string;
  createdAt: number;
  originalText?: string;
  attachments?: Attachment[];
  [key: string]: any;
}

export interface SummarySession extends Summary {
  sessionData?: any;
}

export function isSummarySession(summary: Summary): summary is SummarySession {
  return "sessionData" in summary;
}

// Note Types
export interface NoteElement {
  id: string;
  type: string;
  content: string;
  [key: string]: any;
}

export interface Note {
  id: string;
  title: string;
  userId?: string;
  ownerId?: string;
  document?: {
    blocks: NoteElement[];
  };
  canvas?: {
    elements: any[];
    strokes?: any[];
  };
  createdAt?: number;
  updatedAt?: number;
  isPublic?: boolean;
  publishedAt?: number | null;
  aiAnalysis?: {
    estimatedMinutes?: number;
    difficulty?: "easy" | "medium" | "hard";
    [key: string]: any;
  };
  [key: string]: any;
}

// Folder Types
export interface Folder {
  id: string;
  name: string;
  userId: string;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: any;
}

// Flashcard Types
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  userId?: string;
  [key: string]: any;
}

// Queue Types
export interface QueueItem {
  id: string;
  userId: string;
  noteId: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed";
  [key: string]: any;
}

// Quiz Types
export interface Quiz {
  id: string;
  questions: Question[];
  [key: string]: any;
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  [key: string]: any;
}

// Custom Mode Types
export interface CustomMode {
  id: string;
  name: string;
  prompt: string;
  userId?: string;
  [key: string]: any;
}

// Classroom Types
export interface Classroom {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
  teacherName?: string;
  studentIds: string[];
  code?: string;
  codeEnabled?: boolean;
  inviteCode?: string;
  virtualLinks?: any[];
  createdAt?: number;
  updatedAt?: number;
  [key: string]: any;
}

export interface Invitation {
  id: string;
  classroomId: string;
  teacherId: string;
  studentEmail: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: number;
  respondedAt?: number;
  [key: string]: any;
}

export interface Announcement {
  id: string;
  classroomId: string;
  title: string;
  content: string;
  authorId: string;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: any;
}

export interface ClassroomResource {
  id: string;
  classroomId: string;
  name: string;
  type: string;
  url?: string;
  sharedAt?: number;
  [key: string]: any;
}

export interface Activity {
  id: string;
  classroomId: string;
  classroomName: string;
  type: string;
  actorId: string;
  actorName: string;
  timestamp: number;
  [key: string]: any;
}

export interface TeacherStats {
  classroomsCreated?: number;
  studentsTaught?: number;
  [key: string]: any;
}

// Multiplayer Quiz Types
export interface MultiplayerQuizSession {
  id: string;
  inviteCode: string;
  status: "waiting" | "in_progress" | "completed";
  participants: QuizParticipant[];
  createdAt?: number;
  startedAt?: number;
  completedAt?: number;
  [key: string]: any;
}

export interface QuizParticipant {
  userId: string;
  userName: string;
  answers: QuizAnswer[];
  score: number;
  [key: string]: any;
}

export interface QuizAnswer {
  questionIndex: number;
  answer: number;
  isCorrect: boolean;
  timeSpent: number;
  [key: string]: any;
}

export interface QuizLeaderboard {
  sessionId: string;
  rankings: QuizRanking[];
  generatedAt: number;
  [key: string]: any;
}

export interface QuizRanking {
  userId: string;
  userName: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  averageTime: number;
  rank: number;
  [key: string]: any;
}

export interface QuizReport {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timeSpent: number;
  [key: string]: any;
}
