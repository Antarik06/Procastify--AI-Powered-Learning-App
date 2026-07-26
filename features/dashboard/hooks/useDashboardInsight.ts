import { useEffect, useMemo, useState } from 'react';
import {
  generateDashboardInsight,
  generateDashboardInsightAsync,
  type DashboardInsight,
} from '../../../services/insightService';
import type { Note, UserPreferences, UserStats } from '../../../types';

/**
 * Shows the locally computed insight immediately, then upgrades to the AI one
 * when it arrives. Falls back silently if the AI call fails.
 */
export function useDashboardInsight(
  user: UserPreferences,
  notes: Note[],
  stats: UserStats,
): DashboardInsight {
  const fallback = useMemo(
    () => generateDashboardInsight(user, notes, stats),
    [user.id, notes.length, stats.loginStreak, stats.quizzesTaken],
  );

  const [insight, setInsight] = useState<DashboardInsight>(fallback);

  useEffect(() => {
    setInsight(fallback);

    let cancelled = false;
    generateDashboardInsightAsync(user, notes, stats)
      .then((aiInsight) => {
        if (!cancelled) setInsight(aiInsight);
      })
      .catch((error) => console.error('[Dashboard] AI insight failed:', error));

    return () => {
      cancelled = true;
    };
  }, [fallback]);

  return insight;
}
