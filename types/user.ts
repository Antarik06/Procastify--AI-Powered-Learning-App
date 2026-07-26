import type { CanvasPreferences } from './canvas';

export type UserRole = 'student' | 'teacher';

export interface UserPreferences {
  id: string;
  isGuest: boolean;
  name: string;
  role?: UserRole;
  freeTimeHours: number;
  energyPeak: 'morning' | 'afternoon' | 'night';
  goal: string;
  distractionLevel: 'low' | 'medium' | 'high';
  email?: string;
  avatarUrl?: string;
  classroomIds?: string[];
  canvasPreferences?: CanvasPreferences;
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
  /** Minutes studied, keyed by local YYYY-MM-DD. Drives the analytics chart. */
  dailyActivity: Record<string, number>;
  highScore: number;
}
