import { db, isFirebaseConfigured } from '../firebaseConfig';
import { doc, getDoc, setDoc, collection, getDocs, query, where, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Classroom, VirtualClassLink, Announcement, Resource } from '../types';

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
        
        const classroomId = `classroom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const inviteCode = ClassroomService.generateInviteCode();
        
        const classroom: Classroom = {
            id: classroomId,
            name,
            description,
            teacherId,
            teacherName,
            studentIds: [],
            virtualLinks: [],
            announcements: [],
            resources: [],
            inviteCode,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        try {
            await setDoc(doc(db, 'classrooms', classroomId), {
                ...classroom,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return classroom;
        } catch (error) {
            console.error('Error creating classroom:', error);
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
                    resources: data.resources || []
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
    }
};

