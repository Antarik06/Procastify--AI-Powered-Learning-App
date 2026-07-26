/** Classrooms, invitations, announcements and shared resources. */
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
import { currentUserId, isGuestMode, getUserProfile } from './session';

export const getClassrooms = async (userId: string): Promise<Classroom[]> => {
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
};

export const saveClassroom = async (classroom: Classroom): Promise<void> => {
  if (!currentUserId || isGuestMode) {
    throw new Error("Guest users cannot create classrooms. Please sign in with a teacher account.");
  }
  await FirebaseService.saveClassroom(classroom);
};

export const deleteClassroom = async (classroomId: string): Promise<void> => {
  if (!currentUserId || isGuestMode) {
    throw new Error("Guest users cannot delete classrooms");
  }
  await FirebaseService.deleteClassroom(classroomId);
};

export const getInvitations = async (userId: string, role: UserRole): Promise<Invitation[]> => {
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
      const profile = await getUserProfile(userId);
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
};

export const sendInvitation = async (invitation: Invitation): Promise<void> => {
  if (!currentUserId || isGuestMode) {
    throw new Error("Guest users cannot send invitations");
  }
  await FirebaseService.saveInvitation(invitation);
};

export const updateInvitationStatus = async (invitationId: string, status: "accepted" | "declined", studentId?: string): Promise<void> => {
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
        const studentProfile = await getUserProfile(studentId);
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
};

export const getAnnouncements = async (classroomId: string): Promise<Announcement[]> => {
  if (!currentUserId || isGuestMode) {
    return [];
  }
  return await FirebaseService.getAnnouncements(classroomId);
};

export const saveAnnouncement = async (announcement: Announcement): Promise<void> => {
  if (!currentUserId || isGuestMode) {
    throw new Error("Guest users cannot create announcements");
  }
  await FirebaseService.saveAnnouncement(announcement.classroomId, announcement);
};

export const deleteAnnouncement = async (classroomId: string, announcementId: string): Promise<void> => {
  if (!currentUserId || isGuestMode) {
    throw new Error("Guest users cannot delete announcements");
  }
  await FirebaseService.deleteAnnouncement(classroomId, announcementId);
};

export const getClassroomResources = async (classroomId: string): Promise<ClassroomResource[]> => {
  if (!currentUserId || isGuestMode) {
    return [];
  }
  return await FirebaseService.getResources(classroomId);
};

export const shareResource = async (resource: ClassroomResource): Promise<void> => {
  if (!currentUserId || isGuestMode) {
    throw new Error("Guest users cannot share resources");
  }
  await FirebaseService.shareResource(resource.classroomId, resource);
};

export const unshareResource = async (classroomId: string, resourceId: string): Promise<void> => {
  if (!currentUserId || isGuestMode) {
    throw new Error("Guest users cannot unshare resources");
  }
  await FirebaseService.unshareResource(classroomId, resourceId);
};

export const getTeacherStats = async (userId: string): Promise<TeacherStats> => {
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
};
