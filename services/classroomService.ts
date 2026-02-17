import { db, auth, isFirebaseConfigured } from '../firebaseConfig';
import { doc, getDoc, setDoc, collection, getDocs, query, where, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Classroom, VirtualClassLink, Announcement, Resource, CalendarEvent } from '../types';

export const ClassroomService = {
    // Generate a unique invite code
    generateInviteCode: (): string => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    },

    // Create a new classroom
    createClassroom: async (teacherId: string, teacherName: string, name: string, description?: string): Promise<Classroom> => {
        if (!isFirebaseConfigured() || !db) {
            throw new Error('Firebase is not configured. Please set up your .env.local file with Firebase credentials.');
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('User must be authenticated to create a classroom.');
        }

        if (currentUser.uid !== teacherId) {
            console.error(`Permission denied: teacherId ${teacherId} does not match auth.uid ${currentUser.uid}`);
            throw new Error('Permission denied: You can only create classrooms for yourself.');
        }

        const classroomId = `classroom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const inviteCode = ClassroomService.generateInviteCode();

        // Remove undefined fields to prevent Firestore errors
        const classroomData: any = {
            id: classroomId,
            name,
            teacherId,
            teacherName,
            studentIds: [],
            virtualLinks: [],
            announcements: [],
            resources: [],
            inviteCode,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        if (description) {
            classroomData.description = description;
        }

        const classroom: Classroom = {
            ...classroomData,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        try {
            await setDoc(doc(db, 'classrooms', classroomId), classroomData);
            return classroom;
        } catch (error: any) {
            console.error('Error creating classroom:', error);
            if (error.code === 'permission-denied') {
                throw new Error('Permission denied: You do not have permission to create this classroom. Please check your Firestore Rules or ensure your role is "teacher".');
            }
            throw error;
        }
    },

    // Get classroom by ID
    getClassroom: async (classroomId: string): Promise<Classroom | null> => {
        try {
            const docRef = doc(db, 'classrooms', classroomId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                return {
                    ...data,
                    id: snap.id,
                    createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
                    updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
                    virtualLinks: data.virtualLinks || [],
                    announcements: data.announcements || [],
                    resources: data.resources || [],
                    calendarEvents: data.calendarEvents || []
                } as Classroom;
            }
            return null;
        } catch (error) {
            console.error('Error fetching classroom:', error);
            return null;
        }
    },

    // Get all classrooms for a teacher
    getTeacherClassrooms: async (teacherId: string): Promise<Classroom[]> => {
        if (!isFirebaseConfigured() || !db) {
            console.warn('Firebase is not configured. Cannot fetch classrooms.');
            return [];
        }

        try {
            const q = query(collection(db, 'classrooms'), where('teacherId', '==', teacherId));
            const snap = await getDocs(q);
            return snap.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
                    updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
                    virtualLinks: data.virtualLinks || [],
                    announcements: data.announcements || [],
                    resources: data.resources || []
                } as Classroom;
            });
        } catch (error) {
            console.error('Error fetching teacher classrooms:', error);
            return [];
        }
    },

    // Get all classrooms for a student
    getStudentClassrooms: async (studentId: string): Promise<Classroom[]> => {
        if (!isFirebaseConfigured() || !db) {
            console.warn('Firebase is not configured. Cannot fetch classrooms.');
            return [];
        }

        try {
            const q = query(collection(db, 'classrooms'), where('studentIds', 'array-contains', studentId));
            const snap = await getDocs(q);
            return snap.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
                    updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
                    virtualLinks: data.virtualLinks || [],
                    announcements: data.announcements || [],
                    resources: data.resources || []
                } as Classroom;
            });
        } catch (error) {
            console.error('Error fetching student classrooms:', error);
            return [];
        }
    },

    // Join classroom by invite code
    joinClassroom: async (classroomId: string, studentId: string): Promise<boolean> => {
        try {
            const classroomRef = doc(db, 'classrooms', classroomId);
            await updateDoc(classroomRef, {
                studentIds: arrayUnion(studentId),
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error joining classroom:', error);
            return false;
        }
    },

    // Join classroom by invite code (find classroom first)
    joinClassroomByCode: async (inviteCode: string, studentId: string): Promise<Classroom | null> => {
        try {
            const q = query(collection(db, 'classrooms'), where('inviteCode', '==', inviteCode));
            const snap = await getDocs(q);

            if (snap.empty) {
                return null;
            }

            const classroomDoc = snap.docs[0];
            const classroomId = classroomDoc.id;

            // Check if already enrolled
            const data = classroomDoc.data();
            if (data.studentIds?.includes(studentId)) {
                return ClassroomService.getClassroom(classroomId);
            }

            // Join the classroom
            await ClassroomService.joinClassroom(classroomId, studentId);
            return ClassroomService.getClassroom(classroomId);
        } catch (error) {
            console.error('Error joining classroom by code:', error);
            return null;
        }
    },

    // Add virtual class link (teacher only)
    addVirtualLink: async (classroomId: string, link: Omit<VirtualClassLink, 'id' | 'createdAt'>): Promise<boolean> => {
        try {
            const classroom = await ClassroomService.getClassroom(classroomId);
            if (!classroom) return false;

            const newLink: VirtualClassLink = {
                ...link,
                id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                createdAt: Date.now()
            };

            const updatedLinks = [...classroom.virtualLinks, newLink];
            const classroomRef = doc(db, 'classrooms', classroomId);
            await updateDoc(classroomRef, {
                virtualLinks: updatedLinks,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error adding virtual link:', error);
            return false;
        }
    },

    // Update virtual class link (teacher only)
    updateVirtualLink: async (classroomId: string, linkId: string, updates: Partial<VirtualClassLink>): Promise<boolean> => {
        try {
            const classroom = await ClassroomService.getClassroom(classroomId);
            if (!classroom) return false;

            const updatedLinks = classroom.virtualLinks.map(link =>
                link.id === linkId ? { ...link, ...updates } : link
            );

            const classroomRef = doc(db, 'classrooms', classroomId);
            await updateDoc(classroomRef, {
                virtualLinks: updatedLinks,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating virtual link:', error);
            return false;
        }
    },

    // Delete virtual class link (teacher only)
    deleteVirtualLink: async (classroomId: string, linkId: string): Promise<boolean> => {
        try {
            const classroom = await ClassroomService.getClassroom(classroomId);
            if (!classroom) return false;

            const updatedLinks = classroom.virtualLinks.filter(link => link.id !== linkId);
            const classroomRef = doc(db, 'classrooms', classroomId);
            await updateDoc(classroomRef, {
                virtualLinks: updatedLinks,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error deleting virtual link:', error);
            return false;
        }
    },

    // Add announcement (teacher only)
    addAnnouncement: async (classroomId: string, announcement: Omit<Announcement, 'id' | 'createdAt' | 'classroomId'>): Promise<boolean> => {
        try {
            const classroom = await ClassroomService.getClassroom(classroomId);
            if (!classroom) return false;

            const newAnnouncement: Announcement = {
                ...announcement,
                id: `announcement_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                createdAt: Date.now(),
                classroomId
            };

            const updatedAnnouncements = [...classroom.announcements, newAnnouncement];
            const classroomRef = doc(db, 'classrooms', classroomId);
            await updateDoc(classroomRef, {
                announcements: updatedAnnouncements,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error adding announcement:', error);
            return false;
        }
    },

    // Add resource (teacher only)
    addResource: async (classroomId: string, resource: Omit<Resource, 'id' | 'createdAt' | 'classroomId'>): Promise<boolean> => {
        try {
            const classroom = await ClassroomService.getClassroom(classroomId);
            if (!classroom) return false;

            const newResource: Resource = {
                ...resource,
                id: `resource_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                createdAt: Date.now(),
                classroomId
            };

            const updatedResources = [...classroom.resources, newResource];
            const classroomRef = doc(db, 'classrooms', classroomId);
            await updateDoc(classroomRef, {
                resources: updatedResources,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error adding resource:', error);
            return false;
        }
    },

    // Delete classroom (teacher only)
    deleteClassroom: async (classroomId: string): Promise<boolean> => {
        try {
            await deleteDoc(doc(db, 'classrooms', classroomId));
            return true;
        } catch (error) {
            console.error('Error deleting classroom:', error);
            return false;
        }
    },

    // Add calendar event (teacher only)
    addCalendarEvent: async (classroomId: string, event: Omit<CalendarEvent, 'id' | 'createdAt'>): Promise<boolean> => {
        try {
            const classroom = await ClassroomService.getClassroom(classroomId);
            if (!classroom) return false;

            const newEvent: CalendarEvent = {
                ...event,
                id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                createdAt: Date.now()
            };

            const updatedEvents = [...(classroom.calendarEvents || []), newEvent];
            const classroomRef = doc(db, 'classrooms', classroomId);
            await updateDoc(classroomRef, {
                calendarEvents: updatedEvents,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error adding calendar event:', error);
            return false;
        }
    },

    // Update calendar event (teacher only)
    updateCalendarEvent: async (classroomId: string, eventId: string, updates: Partial<CalendarEvent>): Promise<boolean> => {
        try {
            const classroom = await ClassroomService.getClassroom(classroomId);
            if (!classroom) return false;

            const updatedEvents = (classroom.calendarEvents || []).map(event =>
                event.id === eventId ? { ...event, ...updates } : event
            );

            const classroomRef = doc(db, 'classrooms', classroomId);
            await updateDoc(classroomRef, {
                calendarEvents: updatedEvents,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating calendar event:', error);
            return false;
        }
    },

    // Delete calendar event (teacher only)
    deleteCalendarEvent: async (classroomId: string, eventId: string): Promise<boolean> => {
        try {
            const classroom = await ClassroomService.getClassroom(classroomId);
            if (!classroom) return false;

            const updatedEvents = (classroom.calendarEvents || []).filter(event => event.id !== eventId);
            const classroomRef = doc(db, 'classrooms', classroomId);
            await updateDoc(classroomRef, {
                calendarEvents: updatedEvents,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error deleting calendar event:', error);
            return false;
        }
    }
};

