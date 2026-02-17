import { db } from '../firebaseConfig';
import { doc, deleteDoc, setDoc, getDoc, collection, getDocs, writeBatch, serverTimestamp, query, where, orderBy, Firestore } from 'firebase/firestore';
import { Note } from '../types';
import { apiRateLimiter } from './rateLimiter';
import { sanitizeContent } from './validation';
import logger from './securityLogger';

export const FirebaseService = {
    // --- Notes ---
    saveNote: async (userId: string, note: Note) => {
        // Rate Limiting
        if (apiRateLimiter.isLimited(userId)) {
            logger.logRateLimitViolation(userId, 'saveNote');
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        const ref = doc(db, 'notes', note.id);

        // Ensure strictly managed fields
        const payload = {
            ...note,
            ownerId: userId,
            updatedAt: serverTimestamp(),
            // Ensure these defaults if missing
            isPublic: note.isPublic || false,
            publishedAt: note.isPublic ? (note.publishedAt || serverTimestamp()) : null,
            document: note.document || { blocks: [] },
            canvas: note.canvas || { elements: [], strokes: [] }
        };

        // If it's a new note (basic check), add createdAt. 
        // Ideally we pass this in, but 'merge: true' with setDoc handles it well if we don't overwrite.
        // But to be safe for existing notes being saved:
        if (!note.createdAt) {
            // We can't easily know if it exists without reading, but 'merge' is safe.
            // We simply won't set createdAt here if it's missing in the object, assume it allows serverTimestamp if new?
            // Better: App creates `createdAt` in local state for new notes.
        }
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
  Firestore,
} from "firebase/firestore";
import { Note, Folder, Classroom, Invitation, Announcement, ClassroomResource, Activity } from "../types";

export const FirebaseService = {
  // --- Notes ---
  saveNote: async (userId: string, note: Note) => {
    const ref = doc(db, "notes", note.id);

    // Ensure strictly managed fields
    const payload = {
      ...note,
      ownerId: userId,
      updatedAt: serverTimestamp(),
      // Ensure these defaults if missing
      isPublic: note.isPublic || false,
      publishedAt: note.isPublic ? note.publishedAt || serverTimestamp() : null,
      document: note.document || { blocks: [] },
      canvas: note.canvas || { elements: [], strokes: [] },
    };

        // Additional Content Sanitization (XSS Prevention) for text fields
        if (sanitizedPayload.title) {
            sanitizedPayload.title = sanitizeContent(sanitizedPayload.title, 200);
        }

        await setDoc(ref, sanitizedPayload, { merge: true });
    },

    deleteNote: async (userId: string, noteId: string) => {
        const ref = doc(db, 'notes', noteId);
        await deleteDoc(ref);
    },

    saveNotesBatch: async (userId: string, notes: Note[]) => {
        // Rate Limiting for Batch
        if (apiRateLimiter.isLimited(userId)) {
            logger.logRateLimitViolation(userId, 'saveNotesBatch');
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        const batch = writeBatch(db);
        notes.forEach(note => {
            const ref = doc(db, 'notes', note.id);
            const payload = {
                ...note,
                ownerId: userId,
                updatedAt: serverTimestamp(),
                isPublic: note.isPublic || false
            };
            // Sanitize batch payload as well
            batch.set(ref, sanitizePayload(payload), { merge: true });
        });
        await batch.commit();
    },

    // --- Public Store ---
    publishNote: async (userId: string, note: Note) => {
        if (apiRateLimiter.isLimited(userId)) {
            throw new Error('Rate limit exceeded.');
        }
        // Single source of truth update
        const ref = doc(db, 'notes', note.id);
        await setDoc(ref, {
            isPublic: true,
            publishedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    },

    unpublishNote: async (userId: string, noteId: string) => {
        const ref = doc(db, 'notes', noteId);
        await setDoc(ref, {
            isPublic: false,
            publishedAt: null,
            updatedAt: serverTimestamp()
        }, { merge: true });
    },

    getPublicNotes: async (): Promise<Note[]> => {
        try {
            const q = query(
                collection(db, 'notes'),
                where('isPublic', '==', true),
                orderBy('publishedAt', 'desc')
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => {
                const data = d.data();
                // Normalize timestamps
                return mapFirestoreDataToNote(data);
            });
        } catch (e) {
            console.error("Error fetching public notes:", e);
            return [];
    // If it's a new note (basic check), add createdAt.
    // Ideally we pass this in, but 'merge: true' with setDoc handles it well if we don't overwrite.
    // But to be safe for existing notes being saved:
    if (!note.createdAt) {
      // We can't easily know if it exists without reading, but 'merge' is safe.
      // We simply won't set createdAt here if it's missing in the object, assume it allows serverTimestamp if new?
      // Better: App creates `createdAt` in local state for new notes.
    }

    // Sanitize payload to remove undefined values which Firestore rejects
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
      // Sanitize batch payload as well
      batch.set(ref, sanitizePayload(payload), { merge: true });
    });
    await batch.commit();
  },

  // --- Public Store ---
  publishNote: async (userId: string, note: Note) => {
    // Single source of truth update
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
      return snap.docs.map((d) => {
        const data = d.data();
        // Normalize timestamps
        return mapFirestoreDataToNote(data);
      });
    } catch (e) {
      console.error("Error fetching public notes:", e);
      return [];
    }
  },

  // --- Folders ---
  saveFolder: async (userId: string, folder: Folder) => {
    const ref = doc(db, "folders", folder.id);
    const payload = {
      ...folder,
      userId,
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, sanitizePayload(payload), { merge: true });
  },

  getFolders: async (userId: string): Promise<Folder[]> => {
    try {
      const q = query(
        collection(db, "folders"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
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

  deleteFolder: async (userId: string, folderId: string) => {
    const ref = doc(db, "folders", folderId);
    await deleteDoc(ref);
  },

  saveFoldersBatch: async (userId: string, folders: Folder[]) => {
    const batch = writeBatch(db);
    folders.forEach((folder) => {
      const ref = doc(db, "folders", folder.id);
      const payload = {
        ...folder,
        userId,
        updatedAt: serverTimestamp(),
      };
      batch.set(ref, sanitizePayload(payload), { merge: true });
    });
    await batch.commit();
  },

  // --- Generic document operations ---
  deleteDocument: async (docRef: any) => {
    await deleteDoc(docRef);
  },

  // --- Stats (Unchanged logic, kept for interface consistency) ---
  saveDailyActivity: async (
    userId: string,
    dateKey: string,
    minutes: number,
  ) => {},

  // --- Classrooms ---
  saveClassroom: async (classroom: Classroom) => {
    const ref = doc(db, "classrooms", classroom.id);
    
    // Generate classroom code if not present
    if (!classroom.code) {
      classroom.code = FirebaseService.generateClassroomCode(classroom.name);
      classroom.codeEnabled = true;
    }
    
    const payload = {
      ...classroom,
      createdAt: classroom.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, sanitizePayload(payload), { merge: true });
  },

  getClassroomsByTeacher: async (teacherId: string): Promise<Classroom[]> => {
    try {
      const q = query(
        collection(db, "classrooms"),
        where("teacherId", "==", teacherId),
        orderBy("updatedAt", "desc"),
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
        } as Classroom;
      });
    } catch (e) {
      console.error("Error fetching classrooms:", e);
      return [];
    }
  },

  getClassroomsByStudent: async (studentId: string): Promise<Classroom[]> => {
    try {
      const q = query(
        collection(db, "classrooms"),
        where("studentIds", "array-contains", studentId),
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
        } as Classroom;
      });
    } catch (e) {
      console.error("Error fetching student classrooms:", e);
      return [];
    }
  },

  deleteClassroom: async (classroomId: string) => {
    const ref = doc(db, "classrooms", classroomId);
    
    // Delete announcements subcollection
    const announcementsRef = collection(db, "classrooms", classroomId, "announcements");
    const announcementsSnap = await getDocs(announcementsRef);
    const batch = writeBatch(db);
    announcementsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Delete resources subcollection
    const resourcesRef = collection(db, "classrooms", classroomId, "resources");
    const resourcesSnap = await getDocs(resourcesRef);
    resourcesSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // Delete classroom document
    await deleteDoc(ref);
  },

  // --- Invitations ---
  saveInvitation: async (invitation: Invitation) => {
    const ref = doc(db, "invitations", invitation.id);
    await setDoc(ref, sanitizePayload(invitation));
  },

  getInvitationsByEmail: async (email: string, status?: string): Promise<Invitation[]> => {
    try {
      let q;
      if (status) {
        q = query(
          collection(db, "invitations"),
          where("studentEmail", "==", email),
          where("status", "==", status),
        );
      } else {
        q = query(
          collection(db, "invitations"),
          where("studentEmail", "==", email),
        );
      }
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          createdAt: data.createdAt?.toMillis
            ? data.createdAt.toMillis()
            : data.createdAt,
          respondedAt: data.respondedAt?.toMillis
            ? data.respondedAt.toMillis()
            : data.respondedAt,
        } as Invitation;
      });
    } catch (e) {
      console.error("Error fetching invitations:", e);
      return [];
    }
  },

  getInvitationsByClassroom: async (classroomId: string): Promise<Invitation[]> => {
    try {
      const q = query(
        collection(db, "invitations"),
        where("classroomId", "==", classroomId),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          createdAt: data.createdAt?.toMillis
            ? data.createdAt.toMillis()
            : data.createdAt,
          respondedAt: data.respondedAt?.toMillis
            ? data.respondedAt.toMillis()
            : data.respondedAt,
        } as Invitation;
      });
    } catch (e) {
      console.error("Error fetching classroom invitations:", e);
      return [];
    }
  },

  updateInvitation: async (invitationId: string, updates: Partial<Invitation>) => {
    const ref = doc(db, "invitations", invitationId);
    await setDoc(ref, sanitizePayload(updates), { merge: true });
  },

  // --- Announcements ---
  saveAnnouncement: async (classroomId: string, announcement: Announcement) => {
    const ref = doc(db, "classrooms", classroomId, "announcements", announcement.id);
    const payload = {
      ...announcement,
      createdAt: announcement.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, sanitizePayload(payload), { merge: true });
  },

  getAnnouncements: async (classroomId: string): Promise<Announcement[]> => {
    try {
      const q = query(
        collection(db, "classrooms", classroomId, "announcements"),
        orderBy("createdAt", "desc"),
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
        } as Announcement;
      });
    } catch (e) {
      console.error("Error fetching announcements:", e);
      return [];
    }
  },

  deleteAnnouncement: async (classroomId: string, announcementId: string) => {
    const ref = doc(db, "classrooms", classroomId, "announcements", announcementId);
    await deleteDoc(ref);
  },

  // --- Resources ---
  shareResource: async (classroomId: string, resource: ClassroomResource) => {
    const ref = doc(db, "classrooms", classroomId, "resources", resource.id);
    await setDoc(ref, sanitizePayload(resource));
  },

  getResources: async (classroomId: string): Promise<ClassroomResource[]> => {
    try {
      const resourcesRef = collection(db, "classrooms", classroomId, "resources");
      const snap = await getDocs(resourcesRef);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          sharedAt: data.sharedAt?.toMillis
            ? data.sharedAt.toMillis()
            : data.sharedAt,
        } as ClassroomResource;
      });
    } catch (e) {
      console.error("Error fetching resources:", e);
      return [];
    }
  },

  unshareResource: async (classroomId: string, resourceId: string) => {
    const ref = doc(db, "classrooms", classroomId, "resources", resourceId);
    await deleteDoc(ref);
  },

  // --- Activity Tracking ---
  logActivity: async (activity: Omit<import("../types").Activity, "id">) => {
    try {
      const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const ref = doc(db, "classrooms", activity.classroomId, "activities", activityId);
      await setDoc(ref, {
        ...activity,
        id: activityId,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error logging activity:", e);
    }
  },

  getRecentActivities: async (teacherId: string, limit: number = 10) => {
    try {
      // Get all classrooms for this teacher
      const classroomsQuery = query(
        collection(db, "classrooms"),
        where("teacherId", "==", teacherId)
      );
      const classroomsSnapshot = await getDocs(classroomsQuery);
      
      // Fetch activities from all classrooms
      const allActivities: import("../types").Activity[] = [];
      
      for (const classroomDoc of classroomsSnapshot.docs) {
        const activitiesQuery = query(
          collection(db, "classrooms", classroomDoc.id, "activities"),
          orderBy("timestamp", "desc")
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        
        activitiesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          allActivities.push({
            ...data,
            timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp,
          } as import("../types").Activity);
        });
      }
      
      // Sort by timestamp and limit
      return allActivities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (e) {
      console.error("Error fetching activities:", e);
      return [];
    }
  },

  // --- Classroom Code System ---
  generateClassroomCode: (classroomName: string): string => {
    const prefix = classroomName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${random}`;
  },

  joinClassroomByCode: async (studentId: string, studentName: string, code: string) => {
    try {
      // Find classroom by code
      const classroomsQuery = query(
        collection(db, "classrooms"),
        where("code", "==", code),
        where("codeEnabled", "==", true)
      );
      const snapshot = await getDocs(classroomsQuery);
      
      if (snapshot.empty) {
        throw new Error("Invalid or disabled classroom code");
      }
      
      const classroomDoc = snapshot.docs[0];
      const classroom = classroomDoc.data() as import("../types").Classroom;
      
      // Check if student already in classroom
      if (classroom.studentIds.includes(studentId)) {
        throw new Error("You are already in this classroom");
      }
      
      // Add student to classroom
      const updatedStudentIds = [...classroom.studentIds, studentId];
      await setDoc(
        doc(db, "classrooms", classroomDoc.id),
        { studentIds: updatedStudentIds, updatedAt: serverTimestamp() },
        { merge: true }
      );
      
      // Log activity
      await FirebaseService.logActivity({
        classroomId: classroomDoc.id,
        classroomName: classroom.name,
        type: "student_joined",
        actorId: studentId,
        actorName: studentName,
        timestamp: Date.now(),
      });
      
      return { ...classroom, id: classroomDoc.id };
    } catch (e: any) {
      console.error("Error joining classroom by code:", e);
      throw e;
    }
  },

  validateClassroomCode: async (code: string): Promise<boolean> => {
    try {
      const classroomsQuery = query(
        collection(db, "classrooms"),
        where("code", "==", code),
        where("codeEnabled", "==", true)
      );
      const snapshot = await getDocs(classroomsQuery);
      return !snapshot.empty;
    } catch (e) {
      console.error("Error validating code:", e);
      return false;
    }
  },

  // --- Multiplayer Quiz System ---
  generateQuizCode: (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  createQuizSession: async (session: import("../types").MultiplayerQuizSession) => {
    try {
      const ref = doc(db, "quizSessions", session.id);
      await setDoc(ref, sanitizePayload({
        ...session,
        createdAt: serverTimestamp(),
      }));
      return session;
    } catch (e) {
      console.error("Error creating quiz session:", e);
      throw e;
    }
  },

  getQuizSession: async (sessionId: string): Promise<import("../types").MultiplayerQuizSession | null> => {
    try {
      const ref = doc(db, "quizSessions", sessionId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        return {
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
          startedAt: data.startedAt?.toMillis ? data.startedAt.toMillis() : data.startedAt,
          completedAt: data.completedAt?.toMillis ? data.completedAt.toMillis() : data.completedAt,
        } as import("../types").MultiplayerQuizSession;
      }
      return null;
    } catch (e) {
      console.error("Error getting quiz session:", e);
      return null;
    }
  },

  getQuizSessionByCode: async (code: string): Promise<import("../types").MultiplayerQuizSession | null> => {
    try {
      const q = query(
        collection(db, "quizSessions"),
        where("inviteCode", "==", code),
        where("status", "in", ["waiting", "in_progress"])
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        return {
          ...data,
          id: snap.docs[0].id,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
          startedAt: data.startedAt?.toMillis ? data.startedAt.toMillis() : data.startedAt,
          completedAt: data.completedAt?.toMillis ? data.completedAt.toMillis() : data.completedAt,
        } as import("../types").MultiplayerQuizSession;
      }
      return null;
    } catch (e) {
      console.error("Error getting quiz session by code:", e);
      return null;
    }
  },

  updateQuizSession: async (sessionId: string, updates: Partial<import("../types").MultiplayerQuizSession>) => {
    try {
      const ref = doc(db, "quizSessions", sessionId);
      await setDoc(ref, sanitizePayload(updates), { merge: true });
    } catch (e) {
      console.error("Error updating quiz session:", e);
      throw e;
    }
  },

  joinQuizSession: async (sessionId: string, participant: import("../types").QuizParticipant) => {
    try {
      const session = await FirebaseService.getQuizSession(sessionId);
      if (!session) throw new Error("Session not found");
      
      if (session.status !== "waiting") {
        throw new Error("Cannot join - quiz already started");
      }

      const updatedParticipants = [...session.participants, participant];
      await FirebaseService.updateQuizSession(sessionId, {
        participants: updatedParticipants,
      });
    } catch (e) {
      console.error("Error joining quiz session:", e);
      throw e;
    }
  },

  leaveQuizSession: async (sessionId: string, userId: string) => {
    try {
      const session = await FirebaseService.getQuizSession(sessionId);
      if (!session) throw new Error("Session not found");

      const updatedParticipants = session.participants.filter(p => p.userId !== userId);
      
      // If no participants left, delete the session
      if (updatedParticipants.length === 0) {
        const ref = doc(db, "quizSessions", sessionId);
        await deleteDoc(ref);
        return;
      }

      await FirebaseService.updateQuizSession(sessionId, {
        participants: updatedParticipants,
      });
    } catch (e) {
      console.error("Error leaving quiz session:", e);
      throw e;
    }
  },

  submitQuizAnswer: async (sessionId: string, userId: string, answer: import("../types").QuizAnswer) => {
    try {
      const session = await FirebaseService.getQuizSession(sessionId);
      if (!session) throw new Error("Session not found");

      const updatedParticipants = session.participants.map(p => {
        if (p.userId === userId) {
          return {
            ...p,
            answers: [...p.answers, answer],
            score: p.score + (answer.isCorrect ? 100 : 0),
          };
        }
        return p;
      });

      await FirebaseService.updateQuizSession(sessionId, {
        participants: updatedParticipants,
      });
    } catch (e) {
      console.error("Error submitting quiz answer:", e);
      throw e;
    }
  },

  generateLeaderboard: async (sessionId: string): Promise<import("../types").QuizLeaderboard> => {
    try {
      const session = await FirebaseService.getQuizSession(sessionId);
      if (!session) throw new Error("Session not found");

      const rankings: import("../types").QuizRanking[] = session.participants
        .map(p => {
          const correctAnswers = p.answers.filter(a => a.isCorrect).length;
          const totalTime = p.answers.reduce((sum, a) => sum + a.timeSpent, 0);
          const averageTime = p.answers.length > 0 ? totalTime / p.answers.length : 0;

          return {
            userId: p.userId,
            userName: p.userName,
            score: p.score,
            correctAnswers,
            totalQuestions: p.answers.length,
            averageTime,
            rank: 0, // Will be set after sorting
          };
        })
        .sort((a, b) => {
          // Sort by score first, then by average time (faster is better)
          if (b.score !== a.score) return b.score - a.score;
          return a.averageTime - b.averageTime;
        })
        .map((r, index) => ({ ...r, rank: index + 1 }));

      return {
        sessionId,
        rankings,
        generatedAt: Date.now(),
      };
    } catch (e) {
      console.error("Error generating leaderboard:", e);
      throw e;
    }
  },
};

// Helper to handle Firestore timestamps vs Date/Numbers
const createTimestampFromDate = (dateVal: any) => {
  // If it's already a firestore timestamp-like (not a real one here without importing Timestamp class),
  // best effort or just pass through for serverTimestamp if strictly new.
  // If it's number (Date.now()), return it date object for Firestore?
  // Firestore setDoc accepts Date objects.
  if (typeof dateVal === "number") return new Date(dateVal);
  if (dateVal instanceof Date) return dateVal;
  return serverTimestamp();
};

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
