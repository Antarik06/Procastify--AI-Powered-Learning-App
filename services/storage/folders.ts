/** Note folders. */
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

export const getFolders = async (): Promise<Folder[]> => {
  if (!currentUserId) return [];

  if (isGuestMode) {
    return getLocalUserItems<Folder>(LOCAL_KEYS.FOLDERS, currentUserId);
  } else {
    try {
      return await FirebaseService.getFolders(currentUserId);
    } catch (e) {
      console.error("Error fetching folders:", e);
      return [];
    }
  }
};

export const saveFolder = async (folder: Folder) => {
  if (!currentUserId) return;

  if (isGuestMode) {
    const folders = getLocalUserItems<Folder>(
      LOCAL_KEYS.FOLDERS,
      currentUserId,
    );
    const idx = folders.findIndex((f) => f.id === folder.id);
    if (idx >= 0) {
      folders[idx] = folder;
    } else {
      folders.push(folder);
    }
    saveLocalUserItems(LOCAL_KEYS.FOLDERS, currentUserId, folders);
  } else {
    await FirebaseService.saveFolder(currentUserId, folder);
  }
};

export const deleteFolder = async (folderId: string) => {
  if (!currentUserId) return;

  if (isGuestMode) {
    const folders = getLocalUserItems<Folder>(
      LOCAL_KEYS.FOLDERS,
      currentUserId,
    );
    const filtered = folders.filter((f) => f.id !== folderId);
    saveLocalUserItems(LOCAL_KEYS.FOLDERS, currentUserId, filtered);
  } else {
    await FirebaseService.deleteFolder(currentUserId, folderId);
  }
};

export const saveFolders = async (folders: Folder[]) => {
  if (!currentUserId) return;

  if (isGuestMode) {
    saveLocalUserItems(LOCAL_KEYS.FOLDERS, currentUserId, folders);
  } else {
    await FirebaseService.saveFoldersBatch(currentUserId, folders);
  }
};
