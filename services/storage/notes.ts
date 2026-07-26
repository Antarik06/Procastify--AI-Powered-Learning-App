/** Note persistence, including canvas payloads and publishing. */
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

export const deleteNote = async (noteId: string) => {
  if (!currentUserId) {
    return;
  }

  // 1. Delete from Firestore (Single Source of Truth)
  if (!isGuestMode) {
    try {
      await FirebaseService.deleteNote(currentUserId, noteId);
    } catch (e) {
      console.error("Error deleting note from Firestore:", e);
      throw e; // Stop execution if source of truth fails
    }
  }

  // 2. Clear localStorage / Canvas Cache
  const canvasKey = `procastify_canvas_${noteId}`;
  if (localStorage.getItem(canvasKey)) {
    localStorage.removeItem(canvasKey);
  }

  // 3. Guest Mode - Local Storage "Database" Deletion
  if (isGuestMode) {
    const notes = getLocalUserItems<Note>(LOCAL_KEYS.NOTES, currentUserId);
    const filtered = notes.filter((n) => n.id !== noteId);
    saveLocalUserItems(LOCAL_KEYS.NOTES, currentUserId, filtered);
  }
};

export const saveNote = async (note: Note) => {
  if (!currentUserId) return;
  if (isGuestMode) {
    const notes = getLocalUserItems<Note>(LOCAL_KEYS.NOTES, currentUserId);
    const idx = notes.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      notes[idx] = note;
    } else {
      notes.unshift(note);
    }
    saveLocalUserItems(LOCAL_KEYS.NOTES, currentUserId, notes);
  } else {
    // Updated to ensure backend fields are handled by FirebaseService if needed
    // But we pass the whole note object.
    await FirebaseService.saveNote(currentUserId, note);
  }
};

export const getNotes = async (): Promise<Note[]> => {
  if (!currentUserId) return [];
  if (isGuestMode) {
    return getLocalUserItems<Note>(LOCAL_KEYS.NOTES, currentUserId);
  } else {
    // Use "Single Source of Truth": Direct Firestore query on root collection
    try {
      // Also trigger migration opportunistically here if empty?
      // Or explicitly call migration on session init.
      // Let's assume on-load migration is best called in setSession or distinct step.

      const q = query(
        collection(db, "notes"),
        where("ownerId", "==", currentUserId),
      );
      // We might want an index on ownerId + updatedAt desc, but basic query first.
      // Adding orderBy might require index creation. Safe with client-side sort for now if small dataset.
      const snap = await getDocs(q);
      return snap.docs.map((doc) => {
        const data = doc.data() as any;
        // Fix timestamps back to number/string if needed for app consistency
        return {
          ...data,
          createdAt: data.createdAt?.toMillis
            ? data.createdAt.toMillis()
            : data.createdAt,
          updatedAt: data.updatedAt?.toMillis
            ? data.updatedAt.toMillis()
            : data.updatedAt,
          publishedAt: data.publishedAt?.toMillis
            ? data.publishedAt.toMillis()
            : data.publishedAt,
          // Ensure arrays are arrays
          tags: data.tags || [],
        } as Note;
      });
    } catch (e) {
      console.error("Error fetching notes:", e);
      return [];
    }
  }
};

export const saveNotes = async (notes: Note[]) => {
  // Fallback for bulk save if needed, but prefer saveNote
  if (!currentUserId) return;
  if (isGuestMode) {
    saveLocalUserItems(LOCAL_KEYS.NOTES, currentUserId, notes);
  } else {
    await FirebaseService.saveNotesBatch(currentUserId, notes);
  }
};

export const getCanvasElements = async (noteId: string): Promise<any[]> => {
  if (!noteId) return [];

  // Try Firestore first (for authenticated users)
  if (currentUserId && !isGuestMode) {
    try {
      const docRef = doc(db, "notes", noteId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const elems = data.canvas?.elements || [];
        return elems;
      }
    } catch (e) {
      console.error("Error fetching canvas elements from Firestore:", e);
    }
  }

  // Fallback to localStorage
  const localKey = `procastify_canvas_${noteId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

export const saveCanvasElements = async (noteId: string, elements: any[]) => {
  if (!noteId) return;

  // Always save to localStorage as backup/offline cache
  const localKey = `procastify_canvas_${noteId}`;
  localStorage.setItem(localKey, JSON.stringify(elements));

  // Save to Firestore for authenticated users
  if (currentUserId && !isGuestMode) {
    try {
      const docRef = doc(db, "notes", noteId);
      await setDoc(
        docRef,
        {
          canvas: { elements },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      console.error("Error saving canvas elements to Firestore:", e);
    }
  }
};

export const publishNote = async (note: Note) => {
  if (!currentUserId || isGuestMode) return;
  await FirebaseService.publishNote(currentUserId, note);
};

export const unpublishNote = async (noteId: string) => {
  if (!currentUserId || isGuestMode) return;
  await FirebaseService.unpublishNote(currentUserId, noteId);
};
