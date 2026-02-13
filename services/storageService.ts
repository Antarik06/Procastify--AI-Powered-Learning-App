import {
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
} from "../types";
import { db } from "../firebaseConfig";
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
} from "firebase/firestore";
import { FirebaseService } from "./firebaseService";
import { auth } from "../firebaseConfig";

const LOCAL_KEYS = {
  USER_SESSION: "procastify_session",
  USERS_DB: "procastify_users_db",
  STATS: "procastify_stats",
  NOTES: "procastify_notes",
  SUMMARIES: "procastify_summaries",
  QUEUE: "procastify_queue",
  TASKS: "procastify_tasks",
  QUIZZES: "procastify_quizzes",
  CUSTOM_MODES: "procastify_custom_modes",
  FOLDERS: "procastify_folders",
};

const getLocalDB = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveLocalDB = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const getLocalUserItems = <T extends { userId: string }>(
  key: string,
  userId: string,
): T[] => {
  return getLocalDB<T>(key).filter((item) => item.userId === userId);
};

const saveLocalUserItems = <T extends { userId: string }>(
  key: string,
  userId: string,
  items: T[],
) => {
  const all = getLocalDB<T>(key);
  const others = all.filter((i) => i.userId !== userId);
  saveLocalDB(key, [...others, ...items]);
};

let currentUserId: string | null = null;
let isGuestMode: boolean = true;

