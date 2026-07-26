import { GoogleGenAI } from '@google/genai';
import { getSecureKey, initializeSecureKeys } from '../secureKeyManager';
import logger, { APIError } from '../securityLogger';

// Keys are decrypted once, on module load.
initializeSecureKeys();

/** Models used across the AI services. */
export const MODEL_TEXT = 'gemini-3-flash-preview';
export const MODEL_MULTIMODAL = 'gemini-2.0-flash-exp';
export const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

/**
 * Creates a Gemini client from the stored key.
 * Throws an APIError (503) when no key is configured, so callers surface a
 * "service unavailable" message rather than a crash.
 */
export const getAI = (): GoogleGenAI => {
  const apiKey = getSecureKey('GEMINI_API_KEY');
  if (!apiKey) {
    logger.logSecurityIncident('Gemini API key not configured', 'WARNING' as any);
    throw new APIError('AI service not configured', 503);
  }
  return new GoogleGenAI({ apiKey });
};
