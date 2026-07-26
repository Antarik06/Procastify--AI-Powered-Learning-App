/** Every screen the app shell can render. */
export type ViewState =
  | 'landing'
  | 'onboarding'
  | 'roleSelection'
  | 'dashboard'
  | 'summarizer'
  | 'notes'
  | 'routine'
  | 'focus'
  | 'quiz'
  | 'feed'
  | 'store'
  | 'auth'
  | 'classrooms'
  | 'classroomDetail'
  | 'studentClassrooms'
  | 'studentClassroomView'
  | 'workflow'
  | 'examTracker';

/** Views reachable from the sidebar plus the pseudo-view used for folders. */
export type AppView = ViewState | 'folders';
