import { useMemo, useState } from 'react';
import { formatMinutes } from '../../../lib/format';
import {
  buildActivitySeries,
  getAxisMaximum,
  getBestDay,
  getTotalMinutes,
  hasAnyActivity,
} from '../utils/activity';
import type { UserStats } from '../../../types';
import type { TimeRange } from '../types';

/** Chart series plus the derived headline numbers, for a selectable range. */
export function useActivityData(stats: UserStats) {
  const [range, setRange] = useState<TimeRange>(7);

  const points = useMemo(() => buildActivitySeries(stats, range), [stats, range]);

  return useMemo(() => {
    const totalMinutes = getTotalMinutes(points);

    return {
      range,
      setRange,
      points,
      axisMaximum: getAxisMaximum(points),
      hasActivity: hasAnyActivity(points),
      totalLabel: formatMinutes(totalMinutes),
      averageLabel: formatMinutes(Math.round(totalMinutes / range)),
      bestDay: getBestDay(points),
    };
  }, [points, range]);
}
