import React, { useEffect } from 'react';
import { Achievement } from '../types';
import { getRarityColor } from '../services/achievements';
import { Trophy, X, Sparkles } from 'lucide-react';

interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
  duration?: number;
}

const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onClose,
  duration = 5000
}) => {
  const rarityColor = getRarityColor(achievement.rarity);

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-from-right">
      <div 
        className="bg-gradient-to-r from-discord-panel to-discord-bg border rounded-xl p-4 shadow-2xl flex items-start gap-4 max-w-sm"
        style={{ 
          borderColor: rarityColor,
          boxShadow: `0 0 30px ${rarityColor}30`
        }}
      >
        {/* Icon */}
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 animate-bounce"
          style={{ backgroundColor: `${rarityColor}20` }}
        >
          <span className="text-3xl">{achievement.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} style={{ color: rarityColor }} />
            <span 
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: rarityColor }}
            >
              {achievement.rarity}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white">Achievement Unlocked!</h3>
          <p className="text-white font-medium">{achievement.name}</p>
          <p className="text-sm text-discord-textMuted mt-1">{achievement.description}</p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          aria-label="Close notification"
        >
          <X size={18} className="text-discord-textMuted" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full animate-shrink"
          style={{ 
            backgroundColor: rarityColor,
            animation: `shrink ${duration}ms linear forwards`
          }}
        />
      </div>

      <style>{`
        @keyframes slide-in-from-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-slide-in-from-right {
          animation: slide-in-from-right 0.3s ease-out;
        }
        .animate-shrink {
          animation: shrink ${duration}ms linear forwards;
        }
      `}</style>
    </div>
  );
};

export default AchievementToast;
