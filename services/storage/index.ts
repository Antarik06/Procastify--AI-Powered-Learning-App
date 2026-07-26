/**
 * Storage layer.
 *
 * Each repository module owns one domain and talks to Firestore (signed-in) or
 * localStorage (guest mode). `StorageService` is the facade the rest of the app
 * uses; new code can also import a repository directly, e.g.
 * `import { getNotes } from 'services/storage/notes'`.
 */
import * as session from './session';
import * as stats from './stats';
import * as notes from './notes';
import * as summaries from './summaries';
import * as folders from './folders';
import * as collections from './collections';
import * as classrooms from './classrooms';
import * as achievements from './achievements';
import type { Quiz } from '../../types';

export { LOCAL_KEYS, canvasKey } from './keys';
export * from './localDb';
export { createEmptyStats, normalizeStats } from './stats';

export const StorageService = {
  /** Id of the signed-in (or guest) user, or null before a session starts. */
  get currentUserId() {
    return session.currentUserId;
  },

  // Session & profile
  setSession: session.setSession,
  getGuestSession: session.getGuestSession,
  createGuestUser: session.createGuestUser,
  getUserProfile: session.getUserProfile,
  saveUserProfile: session.saveUserProfile,

  // Stats
  getStats: stats.getStats,
  updateStats: stats.updateStats,
  checkLoginStreak: stats.checkLoginStreak,
  logStudyTime: stats.logStudyTime,

  // Notes
  getNotes: notes.getNotes,
  saveNote: notes.saveNote,
  saveNotes: notes.saveNotes,
  deleteNote: notes.deleteNote,
  getCanvasElements: notes.getCanvasElements,
  saveCanvasElements: notes.saveCanvasElements,
  publishNote: notes.publishNote,
  unpublishNote: notes.unpublishNote,

  // Summaries
  getSummaries: summaries.getSummaries,
  saveSummaries: summaries.saveSummaries,
  deleteSummary: summaries.deleteSummary,

  // Folders
  getFolders: folders.getFolders,
  saveFolder: folders.saveFolder,
  saveFolders: folders.saveFolders,
  deleteFolder: folders.deleteFolder,

  // Queue, tasks, quizzes, custom modes
  loadCollection: collections.loadCollection,
  getQueue: collections.getQueue,
  saveQueue: collections.saveQueue,
  getTasks: collections.getTasks,
  saveTasks: collections.saveTasks,
  getQuizzes: collections.getQuizzes,
  saveQuiz: collections.saveQuiz,
  saveCustomMode: collections.saveCustomMode,
  getCustomModes: collections.getCustomModes,
  deleteCustomMode: collections.deleteCustomMode,

  // Classrooms
  getClassrooms: classrooms.getClassrooms,
  saveClassroom: classrooms.saveClassroom,
  deleteClassroom: classrooms.deleteClassroom,
  getInvitations: classrooms.getInvitations,
  sendInvitation: classrooms.sendInvitation,
  updateInvitationStatus: classrooms.updateInvitationStatus,
  getAnnouncements: classrooms.getAnnouncements,
  saveAnnouncement: classrooms.saveAnnouncement,
  deleteAnnouncement: classrooms.deleteAnnouncement,
  getClassroomResources: classrooms.getClassroomResources,
  shareResource: classrooms.shareResource,
  unshareResource: classrooms.unshareResource,
  getTeacherStats: classrooms.getTeacherStats,

  // Achievements
  getAchievements: achievements.getAchievements,
  saveAchievement: achievements.saveAchievement,
  unlockAchievement: achievements.unlockAchievement,
};

/** Standalone helpers kept for existing call sites. */
export const saveQuiz = async (quiz: Quiz) => collections.saveQuiz(quiz);
export const getQuizzes = async (_userId?: string): Promise<Quiz[]> =>
  collections.getQuizzes();
