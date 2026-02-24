import React from 'react';
import { Achievement, UserAchievement } from '../types';
import { getRarityColor } from '../services/achievements';
import { Lock, Check } from 'lucide-react';

interface AchievementBadgeProps {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  progress?: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  userAchievement,
  progress = 0,
  showProgress = false,
  size = 'md',
  onClick
}) => {
  const isUnlocked = userAchievement?.isUnlocked || false;
  const rarityColor = getRarityColor(achievement.rarity);

  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl'
  };

  const borderSize = {
    sm: 'border-2',
    md: 'border-[3px]',
    lg: 'border-4'
  };

  return (
    <div 
      className={`relative flex flex-col items-center cursor-pointer group transition-transform hover:scale-105`}
      onClick={onClick}
    >
      {/* Badge */}
      <div 
        className={`
          ${sizeClasses[size]} 
          ${borderSize[size]} 
          rounded-full 
          flex items-center justify-center 
          transition-all duration-300
          ${isUnlocked 
            ? 'bg-gradient-to-br from-discord-accent/20 to-purple-600/20' 
            : 'bg-gray-700/50'
          }
        `}
        style={{ 
          borderColor: isUnlocked ? rarityColor : '#4b5563',
          boxShadow: isUnlocked ? `0 0 20px ${rarityColor}40` : 'none'
        }}
      >
        {isUnlocked ? (
          <span className="filter drop-shadow-lg">{achievement.icon}</span>
        ) : (
          <Lock size={size === 'sm' ? 14 : size === 'md' ? 18 : 24} className="text-gray-500" />
        )}
        
        {/* Checkmark overlay for unlocked */}
        {isUnlocked && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
            <Check size={size === 'sm' ? 10 : size === 'md' ? 12 : 16} className="text-white" />
          </div>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && !isUnlocked && progress > 0 && (
        <div className="mt-2 w-full">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${progress}%`,
                backgroundColor: rarityColor
              }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">{progress}%</p>
        </div>
      )}

      {/* Name tooltip on hover */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        <p className="text-sm font-medium text-white">{achievement.name}</p>
        <p className="text-xs text-gray-400">{achievement.description}</p>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 rotate-45" />
      </div>
    </div>
  );
};

export default AchievementBadge;
