export type AchievementCategory =
  | 'study'
  | 'notes'
  | 'summary'
  | 'quiz'
  | 'streak'
  | 'social';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type AchievementCriteriaType =
  | 'study_time'
  | 'notes_created'
  | 'summaries_made'
  | 'quizzes_taken'
  | 'login_streak'
  | 'high_score'
  | 'perfect_quiz';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  criteria: {
    type: AchievementCriteriaType;
    value: number;
  };
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: number;
  isUnlocked: boolean;
  /** 0-100. */
  progress: number;
}

/** Per-user achievement container as persisted in storage. */
export interface UserAchievements {
  userId: string;
  achievements: UserAchievement[];
  lastUpdated?: number;
}
