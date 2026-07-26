/** Summarisation, flashcards and short-form learning content. */
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

export const summarizeContent = async (
  textContext: string,
  attachments: Attachment[],
  mode: string,
  customPrompt?: string,
  userId?: string
): Promise<string> => {
  try {
    // Rate limiting
    const identifier = userId || 'anonymous';
    if (apiRateLimiter.isLimited(identifier)) {
      logger.logRateLimitViolation(identifier, '/summarize');
      throw new APIError('Rate limit exceeded. Please try again later.', 429);
    }

    // Input validation. Text is optional when attachments are supplied, so only
    // validate it when the user actually typed something.
    if (textContext) {
      const textValidation = validateUserInput(textContext, 'text');
      if (!textValidation.valid) {
        logger.logValidationError('textContext', textValidation.errors.join(', '));
        throw new APIError('Invalid text input', 400);
      }
    } else if (attachments.length === 0) {
      throw new APIError('Provide text or at least one attachment to summarize', 400);
    }

    // Sanitize inputs
    const sanitizedText = sanitizeContent(textContext, 30000);
    const sanitizedMode = validateUserInput(mode, 'text').sanitized;
    const sanitizedPrompt = customPrompt ? sanitizeContent(customPrompt, 5000) : undefined;

    if (!sanitizedText && attachments.length === 0) {
      throw new APIError('Provide text or at least one attachment to summarize', 400);
    }

    const ai = getAI();

    // 1. Normalize and extract content from all inputs
    const preparation = await prepareTextForSummarization(sanitizedText, attachments);

    if (!preparation) {
      return "Please enter text or add valid attachments to summarize.";
    }

    const { combinedText, failedExtractions, mediaAttachments } = preparation;

    // Inform user about any failed extractions
    let warningText = "";
    if (failedExtractions.length > 0) {
      logger.log(`Failed to process attachments: ${failedExtractions.join(', ')}`, 'EXTRACTION', 'WARNING' as any);
      warningText = `\n\n⚠️ Note: Some files could not be processed (${failedExtractions.join(', ')}). The summary includes only successfully processed content.`;
    }

    let systemPrompt = "";
    
    // If a custom prompt is provided, validate and use it
    if (sanitizedPrompt) {
      systemPrompt = sanitizedPrompt;
    } else {
      // Use predefined modes
      switch (sanitizedMode) {
        case 'eli5': systemPrompt = "Explain this content like I'm 5 years old. Use simple analogies."; break;
        case 'exam': systemPrompt = "Summarize for exam prep. Focus on definitions, dates, formulas, and key concepts. Use structured bullet points."; break;
        case 'detailed': systemPrompt = "Provide a comprehensive, detailed summary with examples."; break;
        case 'short': default: systemPrompt = "Concise key points only. Bullet points."; break;
      }
    }

    const parts: any[] = [];

    if (combinedText) {
      parts.push({ text: `Content to summarize:\n${combinedText}` });
    }

    // Images and audio can't be extracted locally - hand them to the model directly.
    for (const media of mediaAttachments) {
      parts.push({
        inlineData: {
          mimeType: media.mimeType || (media.type === 'image' ? 'image/png' : 'audio/webm'),
          data: media.content
        }
      });
    }

    if (parts.length === 0) {
      return "Please enter text or add valid attachments to summarize.";
    }

    // Text-only requests can use the faster text model; anything with media
    // needs the multimodal one.
    const model = mediaAttachments.length > 0 ? MODEL_MULTIMODAL : MODEL_TEXT;

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction: systemPrompt
      }
    });

    if (!response || !response.text) {
      throw new APIError('Failed to generate summary', 500);
    }

    logger.log(`Summarize completed`, 'API', 'INFO' as any, { userId, mode: sanitizedMode });
    return response.text + warningText;
  } catch (error: any) {
    const clientMessage = getClientErrorMessage(error);
    logger.logAPIError('/summarize', error, userId);

    if (error instanceof APIError) {
      return error.message;
    }

    if (error.status === 'RESOURCE_EXHAUSTED' || error.code === 429) {
      return "Rate limited. Please try again in a moment.";
    }

    return clientMessage;
  }
};




export const generateFlashcards = async (content: string, userId?: string): Promise<Flashcard[]> => {
  try {
    // Rate limiting
    const identifier = userId || 'anonymous';
    if (apiRateLimiter.isLimited(identifier)) {
      logger.logRateLimitViolation(identifier, '/generateFlashcards');
      return [];
    }

    // Input validation
    const validation = validateUserInput(content, 'text');
    if (!validation.valid) {
      logger.logValidationError('content', validation.errors.join(', '));
      return [];
    }

    const sanitizedContent = sanitizeContent(content, 15000);
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [
        { text: "Extract 5-8 key learning chunks, definitions, or core concepts from the content below.\nReturn JSON array with 'front' (The Concept/Term) and 'back' (The Definition/Explanation/Detail).\nDo NOT create questions. Create knowledge pairings that directly reflect the summary.\n\nCONTENT TO PROCESS:" },
        { text: sanitizedContent }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              front: { type: Type.STRING, description: "The concept, term, or headline" },
              back: { type: Type.STRING, description: "The explanation, definition, or key fact" },
              status: { type: Type.STRING, enum: ['new'] }
            }
          }
        }
      }
    });

    if (!response || !response.text) return [];

    const cards = safeJSONParse(response.text, []);
    if (!Array.isArray(cards)) return [];

    logger.log(`Generated ${cards.length} flashcards`, 'API', 'INFO' as any, { userId });
    return cards.map((c: any) => ({ ...c, id: Math.random().toString(36).substr(2, 9), status: 'new' }));
  } catch (error) {
    logger.logAPIError('/generateFlashcards', error, userId);
    return [];
  }
};




export const generateReels = async (content: string): Promise<string[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [
        { text: "Extract exactly 5 engaging, short, standalone learning points (under 50 words each) from this text.\nFocus on 'Did you know?' style facts, key insights, or quick definitions.\nReturn JSON array of strings.\n\nCONTENT:" },
        { text: content.substring(0, 15000) }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    if (!response || !response.text) return [];

    const reels = safeJSONParse<string[]>(response.text, []);
    // Enforce exactly 5 if possible, or at least slice if too many. LLM usually obeys schema.
    return Array.isArray(reels) ? reels.slice(0, 5) : [];
  } catch (error) {
    console.error("Reel Gen Error:", error);
    return [];
  }
};

