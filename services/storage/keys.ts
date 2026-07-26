/** localStorage keys. Guest mode and offline caches both read through these. */
export const LOCAL_KEYS = {
  USER_SESSION: 'procastify_session',
  USERS_DB: 'procastify_users_db',
  STATS: 'procastify_stats',
  NOTES: 'procastify_notes',
  SUMMARIES: 'procastify_summaries',
  QUEUE: 'procastify_queue',
  TASKS: 'procastify_tasks',
  QUIZZES: 'procastify_quizzes',
  CUSTOM_MODES: 'procastify_custom_modes',
  FOLDERS: 'procastify_folders',
  ACHIEVEMENTS: 'procastify_achievements',
} as const;

/** Per-note canvas cache key. */
export const canvasKey = (noteId: string) => `procastify_canvas_${noteId}`;
