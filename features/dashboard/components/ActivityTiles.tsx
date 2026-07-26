import React from 'react';
import { Clock, TrendingUp, Zap } from 'lucide-react';
import { cn } from '../../../lib/cn';
import type { ActivityPoint } from '../types';

interface TileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}

const Tile: React.FC<TileProps> = ({ icon, label, value, accent }) => (
  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
    <div className="mb-1 flex items-center gap-2">
      <span className={cn('shrink-0', accent)}>{icon}</span>
      <span className="text-xs text-discord-textMuted">{label}</span>
    </div>
    <p className="text-xl font-bold text-white">{value}</p>
  </div>
);

export interface ActivityTilesProps {
  totalLabel: string;
  averageLabel: string;
  bestDay: ActivityPoint | null;
}

/** Total / average / best-day summary above the analytics chart. */
export const ActivityTiles: React.FC<ActivityTilesProps> = ({
  totalLabel,
  averageLabel,
  bestDay,
}) => (
  <div className="grid grid-cols-3 gap-3">
    <Tile
      icon={<Clock size={14} />}
      label="Total time"
      value={totalLabel}
      accent="text-discord-accent"
    />
    <Tile
      icon={<TrendingUp size={14} />}
      label="Daily average"
      value={averageLabel}
      accent="text-emerald-400"
    />
    <Tile
      icon={<Zap size={14} />}
      label="Best day"
      value={bestDay ? bestDay.displayHours : '—'}
      accent="text-amber-400"
    />
  </div>
);
