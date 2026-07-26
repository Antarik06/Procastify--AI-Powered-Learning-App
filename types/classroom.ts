export interface VirtualClassLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  scheduledDate?: number;
  createdAt: number;
  createdBy: string;
}

export interface Resource {
  id: string;
  title: string;
  type: 'link' | 'file' | 'note';
  url?: string;
  fileUrl?: string;
  noteId?: string;
  description?: string;
  createdAt: number;
  createdBy: string;
  classroomId: string;
}

export type CalendarEventType = 'lecture' | 'assignment' | 'exam' | 'revision' | 'custom';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: number;
  /** Optional time string, e.g. "14:00". */
  time?: string;
  eventType: CalendarEventType;
  createdBy: string;
  createdAt: number;
}

export interface Classroom {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  virtualLinks: VirtualClassLink[];
  announcements: Announcement[];
  resources: Resource[];
  calendarEvents?: CalendarEvent[];
  inviteCode: string;
  invitationCount?: number;
  announcementCount?: number;
  code?: string;
  codeEnabled?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Announcement {
  id: string;
  title?: string;
  content: string;
  createdAt: number;
  createdBy?: string;
  teacherId?: string;
  teacherName?: string;
  classroomId: string;
  updatedAt?: number;
}

export interface Invitation {
  id: string;
  classroomId: string;
  classroomName: string;
  teacherId: string;
  teacherName: string;
  studentEmail: string;
  studentId?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  respondedAt?: number;
}

export interface ClassroomResource {
  id: string;
  classroomId: string;
  resourceType: 'note' | 'quiz';
  resourceId: string;
  resourceTitle: string;
  resourceDescription?: string;
  sharedBy: string;
  sharedByName: string;
  sharedAt: number;
}

export interface TeacherStats {
  id: string;
  userId: string;
  totalClassrooms: number;
  totalStudents: number;
  totalAnnouncements: number;
  totalResourcesShared: number;
  pendingInvitations?: number;
  lastActivityDate: string;
}

export type ActivityType =
  | 'student_joined'
  | 'student_accepted_invitation'
  | 'announcement_posted'
  | 'resource_shared'
  | 'resource_copied';

export interface Activity {
  id: string;
  classroomId: string;
  classroomName: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  timestamp: number;
  metadata?: any;
}
