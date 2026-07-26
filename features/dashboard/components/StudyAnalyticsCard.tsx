import React from 'react';
import { Activity } from 'lucide-react';
import { Card, SectionHeader, SegmentedControl } from '../../../components/ui';
import { ActivityChart } from './ActivityChart';
import { ActivityTiles } from './ActivityTiles';
import type { ActivityPoint, TimeRange } from '../types';

const RANGE_OPTIONS = [
  { value: '7' as const, label: '7D' },
  { value: '14' as const, label: '14D' },
  { value: '30' as const, label: '30D' },
];

export interface StudyAnalyticsCardProps {
  points: ActivityPoint[];
  axisMaximum: number;
  range: TimeRange;
  hasActivity: boolean;
  totalLabel: string;
  averageLabel: string;
  bestDay: ActivityPoint | null;
  onRangeChange: (range: TimeRange) => void;
}

export const StudyAnalyticsCard: React.FC<StudyAnalyticsCardProps> = ({
  points,
  axisMaximum,
  range,
  hasActivity,
  totalLabel,
  averageLabel,
  bestDay,
  onRangeChange,
}) => (
  <Card padding="lg" className="space-y-5">
    <SectionHeader
      title="Study analytics"
      icon={<Activity size={17} />}
      actions={
        <SegmentedControl
          aria-label="Time range"
          value={String(range) as '7' | '14' | '30'}
          options={RANGE_OPTIONS}
          onChange={(value) => onRangeChange(Number(value) as TimeRange)}
        />
      }
    />

    <ActivityTiles totalLabel={totalLabel} averageLabel={averageLabel} bestDay={bestDay} />

    <ActivityChart
      points={points}
      axisMaximum={axisMaximum}
      range={range}
      hasActivity={hasActivity}
    />
  </Card>
);
