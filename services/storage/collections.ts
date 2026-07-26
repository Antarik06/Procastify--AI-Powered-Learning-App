/** Generic per-user collections: queue, tasks, quizzes, custom modes. */
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

export const loadCollection = async <T extends { userId: string }>(
  collectionName: string,
): Promise<T[]> => {
  if (!currentUserId) return [];
  if (isGuestMode) {
    const map: Record<string, string> = {
      notes: LOCAL_KEYS.NOTES, // Should not be called via loadCollection anymore for notes ideally
      summaries: LOCAL_KEYS.SUMMARIES,
      queue: LOCAL_KEYS.QUEUE,
      tasks: LOCAL_KEYS.TASKS,
      quizzes: LOCAL_KEYS.QUIZZES,
      custom_modes: LOCAL_KEYS.CUSTOM_MODES,
    };
    const key = map[collectionName];
    if (!key) return [];
    return getLocalUserItems<T>(key, currentUserId);
  } else {
    const colRef = collection(db, "users", currentUserId, collectionName);
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown as T);
  }
};

export const getQueue = async (): Promise<QueueItem[]> => {
  return loadCollection<QueueItem>("queue");
};

export const saveQueue = async (queue: QueueItem[]) => {
  if (!currentUserId) return;
  if (isGuestMode) {
    saveLocalUserItems(LOCAL_KEYS.QUEUE, currentUserId, queue);
  } else {
    const batch = writeBatch(db);
    queue.forEach((item) => {
      const ref = doc(db, "users", currentUserId, "queue", item.id);
      batch.set(ref, item);
    });
    await batch.commit();
  }
};

export const getTasks = async (): Promise<RoutineTask[]> => {
  return loadCollection<RoutineTask>("tasks");
};

export const saveTasks = async (tasks: RoutineTask[]) => {
  if (!currentUserId) return;
  if (isGuestMode) {
    saveLocalUserItems(LOCAL_KEYS.TASKS, currentUserId, tasks);
  } else {
    const batch = writeBatch(db);
    tasks.forEach((task) => {
      const ref = doc(db, "users", currentUserId, "tasks", task.id);
      batch.set(ref, task);
    });
    await batch.commit();
  }
};

export const getQuizzes = async (): Promise<Quiz[]> => {
  return loadCollection<Quiz>("quizzes");
};

export const saveQuiz = async (quiz: Quiz) => {
  if (!currentUserId) return;
  if (isGuestMode) {
    const quizzes = getLocalUserItems<Quiz>(
      LOCAL_KEYS.QUIZZES,
      currentUserId,
    );
    const existingIndex = quizzes.findIndex((q) => q.id === quiz.id);
    if (existingIndex >= 0) {
      quizzes[existingIndex] = quiz;
    } else {
      quizzes.push(quiz);
    }
    saveLocalUserItems(LOCAL_KEYS.QUIZZES, currentUserId, quizzes);
  } else {
    const ref = doc(db, "users", currentUserId, "quizzes", quiz.id);
    await setDoc(ref, quiz);
  }
};

export const saveCustomMode = async (customMode: CustomMode): Promise<void> => {
  if (!currentUserId) throw new Error("No user logged in");

  const modeToSave: CustomMode = { ...customMode, userId: currentUserId };

  if (isGuestMode) {
    const modes = getLocalUserItems<CustomMode>(
      LOCAL_KEYS.CUSTOM_MODES,
      currentUserId,
    );
    const existingIndex = modes.findIndex((m) => m.id === modeToSave.id);

    if (existingIndex >= 0) {
      modes[existingIndex] = modeToSave;
    } else {
      modes.push(modeToSave);
    }

    saveLocalUserItems(LOCAL_KEYS.CUSTOM_MODES, currentUserId, modes);
  } else {
    const docRef = doc(
      db,
      "users",
      currentUserId,
      "custom_modes",
      modeToSave.id,
    );
    await setDoc(docRef, modeToSave);
  }
};

export const getCustomModes = async (): Promise<CustomMode[]> => {
  if (!currentUserId) return [];

  if (isGuestMode) {
    return getLocalUserItems<CustomMode>(
      LOCAL_KEYS.CUSTOM_MODES,
      currentUserId,
    );
  } else {
    return await loadCollection<CustomMode>("custom_modes");
  }
};

export const deleteCustomMode = async (modeId: string): Promise<void> => {
  if (!currentUserId) throw new Error("No user logged in");

  if (isGuestMode) {
    const modes = getLocalUserItems<CustomMode>(
      LOCAL_KEYS.CUSTOM_MODES,
      currentUserId,
    );
    const filtered = modes.filter((m) => m.id !== modeId);
    saveLocalUserItems(LOCAL_KEYS.CUSTOM_MODES, currentUserId, filtered);
  } else {
    const docRef = doc(db, "users", currentUserId, "custom_modes", modeId);
    await FirebaseService.deleteDocument(docRef);
  }
};
