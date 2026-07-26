export type QuizModeType = 'standard' | 'swipe' | 'fillBlanks' | 'explain';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  mode?: QuizModeType;
}

export interface FillInTheBlanksQuestion extends Omit<Question, 'options' | 'correctIndex'> {
  mode: 'fillBlanks';
  textWithBlanks: string;
  blanks: {
    id: string;
    correctAnswers: string[];
    userAnswer?: string;
  }[];
}

export interface ExplainQuestion extends Question {
  mode: 'explain';
  userExplanation?: string;
  reasoningScore?: number;
  reasoningFeedback?: string;
}

/**
 * Any question shape a quiz can contain. FillInTheBlanksQuestion drops
 * options/correctIndex, so it is not assignable to Question — use this union
 * wherever a question of any mode is accepted.
 */
export type AnyQuestion = Question | FillInTheBlanksQuestion | ExplainQuestion;

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

export interface TimerConfig {
  enabled: boolean;
  duration: number;
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

// ── Multiplayer ────────────────────────────────────────────────

export type MultiplayerQuizStatus = 'waiting' | 'in_progress' | 'completed';

export interface QuizAnswer {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  /** Seconds. */
  timeSpent: number;
  timestamp: number;
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

export interface MultiplayerQuizSession {
  id: string;
  hostId: string;
  hostName: string;
  inviteCode: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mode: QuizModeType;
  questions: Question[];
  participants: QuizParticipant[];
  status: MultiplayerQuizStatus;
  currentQuestionIndex?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
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

export interface QuizLeaderboard {
  sessionId: string;
  rankings: QuizRanking[];
  generatedAt: number;
}
