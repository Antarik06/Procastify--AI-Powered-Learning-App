import { Achievement, UserAchievement, UserStats, UserAchievements, AchievementCategory } from '../types';

// Define all achievements with their criteria
export const ACHIEVEMENTS: Achievement[] = [
  // Study Time Achievements
  {
    id: 'study_1h',
    name: 'First Focus',
    description: 'Complete 1 hour of study time',
    category: 'study',
    rarity: 'common',
    icon: '⏱️',
    criteria: { type: 'study_time', value: 60 }
  },
  {
    id: 'study_10h',
    name: 'Dedicated Learner',
    description: 'Complete 10 hours of study time',
    category: 'study',
    rarity: 'rare',
    icon: '📚',
    criteria: { type: 'study_time', value: 600 }
  },
  {
    id: 'study_50h',
    name: 'Study Master',
    description: 'Complete 50 hours of study time',
    category: 'study',
    rarity: 'epic',
    icon: '🎓',
    criteria: { type: 'study_time', value: 3000 }
  },
  {
    id: 'study_100h',
    name: 'Knowledge Seeker',
    description: 'Complete 100 hours of study time',
    category: 'study',
    rarity: 'legendary',
    icon: '🏆',
    criteria: { type: 'study_time', value: 6000 }
  },

  // Notes Achievements
  {
    id: 'notes_1',
    name: 'Note Taker',
    description: 'Create your first note',
    category: 'notes',
    rarity: 'common',
    icon: '📝',
    criteria: { type: 'notes_created', value: 1 }
  },
  {
    id: 'notes_10',
    name: 'Note Collector',
    description: 'Create 10 notes',
    category: 'notes',
    rarity: 'rare',
    icon: '📒',
    criteria: { type: 'notes_created', value: 10 }
  },
  {
    id: 'notes_50',
    name: 'Note Architect',
    description: 'Create 50 notes',
    category: 'notes',
    rarity: 'epic',
    icon: '📑',
    criteria: { type: 'notes_created', value: 50 }
  },
  {
    id: 'notes_100',
    name: 'Note Grandmaster',
    description: 'Create 100 notes',
    category: 'notes',
    rarity: 'legendary',
    icon: '📚',
    criteria: { type: 'notes_created', value: 100 }
  },

  // Summary Achievements
  {
    id: 'summary_1',
    name: 'Summarizer',
    description: 'Create your first summary',
    category: 'summary',
    rarity: 'common',
    icon: '📋',
    criteria: { type: 'summaries_made', value: 1 }
  },
  {
    id: 'summary_10',
    name: 'Content Condenser',
    description: 'Create 10 summaries',
    category: 'summary',
    rarity: 'rare',
    icon: '✂️',
    criteria: { type: 'summaries_made', value: 10 }
  },
  {
    id: 'summary_25',
    name: 'Summary Expert',
    description: 'Create 25 summaries',
    category: 'summary',
    rarity: 'epic',
    icon: '📜',
    criteria: { type: 'summaries_made', value: 25 }
  },

  // Quiz Achievements
  {
    id: 'quiz_1',
    name: 'Quiz Beginner',
    description: 'Take your first quiz',
    category: 'quiz',
    rarity: 'common',
    icon: '❓',
    criteria: { type: 'quizzes_taken', value: 1 }
  },
  {
    id: 'quiz_10',
    name: 'Quiz Enthusiast',
    description: 'Take 10 quizzes',
    category: 'quiz',
    rarity: 'rare',
    icon: '🧠',
    criteria: { type: 'quizzes_taken', value: 10 }
  },
  {
    id: 'quiz_perfect',
    name: 'Perfect Score',
    description: 'Get 100% on a quiz',
    category: 'quiz',
    rarity: 'rare',
    icon: '💯',
    criteria: { type: 'perfect_quiz', value: 1 }
  },
  {
    id: 'quiz_high_100',
    name: 'High Scorer',
    description: 'Score 100 points in a quiz',
    category: 'quiz',
    rarity: 'epic',
    icon: '🎯',
    criteria: { type: 'high_score', value: 100 }
  },
  {
    id: 'quiz_high_500',
    name: 'Quiz Champion',
    description: 'Score 500 points in a quiz',
    category: 'quiz',
    rarity: 'legendary',
    icon: '👑',
    criteria: { type: 'high_score', value: 500 }
  },

  // Streak Achievements
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: 'Maintain a 3-day login streak',
    category: 'streak',
    rarity: 'common',
    icon: '🔥',
    criteria: { type: 'login_streak', value: 3 }
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day login streak',
    category: 'streak',
    rarity: 'rare',
    icon: '⚡',
    criteria: { type: 'login_streak', value: 7 }
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day login streak',
    category: 'streak',
    rarity: 'epic',
    icon: '🌟',
    criteria: { type: 'login_streak', value: 30 }
  },
  {
    id: 'streak_100',
    name: 'Century Champion',
    description: 'Maintain a 100-day login streak',
    category: 'streak',
    rarity: 'legendary',
    icon: '💎',
    criteria: { type: 'login_streak', value: 100 }
  }
];

