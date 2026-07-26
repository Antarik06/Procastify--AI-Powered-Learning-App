import React from 'react';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '../../../components/ui';
import { formatHours } from '../../../lib/format';
import { useElementWidth } from '../hooks/useElementWidth';
import type { ActivityPoint, TimeRange } from '../types';

const CHART_HEIGHT = 280;
const ACCENT = '#5865F2';

export interface ActivityChartProps {
  points: ActivityPoint[];
  axisMaximum: number;
  range: TimeRange;
  hasActivity: boolean;
}

/** Study minutes per day. Width is measured explicitly — see useElementWidth. */
export const ActivityChart: React.FC<ActivityChartProps> = ({
  points,
  axisMaximum,
  range,
  hasActivity,
}) => {
  const { ref, width } = useElementWidth<HTMLDivElement>();

  return (
    <div ref={ref} className="relative w-full" style={{ height: CHART_HEIGHT, minWidth: 0 }}>
      {!hasActivity && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <EmptyState
            size="sm"
            title="No study time logged yet"
            description="Time is tracked automatically while you work in Procastify."
          />
        </div>
      )}

      {width > 0 && (
        <AreaChart
          width={width}
          height={CHART_HEIGHT}
          data={points}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ACCENT} stopOpacity={0.4} />
              <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#2b2d31" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#949ba4"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#949ba4', fontSize: 12 }}
            interval={range === 30 ? 'preserveStartEnd' : 0}
          />
          <YAxis
            stroke="#949ba4"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#949ba4', fontSize: 12 }}
            domain={[0, axisMaximum]}
            tickFormatter={(value: number) => (value >= 1 ? `${value}h` : `${value * 60}m`)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111214',
              border: '1px solid #2b2d31',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
            itemStyle={{ color: '#dbdee1' }}
            labelStyle={{ color: '#949ba4', marginBottom: '4px' }}
            formatter={(value) => [formatHours(Number(value)), 'Study time']}
            labelFormatter={(label) => String(label)}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke={ACCENT}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#activityGradient)"
            animationDuration={800}
            animationEasing="ease-out"
            dot={{ fill: ACCENT, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: ACCENT, stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      )}
    </div>
  );
};
