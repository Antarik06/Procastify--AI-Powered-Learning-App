/** Summariser history. */
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
import { loadCollection } from './collections';

export const getSummaries = async (): Promise<Summary[]> => {
  return loadCollection<Summary>("summaries");
};

export const saveSummaries = async (summaries: Summary[]) => {
  if (!currentUserId) return;
  if (isGuestMode) {
    saveLocalUserItems(LOCAL_KEYS.SUMMARIES, currentUserId, summaries);
  } else {
    const batch = writeBatch(db);
    summaries.forEach((summary) => {
      const ref = doc(db, "users", currentUserId, "summaries", summary.id);
      batch.set(ref, summary);
    });
    await batch.commit();
  }
};

export const deleteSummary = async (summaryId: string) => {
  if (!currentUserId) return;
  if (isGuestMode) {
    const summaries = getLocalUserItems<Summary>(LOCAL_KEYS.SUMMARIES, currentUserId);
    const filtered = summaries.filter(s => s.id !== summaryId);
    saveLocalUserItems(LOCAL_KEYS.SUMMARIES, currentUserId, filtered);
  } else {
    await FirebaseService.deleteDocument(doc(db, "users", currentUserId, "summaries", summaryId));
  }
};
