import React from 'react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Badge, Button } from '../../../components/ui';
import type { DashboardInsight } from '../../../services/insightService';

const ICONS: Record<string, LucideIcon> = {
  analysis: Target,
  motivation: Sparkles,
  revision: BookOpen,
  action: Zap,
  humor: Sparkles,
};

export interface InsightSpotlightProps {
  insight: DashboardInsight;
  onAction: () => void;
}

/** The "what should I do next" hero card at the top of the dashboard. */
export const InsightSpotlight: React.FC<InsightSpotlightProps> = ({ insight, onAction }) => {
  const Icon = ICONS[insight.insightType] ?? BrainCircuit;
  const showAction = Boolean(insight.ctaLabel) && insight.ctaAction.type !== 'none';

  return (
    <div className="rounded-2xl bg-gradient-to-r from-discord-accent to-purple-600 p-px shadow-lg shadow-discord-accent/20">
      <div className="flex flex-col gap-4 rounded-[15px] bg-[#1a1b1e]/95 p-5 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex min-w-0 flex-1 items-start gap-4 md:items-center md:gap-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-discord-accent/15 text-discord-accent md:h-14 md:w-14">
            <Icon size={24} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-white">{insight.welcomeMessage}</h2>
              <Badge color="indigo" className="capitalize">
                {insight.insightType}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-discord-text">{insight.mainMessage}</p>
            {insight.recommendedNote && (
              <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-discord-textMuted">
                <BookOpen size={13} className="shrink-0" />
                <span className="truncate">{insight.recommendedNote.title}</span>
              </p>
            )}
          </div>
        </div>

        {showAction && (
          <Button
            variant="primary"
            size="lg"
            onClick={onAction}
            iconRight={<ArrowRight size={17} />}
            className="shrink-0 bg-white text-discord-accent shadow-none hover:bg-zinc-100"
          >
            {insight.ctaLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
