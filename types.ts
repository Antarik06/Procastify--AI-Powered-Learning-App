export type ViewState =
  | "landing"
  | "onboarding"
  | "roleSelection"
  | "dashboard"
  | "summarizer"
  | "notes"
  | "routine"
  | "focus"
  | "quiz"
  | "feed"
  | "store"
  | "auth"
  | "classrooms"
  | "classroomDetail"
  | "studentClassrooms"
  | "studentClassroomView";


export interface UserPreferences {
  id: string;
  isGuest: boolean;
  name: string;
  email?: string; // NEW: Store user email
  avatarUrl?: string; // NEW: Store user avatar URL
  role?: UserRole;
  freeTimeHours?: number;
  energyPeak?: "morning" | "afternoon" | "night";
  goal?: string;
  distractionLevel?: "low" | "medium" | "high";
  classroomIds?: string[];
  teacherPreferences?: {
    notificationsEnabled: boolean;
    autoApproveInvitations: boolean;
  };
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

export type NoteElementType =
  | "text"
  | "sticky"
  | "arrow"
  | "image"
  | "flashcard_deck"
  | "summary_card";

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
  fontSize?: "small" | "medium" | "large";

  startId?: string;
  endId?: string;

  zIndex: number;
}

export type BlockType =
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "todo"
  | "quote"
  | "code"
  | "image"
  | "link";

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  isChecked?: boolean;
  // Rich content fields (optional for backward compatibility)
  imageUrl?: string; // Base64 data URL for image blocks
  linkUrl?: string; // URL for link blocks
  language?: string; // Programming language for code blocks
}

export interface NoteDocument {
  blocks: Block[]; // Updated to use Block interface
}

export interface NoteCanvas {
  elements: NoteElement[]; // Replaces top-level elements
  strokes?: any[]; // For future drawing support
}

// New Folder interface
export interface Folder {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
  noteCount?: number; // Computed field, not stored
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
  folderId?: string | null; // New: References Folder.id
  lastModified: number;

  // Persistence
  createdAt?: number | any;
  updatedAt?: number | any;

  isPublic?: boolean; // For community store
  publishedAt?: number | any;
  likes?: number;

  aiAnalysis?: {
    difficulty: "easy" | "medium" | "hard";
    estimatedMinutes: number;
    cognitiveLoad: "light" | "medium" | "heavy";
    summary: string;
  };
}

export interface QueueItem {
  id: string;
  userId: string;
  noteId: string;
  priority: "high" | "medium" | "low";
  deadline?: number;
  status: "pending" | "in_progress" | "completed";
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  status: "new" | "learning" | "mastered";
}

export interface Attachment {
  id: string;
  type: "image" | "audio" | "pdf" | "url";
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
  type: "text" | "video" | "article" | "pdf" | "audio" | "mixed";
  mode: string; // Now supports any string (preset modes or custom mode names)
  createdAt: number;
  flashcards?: Flashcard[];
  // Extended fields for history feature
  originalText?: string;        // Full original text input
  attachments?: Attachment[];   // All attachments from session
}

// Type alias for summaries with complete session data
export type SummarySession = Required<Pick<Summary, 'originalText' | 'attachments'>> & Summary;

// Type guard to check if a summary has complete session data
export function isSummarySession(summary: Summary): summary is SummarySession {
  return 'originalText' in summary && 'attachments' in summary && 
         summary.originalText !== undefined && summary.attachments !== undefined;
}

export interface RoutineTask {
  id: string;
  userId: string;
  title: string;
  durationMinutes: number;
  type: "focus" | "break" | "buffer" | "procastify";
  completed: boolean;
  timeSlot?: string;
  noteId?: string;
  confidence?: "high" | "medium" | "low";
}

// Quiz Mode Types
export type QuizModeType = "standard" | "swipe" | "fillBlanks" | "explain";

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
  mode?: QuizModeType; // Optional for backward compatibility
}

// Fill in the Blanks specific types
export interface FillInTheBlanksQuestion extends Omit<Question, 'options' | 'correctIndex'> {
  mode: "fillBlanks";
  textWithBlanks: string;
  blanks: {
    id: string;
    correctAnswers: string[];
    userAnswer?: string;
  }[];
}

// Explain Your Answer specific types
export interface ExplainQuestion extends Question {
  mode: "explain";
  userExplanation?: string;
  reasoningScore?: number;
  reasoningFeedback?: string;
}

