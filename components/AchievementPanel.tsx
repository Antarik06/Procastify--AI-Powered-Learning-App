import React, { useState } from 'react';
import { Achievement, UserAchievement } from '../types';
import { ACHIEVEMENTS, getAchievementById, calculateProgress, getRarityColor } from '../services/achievements';
import AchievementBadge from './AchievementBadge';
import { Trophy, X, Filter } from 'lucide-react';

interface AchievementPanelProps {
  userAchievements: UserAchievement[];
  onClose: () => void;
}

type FilterCategory = 'all' | 'study' | 'notes' | 'summary' | 'quiz' | 'streak';

const AchievementPanel: React.FC<AchievementPanelProps> = ({ userAchievements, onClose }) => {
  const [filter, setFilter] = useState<FilterCategory>('all');
  
  const unlockedIds = new Set(
    userAchievements
      .filter(ua => ua.isUnlocked)
      .map(ua => ua.achievementId)
  );

  const totalUnlocked = unlockedIds.size;
  const totalAchievements = ACHIEVEMENTS.length;

  const filteredAchievements = filter === 'all' 
    ? ACHIEVEMENTS 
    : ACHIEVEMENTS.filter(a => a.category === filter);

  const categories: { id: FilterCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'study', label: 'Study' },
    { id: 'notes', label: 'Notes' },
    { id: 'summary', label: 'Summary' },
    { id: 'quiz', label: 'Quiz' },
    { id: 'streak', label: 'Streak' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-discord-panel rounded-2xl border border-white/10 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl flex items-center justify-center">
              <Trophy size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Achievements</h2>
              <p className="text-discord-textMuted">
                {totalUnlocked} / {totalAchievements} unlocked
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} className="text-discord-textMuted" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-4 border-b border-white/5 overflow-x-auto">
          <Filter size={16} className="text-discord-textMuted flex-shrink-0" />
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                filter === cat.id 
                  ? 'bg-discord-accent text-white' 
                  : 'bg-discord-bg text-discord-textMuted hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
            {filteredAchievements.map(achievement => {
              const userAchievement = userAchievements.find(
                ua => ua.achievementId === achievement.id
              );
              
              return (
                <div key={achievement.id} className="flex flex-col items-center">
                  <AchievementBadge
                    achievement={achievement}
                    userAchievement={userAchievement}
                    progress={userAchievement?.progress || 0}
                    showProgress={!userAchievement?.isUnlocked}
                    size="lg"
                  />
                  <p className={`mt-2 text-xs text-center font-medium ${
                    userAchievement?.isUnlocked ? 'text-white' : 'text-gray-500'
                  }`}>
                    {achievement.name}
                  </p>
                  <p className="text-[10px] text-discord-textMuted text-center mt-0.5">
                    {achievement.rarity}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="p-4 border-t border-white/10 bg-discord-bg/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-discord-textMuted">Overall Progress</span>
            <span className="text-white font-medium">
              {Math.round((totalUnlocked / totalAchievements) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-discord-accent to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${(totalUnlocked / totalAchievements) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementPanel;
