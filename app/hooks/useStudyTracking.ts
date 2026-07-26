import { useEffect } from 'react';
import { ActivityTracker } from '../../services/activityTracker';
import type { AppView } from '../../types';

/**
 * Starts app-wide study-time tracking for the signed-in user and pauses it in
 * Focus Mode, which logs its own session time on exit.
 */
export function useStudyTracking(
  userId: string | undefined,
  view: AppView,
  onStatsChange: () => void,
): void {
  useEffect(() => {
    if (!userId) return;
    ActivityTracker.start(onStatsChange);
    return () => ActivityTracker.stop();
    // onStatsChange is intentionally not a dependency: restarting the tracker on
    // every render of the callback would drop accumulated time.
  }, [userId]);

  useEffect(() => {
    if (view === 'focus') {
      ActivityTracker.pause();
    } else {
      ActivityTracker.resume();
    }
  }, [view]);
}
