/** Achievement unlocks and progress. */
import type {
  UserStats,
  UserPreferences,
  Note,
  Summary,
  QueueItem,
  RoutineTask,
  Quiz,
  CustomMode,
  Folder,
  Classroom,
  Invitation,
  Announcement,
  ClassroomResource,
  TeacherStats,
  UserRole,
  UserAchievement,
  UserAchievements,
} from '../../types';
import { db, auth } from '../../firebaseConfig';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  writeBatch,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { FirebaseService } from '../firebaseService';
import { LOCAL_KEYS } from './keys';
import {
  getLocalDB,
  saveLocalDB,
  getLocalUserItems,
  saveLocalUserItems,
} from './localDb';
import { currentUserId, isGuestMode } from './session';

export const getAchievements = async (): Promise<UserAchievement[]> => {
  if (!currentUserId) return [];

  if (isGuestMode) {
    const all = getLocalDB<UserAchievements>(LOCAL_KEYS.ACHIEVEMENTS);
    const userData = all.find(a => a.userId === currentUserId);
    return userData?.achievements || [];
  } else {
    try {
      const docRef = doc(db, "users", currentUserId, "data", "achievements");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return data.achievements || [];
      }
      return [];
    } catch (e) {
      console.error("Error fetching achievements:", e);
      return [];
    }
  }
};

export const saveAchievement = async (achievement: UserAchievement): Promise<void> => {
  if (!currentUserId) return;

  const achievements = await getAchievements();
  const existingIndex = achievements.findIndex(
    a => a.achievementId === achievement.achievementId
  );

  if (existingIndex >= 0) {
    achievements[existingIndex] = achievement;
  } else {
    achievements.push(achievement);
  }

  if (isGuestMode) {
    const all = getLocalDB<UserAchievements>(LOCAL_KEYS.ACHIEVEMENTS);
    const userIndex = all.findIndex(a => a.userId === currentUserId);
    const userData: UserAchievements = {
      userId: currentUserId,
      achievements,
      lastUpdated: Date.now(),
    };

    if (userIndex >= 0) {
      all[userIndex] = userData;
    } else {
      all.push(userData);
    }
    saveLocalDB(LOCAL_KEYS.ACHIEVEMENTS, all);
  } else {
    const docRef = doc(db, "users", currentUserId, "data", "achievements");
    await setDoc(docRef, { achievements, lastUpdated: Date.now() });
  }
};

export const unlockAchievement = async (achievementId: string): Promise<UserAchievement | null> => {
  if (!currentUserId) return null;

  const achievements = await getAchievements();
  const existing = achievements.find(a => a.achievementId === achievementId);

  if (existing?.isUnlocked) {
    return null;
  }

  const newAchievement: UserAchievement = {
    id: existing?.id || `${currentUserId}_${achievementId}_${Date.now()}`,
    userId: currentUserId,
    achievementId,
    unlockedAt: Date.now(),
    isUnlocked: true,
    progress: 100
  };

  await saveAchievement(newAchievement);
  return newAchievement;
};
