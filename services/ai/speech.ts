/** Text-to-speech generation and playback. */
import { Type, Modality } from '@google/genai';
import type {
  UserPreferences,
  RoutineTask,
  Question,
  Flashcard,
  Note,
  QueueItem,
  Attachment,
  QuizReport,
} from '../../types';
import { apiRateLimiter, searchRateLimiter } from '../rateLimiter';
import { sanitizeContent, validateUserInput, validateJSON } from '../validation';
import logger, { APIError, getClientErrorMessage } from '../securityLogger';
import { prepareTextForSummarization } from '../extractionService';
import { getAI, MODEL_TEXT, MODEL_MULTIMODAL, MODEL_TTS } from './client';
import { cleanJSON, safeJSONParse } from './json';

export const generateSpeech = async (text: string): Promise<string | null> => {
  const ai = getAI();
  try {

    const safeText = text.length > 500 ? text.substring(0, 500) + "..." : text;

    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text: safeText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};



export const playAudioBlob = async (base64Audio: string) => {
  try {
    const audioStr = atob(base64Audio);
    const len = audioStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = audioStr.charCodeAt(i);
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (e) {
    console.error("Audio Playback Error", e);
  }
}