// Get achievement by ID
export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find(a => a.id === id);
};

// Get achievements by category
export const getAchievementsByCategory = (category: AchievementCategory): Achievement[] => {
  return ACHIEVEMENTS.filter(a => a.category === category);
};

// Get rarity color
export const getRarityColor = (rarity: string): string => {
  switch (rarity) {
    case 'common':
      return '#9ca3af'; // gray-400
    case 'rare':
      return '#3b82f6'; // blue-500
    case 'epic':
      return '#8b5cf6'; // violet-500
    case 'legendary':
      return '#f59e0b'; // amber-500
    default:
      return '#9ca3af';
  }
};

// Calculate progress for an achievement based on user stats
export const calculateProgress = (
  achievement: Achievement,
  stats: UserStats,
  summariesCount: number
): number => {
  const { criteria } = achievement;
  let currentValue = 0;

  switch (criteria.type) {
    case 'notes_created':
      currentValue = stats.notesCreated || 0;
      break;
    case 'summaries_made':
      currentValue = summariesCount || 0;
      break;
    case 'quizzes_taken':
      currentValue = stats.quizzesTaken || 0;
      break;
    case 'study_time':
      currentValue = Math.floor((stats.totalTimeStudiedMinutes || 0) / 60);
      break;
    case 'login_streak':
      currentValue = stats.loginStreak || 0;
      break;
    case 'high_score':
      currentValue = stats.highScore || 0;
      break;
    case 'perfect_quiz':
      // For perfect quiz, we track this separately in achievements
      currentValue = 0;
      break;
  }

  return Math.min(100, Math.round((currentValue / criteria.value) * 100));
};

// Check if an achievement should be unlocked
export const shouldUnlockAchievement = (
  achievement: Achievement,
  stats: UserStats,
  summariesCount: number,
  hasPerfectQuiz: boolean = false
): boolean => {
  const { criteria } = achievement;
  
  switch (criteria.type) {
    case 'notes_created':
      return (stats.notesCreated || 0) >= criteria.value;
    case 'summaries_made':
      return summariesCount >= criteria.value;
    case 'quizzes_taken':
      return (stats.quizzesTaken || 0) >= criteria.value;
    case 'study_time':
      return Math.floor((stats.totalTimeStudiedMinutes || 0) / 60) >= criteria.value;
    case 'login_streak':
      return (stats.loginStreak || 0) >= criteria.value;
    case 'high_score':
      return (stats.highScore || 0) >= criteria.value;
    case 'perfect_quiz':
      return hasPerfectQuiz;
    default:
      return false;
  }
};

// Check all achievements and return newly unlocked ones
export const checkAchievements = (
  userAchievements: UserAchievement[],
  stats: UserStats,
  summariesCount: number,
  hasPerfectQuiz: boolean = false
): Achievement[] => {
  const newlyUnlocked: Achievement[] = [];
  const unlockedIds = new Set(userAchievements.filter(ua => ua.isUnlocked).map(ua => ua.achievementId));

  for (const achievement of ACHIEVEMENTS) {
    if (!unlockedIds.has(achievement.id)) {
      if (shouldUnlockAchievement(achievement, stats, summariesCount, hasPerfectQuiz)) {
        newlyUnlocked.push(achievement);
      }
    }
  }

  return newlyUnlocked;
};

// Get achievement stats for display
export const getAchievementStats = (userAchievements: UserAchievement[]) => {
  const unlocked = userAchievements.filter(ua => ua.isUnlocked);
  const total = ACHIEVEMENTS.length;
  
  const categoryBreakdown = {
    study: 0,
    notes: 0,
    summary: 0,
    quiz: 0,
    streak: 0,
    social: 0
  };

  unlocked.forEach(ua => {
    const achievement = getAchievementById(ua.achievementId);
    if (achievement) {
      categoryBreakdown[achievement.category]++;
    }
  });

  return {
    totalUnlocked: unlocked.length,
    totalAchievements: total,
    categoryBreakdown
  };
};
