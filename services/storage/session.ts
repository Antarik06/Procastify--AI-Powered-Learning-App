/** Session state, guest identities and user profiles. */
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

/**
 * Who is signed in right now. Exported as live bindings so every repository
 * module sees the current session without threading it through each call.
 */
export let currentUserId: string | null = null;
export let isGuestMode: boolean = true;

export const getCurrentUserId = () => currentUserId;
export const isGuest = () => isGuestMode;

export const setSession = (user: UserPreferences) => {
  currentUserId = user.id;
  isGuestMode = user.isGuest;
  if (user.isGuest) {
    localStorage.setItem(LOCAL_KEYS.USER_SESSION, user.id);

    const users = JSON.parse(
      localStorage.getItem(LOCAL_KEYS.USERS_DB) || "{}",
    );
    users[user.id] = user;
    localStorage.setItem(LOCAL_KEYS.USERS_DB, JSON.stringify(users));
  } else {
    localStorage.removeItem(LOCAL_KEYS.USER_SESSION);
  }
};

export const getGuestSession = (): UserPreferences | null => {
  const sessionId = localStorage.getItem(LOCAL_KEYS.USER_SESSION);
  if (sessionId) {
    const users = JSON.parse(
      localStorage.getItem(LOCAL_KEYS.USERS_DB) || "{}",
    );
    return users[sessionId] || null;
  }
  return null;
};

export const createGuestUser = (): UserPreferences => {
  const timestamp = Date.now();
  const shortId = timestamp.toString().slice(-4);
  const guestId = `guest_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  const guestName = `Guest #${shortId}`;

  return {
    id: guestId,
    isGuest: true,
    role: "student",
    name: guestName,
    avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${guestName}`,
    freeTimeHours: 2,
    energyPeak: "morning",
    goal: "Productivity",
    distractionLevel: "medium",
  };
};

export const getUserProfile = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const docRef = doc(db, "users", userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const profile = snap.data() as UserPreferences;

      // Ensure isGuest is false for authenticated users
      if (profile.isGuest === undefined || profile.isGuest === null) {
        profile.isGuest = false;
      }

      // Assign default role if missing (backward compatibility)
      if (!profile.role) {
        profile.role = "student";
        await setDoc(docRef, profile);
      }

      return profile;
    }
    return null;
  } catch (e) {
    console.error("Error fetching profile", e);
    return null;
  }
};

export const saveUserProfile = async (user: UserPreferences) => {
  if (user.isGuest) {
    const users = JSON.parse(
      localStorage.getItem(LOCAL_KEYS.USERS_DB) || "{}",
    );
    users[user.id] = user;
    localStorage.setItem(LOCAL_KEYS.USERS_DB, JSON.stringify(users));
  } else {
    await setDoc(doc(db, "users", user.id), user);
  }
};
