import type { Note, Summary, UserAchievement, UserPreferences, UserStats } from '../../types';

/** Days of history the analytics chart can show. */
export type TimeRange = 7 | 14 | 30;

export interface ActivityPoint {
  /** Local YYYY-MM-DD. */
  date: string;
  /** Short axis label, e.g. "Jul 26". */
  name: string;
  minutes: number;
  hours: number;
  /** Pre-formatted "45m" / "1.5h" for tiles. */
  displayHours: string;
}

export interface DashboardPageProps {
  user: UserPreferences;
  summaries: Summary[];
  notes: Note[];
  stats: UserStats | null;
  achievements?: UserAchievement[];
  onNoteClick?: (noteId: string) => void;
  onNavigate?: (view: string) => void;
}