// Attempted question types for results
export interface AttemptedFillQuestion {
  question: string;
  blanks: {
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
  }[];
  overallCorrect: boolean;
  explanation: string;
}

export interface AttemptedExplainQuestion {
  question: string;
  options: string[];
  userAnswer: number;
  correctAnswer: number;
  answerCorrect: boolean;
  userExplanation: string;
  reasoningScore: number;
  reasoningFeedback: string;
  explanation: string;
  totalScore: number;
}

// Timer configuration
export interface TimerConfig {
  enabled: boolean;
  duration: number;
}

export interface QuizReport {
  overallAccuracy: number;
  difficultyProgression: ("easy" | "medium" | "hard")[];
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

// Multiplayer Quiz Types
export type QuizMode = "singleplayer" | "multiplayer";

export interface MultiplayerQuizSession {
  id: string;
  hostId: string;
  hostName: string;
  inviteCode: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  mode: QuizModeType;
  questions: Question[];
  participants: QuizParticipant[];
  status: "waiting" | "in_progress" | "completed";
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  currentQuestionIndex?: number;
}

export interface QuizParticipant {
  id: string;
  userId: string;
  userName: string;
  score: number;
  answers: QuizAnswer[];
  joinedAt: number;
  isReady: boolean;
}

export interface QuizAnswer {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  timeSpent: number;
  timestamp: number;
}

export interface QuizLeaderboard {
  sessionId: string;
  rankings: QuizRanking[];
  generatedAt: number;
}

export interface QuizRanking {
  userId: string;
  userName: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  averageTime: number;
  rank: number;
}

// Teacher Role Types
export type UserRole = "student" | "teacher";

export interface Classroom {
  id: string;
  teacherId: string;
  teacherName: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  studentIds: string[];
  invitationCount?: number;
  announcementCount?: number;
  code?: string; // NEW: Unique classroom code for joining
  codeEnabled?: boolean; // NEW: Toggle code joining
}

export interface Invitation {
  id: string;
  classroomId: string;
  classroomName: string;
  teacherId: string;
  teacherName: string;
  studentEmail: string;
  studentId?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
  respondedAt?: number;
}

export interface Announcement {
  id: string;
  classroomId: string;
  teacherId: string;
  teacherName: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface ClassroomResource {
  id: string;
  classroomId: string;
  resourceType: "note" | "quiz";
  resourceId: string;
  resourceTitle: string;
  resourceDescription?: string;
  sharedBy: string;
  sharedByName: string;
  sharedAt: number;
}

export interface TeacherStats {
  id: string;
  userId: string;
  totalClassrooms: number;
  totalStudents: number;
  totalAnnouncements: number;
  totalResourcesShared: number;
  pendingInvitations?: number;
  lastActivityDate: string;
}

// Activity Tracking
export type ActivityType = 
  | "student_joined" 
  | "student_accepted_invitation"
  | "announcement_posted" 
  | "resource_shared" 
  | "resource_copied";

export interface Activity {
  id: string;
  classroomId: string;
  classroomName: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  timestamp: number;
  metadata?: any;
}

// Study Resources Community Types
export type ExamType = 
  | "JEE"
  | "NEET"
  | "GATE"
  | "ICSE"
  | "CBSE"
  | "University"
  | "Other";

export type Level = 
  | "10"
  | "12"
  | "UG"
  | "PG"
  | "Other";

export type PaperType = 
  | "PYQ"
  | "Mock"
  | "Sample"
  | "Practice";

export type FileType = 
  | "pdf"
  | "image";

export interface StudyResource {
  id: string;
  userId: string;
  ownerId: string; // Firebase user ID
  
  // Metadata
  title: string;
  examType: ExamType;
  level: Level;
  subject: string;
  year: number;
  board: string; // Board or University name
  paperType: PaperType;
  description?: string;
  
  // File information
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: FileType;
  
  // Timestamps
  createdAt: number | any;
  updatedAt: number | any;
  
  // Engagement metrics (future enhancement)
  viewCount?: number;
  downloadCount?: number;
}

export interface ResourceMetadata {
  title: string;
  examType: ExamType;
  level: Level;
  subject: string;
  year: number;
  board: string;
  paperType: PaperType;
  description?: string;
}

export interface ResourceFilters {
  examType?: ExamType[];
  level?: Level[];
  subject?: string[];
  year?: number[];
  board?: string[];
  paperType?: PaperType[];
}

export interface PaginatedResources {
  resources: StudyResource[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SearchResult {
  resources: StudyResource[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

