import React from 'react';
import { BookOpen, FileText, Flame, Trophy } from 'lucide-react';
import { StatCard } from '../../../components/ui';
import { formatCount } from '../../../lib/format';
import { pluralize } from '../../../lib/format';
import type { UserStats } from '../../../types';

export interface StatsOverviewProps {
  stats: UserStats;
  noteCount: number;
  summaryCount: number;
  onOpenQuiz?: () => void;
  onOpenNotes?: () => void;
  onOpenSummarizer?: () => void;
}

/** The four headline counters. Each tile is a shortcut to its feature. */
export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  noteCount,
  summaryCount,
  onOpenQuiz,
  onOpenNotes,
  onOpenSummarizer,
}) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    <StatCard
      label="Highest quiz score"
      value={stats.highScore > 0 ? formatCount(stats.highScore) : '—'}
      hint={stats.highScore > 0 ? undefined : 'No games yet'}
      icon={<Trophy size={22} />}
      color="amber"
      onClick={onOpenQuiz}
    />
    <StatCard
      label="Daily streak"
      value={pluralize(stats.loginStreak, 'day')}
      icon={<Flame size={22} />}
      color="red"
    />
    <StatCard
      label="Notes created"
      value={formatCount(noteCount)}
      icon={<BookOpen size={22} />}
      color="purple"
      onClick={onOpenNotes}
    />
    <StatCard
      label="Summaries made"
      value={formatCount(summaryCount)}
      icon={<FileText size={22} />}
      color="green"
      onClick={onOpenSummarizer}
    />
  </div>
);
