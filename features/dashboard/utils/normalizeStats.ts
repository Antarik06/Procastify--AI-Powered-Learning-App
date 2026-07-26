import type { UserStats } from '../../../types';

const EMPTY_STATS: UserStats = {
  id: '',
  userId: '',
  totalTimeStudiedMinutes: 0,
  notesCreated: 0,
  quizzesTaken: 0,
  loginStreak: 0,
  lastLoginDate: new Date().toISOString(),
  dailyActivity: {},
  highScore: 0,
};

/**
 * Guarantees every field the dashboard reads exists. Stats written by older
 * versions can be missing `dailyActivity`, which the chart indexes into.
 */
export function normalizeStats(stats: UserStats | null | undefined): UserStats {
  if (!stats) return { ...EMPTY_STATS };

  return {
    ...EMPTY_STATS,
    ...stats,
    dailyActivity: stats.dailyActivity ?? {},
  };
}
