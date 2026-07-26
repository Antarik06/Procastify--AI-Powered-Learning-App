/**
 * Kept as the public entry point for persistence.
 * The implementation now lives in `services/storage/*`, one module per domain
 * (session, stats, notes, summaries, folders, collections, classrooms,
 * achievements).
 */
export * from './storage';
