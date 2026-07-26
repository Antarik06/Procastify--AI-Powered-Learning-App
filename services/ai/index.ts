/**
 * Gemini-backed AI services, grouped by domain.
 *
 * `services/geminiService.ts` re-exports this barrel, so existing imports keep
 * working while new code can depend on a single area (e.g. `services/ai/quiz`).
 */
export { getAI, MODEL_TEXT, MODEL_MULTIMODAL, MODEL_TTS } from './client';
export { cleanJSON, safeJSONParse } from './json';

export * from './summaries';
export * from './notes';
export * from './routine';
export * from './quiz';
export * from './speech';
