/** Note analysis and the notes chatbot. */
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
import type { ChatResponse, NoteChatContext } from '../../types';
import {
  buildContextPrompt,
  getSystemPrompt,
  trimContextToFit,
} from '../noteChatbotService';


export const analyzeNoteWorkload = async (noteContent: string, userId?: string): Promise<Note['aiAnalysis']> => {
  try {
    // Rate limiting
    const identifier = userId || 'anonymous';
    if (apiRateLimiter.isLimited(identifier)) {
      logger.logRateLimitViolation(identifier, '/analyzeNoteWorkload');
      return {
        difficulty: 'medium',
        estimatedMinutes: 30,
        cognitiveLoad: 'medium',
        summary: 'Rate limited. Please try again later.'
      };
    }

    // Input validation and sanitization
    const validation = validateUserInput(noteContent, 'text');
    if (!validation.valid) {
      logger.logValidationError('noteContent', validation.errors.join(', '));
      return {
        difficulty: 'medium',
        estimatedMinutes: 30,
        cognitiveLoad: 'medium',
        summary: 'Invalid input format.'
      };
    }

    const sanitizedContent = sanitizeContent(noteContent, 10000);

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: `Analyze this study material. Estimate the difficulty, time required to study it effectively, and cognitive load. Return JSON.
      Material: ${sanitizedContent}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] },
            estimatedMinutes: { type: Type.NUMBER },
            cognitiveLoad: { type: Type.STRING, enum: ['light', 'medium', 'heavy'] },
            summary: { type: Type.STRING }
          }
        }
      }
    });

    if (!response || !response.text) throw new APIError('No response from AI', 500);

    const result = safeJSONParse<NonNullable<Note['aiAnalysis']>>(response.text, {
      difficulty: 'medium',
      estimatedMinutes: 30,
      cognitiveLoad: 'medium',
      summary: 'Analysis completed'
    });

    logger.log(`Note analysis completed`, 'API', 'INFO' as any, { userId });
    return result;
  } catch (error: any) {
    logger.logAPIError('/analyzeNoteWorkload', error, userId);

    return {
      difficulty: 'medium',
      estimatedMinutes: 30,
      cognitiveLoad: 'medium',
      summary: 'Analysis failed. Please try again.'
    };
  }
};




/**
 * Chat with AI using notes as context
 * Implements source-grounded Q&A to minimize hallucinations
 */
export const chatWithNoteContext = async (
  query: string,
  noteContexts: NoteChatContext[],
  selectedNoteId?: string,
  userId?: string
): Promise<ChatResponse> => {
  try {
    // Rate limiting
    const identifier = userId || 'anonymous';
    if (apiRateLimiter.isLimited(identifier)) {
      logger.logRateLimitViolation(identifier, '/notechat');
      return {
        answer: 'Rate limit exceeded. Please try again in a moment.',
        sourceNoteIds: [],
        confidence: 'not_found'
      };
    }

    // Input validation
    const queryValidation = validateUserInput(query, 'text');
    if (!queryValidation.valid) {
      logger.logValidationError('chatQuery', queryValidation.errors.join(', '));
      return {
        answer: 'Invalid question format.',
        sourceNoteIds: [],
        confidence: 'not_found'
      };
    }

    const sanitizedQuery = sanitizeContent(query, 2000);

    if (!sanitizedQuery.trim()) {
      return {
        answer: 'Please enter a question.',
        sourceNoteIds: [],
        confidence: 'not_found'
      };
    }

    // Trim context to fit token limits
    const trimmedContexts = trimContextToFit(noteContexts, 8000);

    if (trimmedContexts.length === 0) {
      return {
        answer: "I don't have any notes to reference. Please create some notes first, or select a specific note to ask questions about.",
        sourceNoteIds: [],
        confidence: 'not_found'
      };
    }

    const hasSelectedNote = !!selectedNoteId;
    const systemPrompt = getSystemPrompt(hasSelectedNote);
    const contextPrompt = buildContextPrompt(trimmedContexts);

    const ai = getAI();

    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [
        {
          text: `${systemPrompt}

USER'S NOTES:
${contextPrompt}

USER'S QUESTION: ${sanitizedQuery}

Respond with a JSON object containing:
- "answer": Your response grounded in the notes (string)
- "sourceNoteIds": Array of note IDs you referenced (array of strings)
- "confidence": How confident you are the answer is in the notes - "high", "medium", "low", or "not_found" if info isn't in notes`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { 
              type: Type.STRING, 
              description: "The response grounded in the user's notes" 
            },
            sourceNoteIds: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "IDs of notes referenced in the answer"
            },
            confidence: { 
              type: Type.STRING, 
              enum: ["high", "medium", "low", "not_found"],
              description: "Confidence that the answer is from the notes"
            }
          },
          required: ["answer", "sourceNoteIds", "confidence"]
        }
      }
    });

    if (!response || !response.text) {
      throw new Error("No response generated");
    }

    const result = safeJSONParse<ChatResponse>(response.text, {
      answer: "I couldn't process your question. Please try rephrasing it.",
      sourceNoteIds: [],
      confidence: 'not_found'
    });

    logger.log(`Note chat completed`, 'API', 'INFO' as any, { userId, confidence: result.confidence });

    return result;

  } catch (error: any) {
    logger.logAPIError('/notechat', error, userId);

    if (error.status === 'RESOURCE_EXHAUSTED' || error.code === 429) {
      return {
        answer: "Rate limited. Please try again in a moment.",
        sourceNoteIds: [],
        confidence: 'not_found'
      };
    }

    return {
      answer: "Sorry, I encountered an error processing your question. Please try again.",
      sourceNoteIds: [],
      confidence: 'not_found'
    };
  }
};
