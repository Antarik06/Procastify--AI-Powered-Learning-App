import { db } from "../firebaseConfig";
import {
  doc,
  deleteDoc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { Note, Folder } from "../types";

export const FirebaseService = {
  // --- Notes ---
  saveNote: async (userId: string, note: Note) => {
    const ref = doc(db, "notes", note.id);

    const payload = {
      ...note,
      ownerId: userId,
      updatedAt: serverTimestamp(),
      isPublic: note.isPublic || false,
      publishedAt: note.isPublic ? note.publishedAt || serverTimestamp() : null,
      document: note.document || { blocks: [] },
      canvas: note.canvas || { elements: [], strokes: [] },
    };

    const sanitizedPayload = sanitizePayload(payload);
    await setDoc(ref, sanitizedPayload, { merge: true });
  },

  deleteNote: async (userId: string, noteId: string) => {
    const ref = doc(db, "notes", noteId);
    await deleteDoc(ref);
  },

  saveNotesBatch: async (userId: string, notes: Note[]) => {
    const batch = writeBatch(db);
    notes.forEach((note) => {
      const ref = doc(db, "notes", note.id);
      const payload = {
        ...note,
        ownerId: userId,
        updatedAt: serverTimestamp(),
        isPublic: note.isPublic || false,
      };
      batch.set(ref, sanitizePayload(payload), { merge: true });
    });
    await batch.commit();
  },

  // --- Public Store ---
  publishNote: async (userId: string, note: Note) => {
    const ref = doc(db, "notes", note.id);
    await setDoc(
      ref,
      {
        isPublic: true,
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  unpublishNote: async (userId: string, noteId: string) => {
    const ref = doc(db, "notes", noteId);
    await setDoc(
      ref,
      {
        isPublic: false,
        publishedAt: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  getPublicNotes: async (): Promise<Note[]> => {
    try {
      const q = query(
        collection(db, "notes"),
        where("isPublic", "==", true),
        orderBy("publishedAt", "desc"),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapFirestoreDataToNote(d.data()));
    } catch (e) {
      console.error("Error fetching public notes:", e);
      return [];
    }
  },

  // --- FOLDERS (NEW) ---

  /**
   * Create a new folder
   */
  createFolder: async (userId: string, folder: Folder) => {
    const ref = doc(db, "folders", folder.id);
    const payload = {
      ...folder,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, sanitizePayload(payload));
  },

  /**
   * Update an existing folder
   */
  updateFolder: async (
    userId: string,
    folderId: string,
    updates: Partial<Folder>,
  ) => {
    const ref = doc(db, "folders", folderId);
    const payload = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, sanitizePayload(payload), { merge: true });
  },

  /**
   * Delete a folder
   * Note: This does NOT delete notes in the folder - they should be moved to "General" first
   */
  deleteFolder: async (userId: string, folderId: string) => {
    const ref = doc(db, "folders", folderId);
    await deleteDoc(ref);
  },

  /**
   * Get all folders for a user
   */
  getFolders: async (userId: string): Promise<Folder[]> => {
    try {
      const q = query(
        collection(db, "folders"),
        where("userId", "==", userId),
        orderBy("createdAt", "asc"),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          createdAt: data.createdAt?.toMillis
            ? data.createdAt.toMillis()
            : data.createdAt,
          updatedAt: data.updatedAt?.toMillis
            ? data.updatedAt.toMillis()
            : data.updatedAt,
        } as Folder;
      });
    } catch (e) {
      console.error("Error fetching folders:", e);
      return [];
    }
  },

  /**
   * Move all notes from one folder to another (used when deleting folders)
   */
  moveNotesToFolder: async (
    userId: string,
    fromFolderId: string,
    toFolderId: string | null,
  ) => {
    try {
      // Get all notes in the source folder
      const notesQuery = query(
        collection(db, "notes"),
        where("ownerId", "==", userId),
        where("folderId", "==", fromFolderId),
      );
      const notesSnap = await getDocs(notesQuery);

      // Update each note
      const batch = writeBatch(db);
      notesSnap.docs.forEach((noteDoc) => {
        const ref = doc(db, "notes", noteDoc.id);
        batch.update(ref, {
          folderId: toFolderId || null,
          folder: toFolderId ? "Folder" : "General", // Could be improved by looking up folder name
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
      console.log(
        `Moved ${notesSnap.docs.length} notes from folder ${fromFolderId} to ${toFolderId || "General"}`,
      );
    } catch (e) {
      console.error("Error moving notes to folder:", e);
    }
  },

  // --- Generic document operations ---
  deleteDocument: async (docRef: any) => {
    await deleteDoc(docRef);
  },

  // --- Stats (Unchanged) ---
  saveDailyActivity: async (
    userId: string,
    dateKey: string,
    minutes: number,
  ) => {},
};

// Helper functions
const mapFirestoreDataToNote = (data: any): Note => {
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
  } as Note;
};

// Recursively remove undefined values from an object/array
const sanitizePayload = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map((v) => sanitizePayload(v)).filter((v) => v !== undefined);
  }
  if (typeof obj === "object") {
    const newObj: any = {};
    Object.keys(obj).forEach((key) => {
      const val = sanitizePayload(obj[key]);
      if (val !== undefined) {
        newObj[key] = val;
      }
    });
    return newObj;
  }
  return obj;
};
