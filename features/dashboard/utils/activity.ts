import { formatShortDate, lastNDays, toLocalDateKey } from '../../../lib/date';
import { formatHours } from '../../../lib/format';
import { sum } from '../../../lib/collections';
import type { UserStats } from '../../../types';
import type { ActivityPoint, TimeRange } from '../types';

/**
 * Builds one point per day for the requested range, filling gaps with zero so
 * the chart always has a continuous series.
 */
export function buildActivitySeries(stats: UserStats, days: TimeRange): ActivityPoint[] {
  const activity = stats.dailyActivity ?? {};

  return lastNDays(days).map((date) => {
    const key = toLocalDateKey(date);
    const minutes = Number(activity[key]) || 0;

    return {
      date: key,
      name: formatShortDate(date),
      minutes,
      hours: minutes / 60,
      displayHours: formatHours(minutes / 60),
    };
  });
}

/**
 * Upper bound for the Y axis. Small sessions get a 1h scale so a 20 minute day
 * is still visible, longer ones round up with 10% headroom.
 */
export function getAxisMaximum(points: ActivityPoint[]): number {
  if (points.length === 0) return 4;

  const max = Math.max(...points.map((point) => point.hours));
  if (max === 0) return 4;
  if (max < 1) return 1;
  if (max <= 4) return 4;
  return Math.ceil(max * 1.1);
}

export function getTotalMinutes(points: ActivityPoint[]): number {
  return sum(points.map((point) => point.minutes));
}

export function getBestDay(points: ActivityPoint[]): ActivityPoint | null {
  const best = points.reduce<ActivityPoint | null>(
    (winner, point) => (!winner || point.hours > winner.hours ? point : winner),
    null,
  );
  return best && best.hours > 0 ? best : null;
}

export function hasAnyActivity(points: ActivityPoint[]): boolean {
  return points.some((point) => point.minutes > 0);
}
