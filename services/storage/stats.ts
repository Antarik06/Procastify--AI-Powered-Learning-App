/** User stats: streaks, study minutes and the daily activity map. */
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

export const createEmptyStats = (userId: string): UserStats => ({
  id: `stats_${userId}`,
  userId,
  totalTimeStudiedMinutes: 0,
  notesCreated: 0,
  quizzesTaken: 0,
  loginStreak: 1, // today counts as day one
  lastLoginDate: new Date().toISOString(),
  dailyActivity: {},
  highScore: 0,
});

/**
 * Stats documents written by older versions of the app can be missing fields
 * (most importantly `dailyActivity`, which the dashboard chart indexes into).
 * Fill in the gaps so consumers never have to null-check.
 */
export const normalizeStats = (
  stats: Partial<UserStats> | undefined,
  userId: string,
): UserStats => {
  const base = createEmptyStats(userId);
  if (!stats) return base;

  const dailyActivity =
    stats.dailyActivity && typeof stats.dailyActivity === "object"
      ? Object.fromEntries(
          Object.entries(stats.dailyActivity)
            .filter(([, minutes]) => Number.isFinite(Number(minutes)))
            .map(([day, minutes]) => [day, Number(minutes)]),
        )
      : {};

  return {
    ...base,
    ...stats,
    id: stats.id || base.id,
    userId: stats.userId || userId,
    totalTimeStudiedMinutes: Number(stats.totalTimeStudiedMinutes) || 0,
    notesCreated: Number(stats.notesCreated) || 0,
    quizzesTaken: Number(stats.quizzesTaken) || 0,
    loginStreak: Number(stats.loginStreak) || 0,
    highScore: Number(stats.highScore) || 0,
    lastLoginDate: stats.lastLoginDate || base.lastLoginDate,
    dailyActivity,
  };
};


export const getStats = async (): Promise<UserStats> => {
  if (!currentUserId) return createEmptyStats("unknown");

  if (isGuestMode) {
    const all = getLocalDB<UserStats>(LOCAL_KEYS.STATS);
    let stats = all.find((s) => s.userId === currentUserId);
    if (!stats) {
      stats = createEmptyStats(currentUserId);
      all.push(stats);
      saveLocalDB(LOCAL_KEYS.STATS, all);
    }
    return normalizeStats(stats, currentUserId);
  } else {
    const docRef = doc(db, "users", currentUserId, "data", "stats");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return normalizeStats(snap.data() as Partial<UserStats>, currentUserId);
    }

    const newStats = createEmptyStats(currentUserId);
    await setDoc(docRef, newStats);
    return newStats;
  }
};

export const updateStats = async (updater: (prev: UserStats) => UserStats) => {
  if (!currentUserId) return;

  const current = await getStats();
  const updated = updater(current);

  if (isGuestMode) {
    const all = getLocalDB<UserStats>(LOCAL_KEYS.STATS);
    const idx = all.findIndex((s) => s.userId === currentUserId);
    if (idx >= 0) all[idx] = updated;
    else all.push(updated);
    saveLocalDB(LOCAL_KEYS.STATS, all);
  } else {
    await setDoc(doc(db, "users", currentUserId, "data", "stats"), updated);
  }
  return updated;
};

export const checkLoginStreak = async () => {
  if (!currentUserId) return;
  const stats = await getStats();

  // Use consistent local date format (YYYY-MM-DD) for comparison
  const getLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateKey(new Date());
  const lastDate = getLocalDateKey(new Date(stats.lastLoginDate));

  if (lastDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterday);

    let newStreak = stats.loginStreak;
    if (lastDate === yesterdayKey) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    await updateStats((s) => ({
      ...s,
      loginStreak: newStreak,
      lastLoginDate: new Date().toISOString(),
    }));
  } else if (!stats.loginStreak) {
    // Already logged in today but the streak was never initialised.
    await updateStats((s) => ({ ...s, loginStreak: 1 }));
  }
};

export const logStudyTime = async (minutes: number) => {
  if (!currentUserId) return;

  // Use consistent local date format (YYYY-MM-DD) to match getLast7Days in Dashboard
  const getLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayKey = getLocalDateKey(new Date());
  await updateStats((s) => {
    const currentDaily = s.dailyActivity[todayKey] || 0;
    return {
      ...s,
      totalTimeStudiedMinutes: s.totalTimeStudiedMinutes + minutes,
      dailyActivity: {
        ...s.dailyActivity,
        [todayKey]: currentDaily + minutes,
      },
    };
  });
};
