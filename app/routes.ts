import { lazy } from 'react';

/**
 * Lazily loaded screens. Only one renders at a time and several pull in heavy
 * dependencies (charts, pdf.js, tiptap, canvas), so keeping them out of the
 * initial bundle matters.
 */
export const routes = {
  Dashboard: lazy(() => import('../features/dashboard')),
  TeacherDashboard: lazy(() => import('../features/classrooms/TeacherDashboardPage')),
  Summarizer: lazy(() => import('../features/summarizer')),
  Notes: lazy(() => import('../features/notes')),
  Folders: lazy(() => import('../features/folders')),
  Routine: lazy(() => import('../features/routine')),
  Focus: lazy(() => import('../features/focus')),
  Quiz: lazy(() => import('../features/quiz')),
  NoteFeed: lazy(() => import('../features/feed')),
  NotesStore: lazy(() => import('../features/store')),
  Classrooms: lazy(() => import('../features/classrooms/ClassroomsPage')),
  ClassroomDetail: lazy(() => import('../features/classrooms/ClassroomDetailPage')),
  StudentClassrooms: lazy(() => import('../features/classrooms/StudentClassroomsPage')),
  StudentClassroomView: lazy(() => import('../features/classrooms/StudentClassroomViewPage')),
  WorkflowBoard: lazy(() =>
    import('../features/workflow').then((module) => ({ default: module.WorkflowBoard })),
  ),
  ExamTracker: lazy(() =>
    import('../features/exam-tracker').then((module) => ({ default: module.ExamTracker })),
  ),
} as const;