export const StorageService = {
  setSession: (user: UserPreferences) => {
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
  },

  getGuestSession: (): UserPreferences | null => {
    const sessionId = localStorage.getItem(LOCAL_KEYS.USER_SESSION);
    if (sessionId) {
      const users = JSON.parse(
        localStorage.getItem(LOCAL_KEYS.USERS_DB) || "{}",
      );
      return users[sessionId] || null;
    }
    return null;
  },

  createGuestUser: (): UserPreferences => {
    const timestamp = Date.now();
    const shortId = timestamp.toString().slice(-4);
    const guestId = `guest_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: guestId,
      isGuest: true,
      role: "student",
      name: `Guest #${shortId}`,
      freeTimeHours: 2,
      energyPeak: "morning",
      goal: "Productivity",
      distractionLevel: "medium",
    };
  },

  getUserProfile: async (userId: string): Promise<UserPreferences | null> => {
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
  },

  saveUserProfile: async (user: UserPreferences) => {
    if (user.isGuest) {
      const users = JSON.parse(
        localStorage.getItem(LOCAL_KEYS.USERS_DB) || "{}",
      );
      users[user.id] = user;
      localStorage.setItem(LOCAL_KEYS.USERS_DB, JSON.stringify(users));
    } else {
      await setDoc(doc(db, "users", user.id), user);
    }
  },

  getStats: async (): Promise<UserStats> => {
    if (!currentUserId) return createEmptyStats("unknown");

    if (isGuestMode) {
      const all = getLocalDB<UserStats>(LOCAL_KEYS.STATS);
      let stats = all.find((s) => s.userId === currentUserId);
      if (!stats) {
        stats = createEmptyStats(currentUserId);
        all.push(stats);
        saveLocalDB(LOCAL_KEYS.STATS, all);
      }
      return stats;
    } else {
      const docRef = doc(db, "users", currentUserId, "data", "stats");
      const snap = await getDoc(docRef);
      if (snap.exists()) return snap.data() as UserStats;

      const newStats = createEmptyStats(currentUserId);
      await setDoc(docRef, newStats);
      return newStats;
    }
  },

  updateStats: async (updater: (prev: UserStats) => UserStats) => {
    if (!currentUserId) return;

    const current = await StorageService.getStats();
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
  },

  checkLoginStreak: async () => {
    if (!currentUserId) return;
    const stats = await StorageService.getStats();

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

      await StorageService.updateStats((s) => ({
        ...s,
        loginStreak: newStreak,
        lastLoginDate: new Date().toISOString(),
      }));
    }
  },

  logStudyTime: async (minutes: number) => {
    if (!currentUserId) return;

    // Use consistent local date format (YYYY-MM-DD) to match getLast7Days in Dashboard
    const getLocalDateKey = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const todayKey = getLocalDateKey(new Date());
    await StorageService.updateStats((s) => {
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
  },

  // --- Notes ---

  deleteNote: async (noteId: string) => {
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
  },

  saveNote: async (note: Note) => {
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
  },

  getNotes: async (): Promise<Note[]> => {
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
  },

  saveNotes: async (notes: Note[]) => {
    // Fallback for bulk save if needed, but prefer saveNote
    if (!currentUserId) return;
    if (isGuestMode) {
      saveLocalUserItems(LOCAL_KEYS.NOTES, currentUserId, notes);
    } else {
      await FirebaseService.saveNotesBatch(currentUserId, notes);
    }
  },

  // --- Canvas Elements (for CanvasBoard) ---

  getCanvasElements: async (noteId: string): Promise<any[]> => {
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
  },

  saveCanvasElements: async (noteId: string, elements: any[]) => {
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
  },

  // --- Summaries ---

  getSummaries: async (): Promise<Summary[]> => {
    return StorageService.loadCollection<Summary>("summaries");
  },

  saveSummaries: async (summaries: Summary[]) => {
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
  },

  publishNote: async (note: Note) => {
    if (!currentUserId || isGuestMode) return;
    await FirebaseService.publishNote(currentUserId, note);
  },

  unpublishNote: async (noteId: string) => {
    if (!currentUserId || isGuestMode) return;
    await FirebaseService.unpublishNote(currentUserId, noteId);
  },

  // --- Folders ---

  getFolders: async (): Promise<Folder[]> => {
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
  },

  saveFolder: async (folder: Folder) => {
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
  },

  deleteFolder: async (folderId: string) => {
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
  },

  saveFolders: async (folders: Folder[]) => {
    if (!currentUserId) return;

    if (isGuestMode) {
      saveLocalUserItems(LOCAL_KEYS.FOLDERS, currentUserId, folders);
    } else {
      await FirebaseService.saveFoldersBatch(currentUserId, folders);
    }
  },

  // --- Queue & Tasks (Unchanged) ---

  getQueue: async (): Promise<QueueItem[]> => {
    return StorageService.loadCollection<QueueItem>("queue");
  },

  saveQueue: async (queue: QueueItem[]) => {
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
  },

  getTasks: async (): Promise<RoutineTask[]> => {
    return StorageService.loadCollection<RoutineTask>("tasks");
  },

  saveTasks: async (tasks: RoutineTask[]) => {
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
  },

  // --- Quizzes ---

  getQuizzes: async (): Promise<Quiz[]> => {
    return StorageService.loadCollection<Quiz>("quizzes");
  },

  saveQuiz: async (quiz: Quiz) => {
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
  },

  // --- Custom Modes ---

  saveCustomMode: async (customMode: CustomMode): Promise<void> => {
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
  },

  getCustomModes: async (): Promise<CustomMode[]> => {
    if (!currentUserId) return [];

    if (isGuestMode) {
      return getLocalUserItems<CustomMode>(
        LOCAL_KEYS.CUSTOM_MODES,
        currentUserId,
      );
    } else {
      return await StorageService.loadCollection<CustomMode>("custom_modes");
    }
  },

  deleteCustomMode: async (modeId: string): Promise<void> => {
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
  },

  // --- Classrooms ---
  getClassrooms: async (userId: string): Promise<Classroom[]> => {
    if (!currentUserId || isGuestMode) {
      console.warn("Guest users cannot access classrooms");
      return [];
    }
    try {
      return await FirebaseService.getClassroomsByTeacher(userId);
    } catch (e) {
      console.error("Error fetching classrooms:", e);
      return [];
    }
  },

  saveClassroom: async (classroom: Classroom): Promise<void> => {
    if (!currentUserId || isGuestMode) {
      throw new Error("Guest users cannot create classrooms. Please sign in with a teacher account.");
    }
    await FirebaseService.saveClassroom(classroom);
  },

  deleteClassroom: async (classroomId: string): Promise<void> => {
    if (!currentUserId || isGuestMode) {
      throw new Error("Guest users cannot delete classrooms");
    }
    await FirebaseService.deleteClassroom(classroomId);
  },

  // --- Invitations ---
  getInvitations: async (userId: string, role: UserRole): Promise<Invitation[]> => {
    if (!currentUserId || isGuestMode) {
      return [];
    }
    try {
      if (role === "teacher") {
        // Get all invitations for teacher's classrooms
        const classrooms = await FirebaseService.getClassroomsByTeacher(userId);
        const allInvitations: Invitation[] = [];
        for (const classroom of classrooms) {
          const invitations = await FirebaseService.getInvitationsByClassroom(classroom.id);
          allInvitations.push(...invitations);
        }
        return allInvitations;
      } else {
        // Get invitations for student's email
        const profile = await StorageService.getUserProfile(userId);
        if (!profile) return [];
        // Get user's email from Firebase Auth
        const user = auth.currentUser;
        if (!user?.email) return [];
        return await FirebaseService.getInvitationsByEmail(user.email);
      }
    } catch (e) {
      console.error("Error fetching invitations:", e);
      return [];
    }
  },

  sendInvitation: async (invitation: Invitation): Promise<void> => {
    if (!currentUserId || isGuestMode) {
      throw new Error("Guest users cannot send invitations");
    }
    await FirebaseService.saveInvitation(invitation);
  },

  updateInvitationStatus: async (invitationId: string, status: "accepted" | "declined", studentId?: string): Promise<void> => {
    if (!currentUserId || isGuestMode) {
      throw new Error("Guest users cannot update invitations");
    }
    
    try {
      console.log('updateInvitationStatus called:', { invitationId, status, studentId, currentUserId });
      
      // First, get the invitation to know which classroom to update
      const invitationRef = doc(db, "invitations", invitationId);
      console.log('Fetching invitation document...');
      const invitationDoc = await getDoc(invitationRef);
      
      if (!invitationDoc.exists()) {
        console.error('Invitation not found:', invitationId);
        throw new Error("Invitation not found");
      }
      
      const invitation = invitationDoc.data() as Invitation;
      console.log('Invitation found:', invitation);
      
      // Update invitation status
      const updates: Partial<Invitation> = {
        status,
        respondedAt: Date.now(),
      };
      
      if (studentId) {
        updates.studentId = studentId;
      }
      
      console.log('Updating invitation with:', updates);
      await FirebaseService.updateInvitation(invitationId, updates);
      console.log('Invitation updated successfully');
      
      // If accepted, add student to classroom
      if (status === "accepted" && studentId) {
        console.log('Adding student to classroom:', invitation.classroomId);
        const classroomRef = doc(db, "classrooms", invitation.classroomId);
        const classroomDoc = await getDoc(classroomRef);
        
        if (!classroomDoc.exists()) {
          console.error('Classroom not found:', invitation.classroomId);
          throw new Error("Classroom not found");
        }
        
        const classroom = classroomDoc.data() as Classroom;
        console.log('Classroom found:', classroom);
        
        if (!classroom.studentIds.includes(studentId)) {
          classroom.studentIds.push(studentId);
          console.log('Updating classroom with new studentIds:', classroom.studentIds);
          
          await setDoc(classroomRef, { 
            studentIds: classroom.studentIds,
            updatedAt: Date.now()
          }, { merge: true });
          
          console.log('Student added to classroom successfully');
          
          // Log activity for invitation acceptance
          const studentProfile = await StorageService.getUserProfile(studentId);
          await FirebaseService.logActivity({
            classroomId: invitation.classroomId,
            classroomName: invitation.classroomName,
            type: 'student_accepted_invitation',
            actorId: studentId,
            actorName: studentProfile?.name || 'Student',
            timestamp: Date.now(),
          });
        } else {
          console.log('Student already in classroom');
        }
      }
    } catch (error: any) {
      console.error("Error updating invitation status:", error);
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);
      throw error;
    }
  },

  // --- Announcements ---
  getAnnouncements: async (classroomId: string): Promise<Announcement[]> => {
    if (!currentUserId || isGuestMode) {
      return [];
    }
    return await FirebaseService.getAnnouncements(classroomId);
  },

  saveAnnouncement: async (announcement: Announcement): Promise<void> => {
    if (!currentUserId || isGuestMode) {
      throw new Error("Guest users cannot create announcements");
    }
    await FirebaseService.saveAnnouncement(announcement.classroomId, announcement);
  },

  deleteAnnouncement: async (classroomId: string, announcementId: string): Promise<void> => {
    if (!currentUserId || isGuestMode) {
      throw new Error("Guest users cannot delete announcements");
    }
    await FirebaseService.deleteAnnouncement(classroomId, announcementId);
  },

  // --- Resources ---
  getClassroomResources: async (classroomId: string): Promise<ClassroomResource[]> => {
    if (!currentUserId || isGuestMode) {
      return [];
    }
    return await FirebaseService.getResources(classroomId);
  },

  shareResource: async (resource: ClassroomResource): Promise<void> => {
    if (!currentUserId || isGuestMode) {
      throw new Error("Guest users cannot share resources");
    }
    await FirebaseService.shareResource(resource.classroomId, resource);
  },

  unshareResource: async (classroomId: string, resourceId: string): Promise<void> => {
    if (!currentUserId || isGuestMode) {
      throw new Error("Guest users cannot unshare resources");
    }
    await FirebaseService.unshareResource(classroomId, resourceId);
  },

  // --- Teacher Stats ---
  getTeacherStats: async (userId: string): Promise<TeacherStats> => {
    if (!currentUserId || isGuestMode) {
      return {
        id: `stats_${userId}`,
        userId,
        totalClassrooms: 0,
        totalStudents: 0,
        totalAnnouncements: 0,
        totalResourcesShared: 0,
        pendingInvitations: 0,
        lastActivityDate: new Date().toISOString(),
      };
    }
    
    try {
      const classrooms = await FirebaseService.getClassroomsByTeacher(userId);
      const totalStudents = classrooms.reduce((sum, c) => sum + c.studentIds.length, 0);
      
      let totalAnnouncements = 0;
      let totalResourcesShared = 0;
      let pendingInvitations = 0;
      
      for (const classroom of classrooms) {
        const announcements = await FirebaseService.getAnnouncements(classroom.id);
        const resources = await FirebaseService.getResources(classroom.id);
        const invitations = await FirebaseService.getInvitationsByClassroom(classroom.id);
        
        totalAnnouncements += announcements.length;
        totalResourcesShared += resources.length;
        pendingInvitations += invitations.filter(inv => inv.status === 'pending').length;
      }
      
      return {
        id: `stats_${userId}`,
        userId,
        totalClassrooms: classrooms.length,
        totalStudents,
        totalAnnouncements,
        totalResourcesShared,
        pendingInvitations,
        lastActivityDate: new Date().toISOString(),
      };
    } catch (e) {
      console.error("Error calculating teacher stats:", e);
      return {
        id: `stats_${userId}`,
        userId,
        totalClassrooms: 0,
        totalStudents: 0,
        totalAnnouncements: 0,
        totalResourcesShared: 0,
        pendingInvitations: 0,
        lastActivityDate: new Date().toISOString(),
      };
    }
  },

  // --- Helpers ---

  loadCollection: async <T extends { userId: string }>(
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
      return snap.docs.map((d) => d.data() as T);
    }
  },
};

const createEmptyStats = (userId: string): UserStats => ({
  id: `stats_${userId}`,
  userId,
  totalTimeStudiedMinutes: 0,
  notesCreated: 0,
  quizzesTaken: 0,
  loginStreak: 0,
  lastLoginDate: new Date().toISOString(),
  dailyActivity: {},
  highScore: 0,
});

export const saveQuiz = async (quiz: Quiz) => {
  return StorageService.saveQuiz(quiz);
};

export const getQuizzes = async (userId: string): Promise<Quiz[]> => {
  return StorageService.getQuizzes();
};

const createTimestampFromDate = (dateVal: any) => {
  if (typeof dateVal === "number") return new Date(dateVal);
  if (dateVal instanceof Date) return dateVal;
  return serverTimestamp();
};
