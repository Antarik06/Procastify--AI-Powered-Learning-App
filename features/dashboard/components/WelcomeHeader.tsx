import React from 'react';
import { Calendar } from 'lucide-react';
import { Avatar } from '../../../components/ui';
import { formatLongDate } from '../../../lib/date';
import type { UserPreferences } from '../../../types';

export const WelcomeHeader: React.FC<{ user: UserPreferences }> = ({ user }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div className="flex items-center gap-4">
      <Avatar name={user.name} src={user.avatarUrl} size="lg" />
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Welcome back, {user.name || 'there'}
          <span className="inline-block origin-bottom-right animate-wave">👋</span>
        </h1>
        <p className="mt-1 text-sm text-discord-textMuted">
          You're on track with your <strong className="text-white">{user.goal || 'study'}</strong>{' '}
          goal.
        </p>
      </div>
    </div>

    <div className="inline-flex items-center gap-2 self-start rounded-xl border border-white/[0.06] bg-discord-panel px-3.5 py-2 text-sm text-discord-textMuted">
      <Calendar size={15} />
      {formatLongDate()}
    </div>
  </div>
);
