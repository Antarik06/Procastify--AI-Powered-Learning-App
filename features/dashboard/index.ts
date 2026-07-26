export { default } from './DashboardPage';
export { default as DashboardPage } from './DashboardPage';

export { WelcomeHeader } from './components/WelcomeHeader';
export { InsightSpotlight } from './components/InsightSpotlight';
export { StatsOverview } from './components/StatsOverview';
export { StudyAnalyticsCard } from './components/StudyAnalyticsCard';
export { ActivityChart } from './components/ActivityChart';

export { useActivityData } from './hooks/useActivityData';
export { useDashboardInsight } from './hooks/useDashboardInsight';
export { useElementWidth } from './hooks/useElementWidth';

export * from './utils/activity';
export { normalizeStats } from './utils/normalizeStats';
export type { ActivityPoint, DashboardPageProps, TimeRange } from './types';
