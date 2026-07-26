import React from 'react';
import { PageContainer } from '../../components/ui';
import { WelcomeHeader } from './components/WelcomeHeader';
import { InsightSpotlight } from './components/InsightSpotlight';
import { StatsOverview } from './components/StatsOverview';
import { StudyAnalyticsCard } from './components/StudyAnalyticsCard';
import { useActivityData } from './hooks/useActivityData';
import { useDashboardInsight } from './hooks/useDashboardInsight';
import { normalizeStats } from './utils/normalizeStats';
import type { DashboardPageProps } from './types';

/**
 * Student dashboard. Every section is its own component; this file only wires
 * data to them.
 */
const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  summaries,
  notes,
  stats,
  onNoteClick,
  onNavigate,
}) => {
  const safeStats = normalizeStats(stats);
  const activity = useActivityData(safeStats);
  const insight = useDashboardInsight(user, notes, safeStats);

  const handleInsightAction = () => {
    const action = insight.ctaAction;
    switch (action.type) {
      case 'note':
        if (action.noteId) onNoteClick?.(action.noteId);
        break;
      case 'quiz':
        onNavigate?.('quiz');
        break;
      case 'focus':
        onNavigate?.('focus');
        break;
      case 'create-note':
        onNavigate?.('notes');
        break;
      default:
        break;
    }
  };

  return (
    <PageContainer size="xl" className="space-y-7">
      <WelcomeHeader user={user} />

      <InsightSpotlight insight={insight} onAction={handleInsightAction} />

      <StatsOverview
        stats={safeStats}
        noteCount={notes.length}
        summaryCount={summaries.length}
        onOpenQuiz={() => onNavigate?.('quiz')}
        onOpenNotes={() => onNavigate?.('notes')}
        onOpenSummarizer={() => onNavigate?.('summarizer')}
      />

      <StudyAnalyticsCard
        points={activity.points}
        axisMaximum={activity.axisMaximum}
        range={activity.range}
        hasActivity={activity.hasActivity}
        totalLabel={activity.totalLabel}
        averageLabel={activity.averageLabel}
        bestDay={activity.bestDay}
        onRangeChange={activity.setRange}
      />
    </PageContainer>
  );
};

export default DashboardPage;
