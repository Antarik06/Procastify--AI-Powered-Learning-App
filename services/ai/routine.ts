/** Routine planning and panic-mode decomposition. */
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

export const generateAdaptiveRoutine = async (
  queue: QueueItem[],
  notes: Note[],
  prefs: UserPreferences
): Promise<{ tasks: RoutineTask[], projection: string, confidence: 'high' | 'medium' | 'low' }> => {
  const ai = getAI();


  const queueContext = queue.map(q => {
    const note = notes.find(n => n.id === q.noteId);
    return {
      title: note?.title || 'Unknown Note',
      priority: q.priority,
      estimatedMinutes: note?.aiAnalysis?.estimatedMinutes || 30,
      difficulty: note?.aiAnalysis?.difficulty || 'medium'
    };
  });

  const prompt = `
    Create a REALISTIC study routine.
    User Profile: ${prefs.freeTimeHours}h free, Peak Energy: ${prefs.energyPeak}, Distraction Level: ${prefs.distractionLevel}.
    
    Tasks to schedule: ${JSON.stringify(queueContext)}.
    
    Rules:
    1. Do NOT schedule back-to-back heavy tasks.
    2. Include "Procastify Breaks" (guilt-free 10-15m) after difficult blocks.
    3. Include "Chill Breaks" (5-8m) after lighter blocks.
    4. Leave a buffer at the end of the day.
    5. If total time exceeds free time, only schedule what is realistic and prioritize High priority items.
    
    Return JSON with tasks, a short text projection (e.g., "You'll likely finish Note A and B today"), and a confidence score.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  durationMinutes: { type: Type.NUMBER },
                  type: { type: Type.STRING, enum: ["focus", "break", "procastify", "buffer"] },
                  completed: { type: Type.BOOLEAN },
                  noteId: { type: Type.STRING, nullable: true },
                  confidence: { type: Type.STRING, enum: ["high", "medium", "low"] }
                }
              }
            },
            projection: { type: Type.STRING },
            confidence: { type: Type.STRING, enum: ["high", "medium", "low"] }
          }
        }
      }
    });

    if (!response || !response.text) throw new Error("Empty response");

    const fallback: { tasks: RoutineTask[], projection: string, confidence: 'high' | 'medium' | 'low' } = {
      tasks: [],
      projection: "Failed to parse routine.",
      confidence: 'low'
    };

    const data = safeJSONParse(response.text, fallback);


    if (data.tasks && Array.isArray(data.tasks)) {
      data.tasks = data.tasks.map((t: any) => ({ ...t, id: Math.random().toString(36).substr(2, 9), completed: false }));
    } else {
      data.tasks = [];
    }
    return data;
  } catch (error) {
    console.error("Routine Gen Error", error);
    return {
      tasks: [],
      projection: "Could not generate routine. Try adding items to your queue.",
      confidence: 'low'
    };
  }
};





export const generateRoutine = async (prefs: UserPreferences): Promise<RoutineTask[]> => {
  return []; // Deprecated
};

export const generatePanicDecomposition = async (
  currentTasks: RoutineTask[]
): Promise<RoutineTask[]> => {
  const ai = getAI();

  // Filter only incomplete tasks to process
  const pendingTasks = currentTasks.filter(t => !t.completed && t.type === 'focus');
  if (pendingTasks.length === 0) return [];

  const prompt = `
    PANIC MODE ACTIVATED. The user is overwhelmed and procrastinating.
    Take these daunting tasks and break them into TINY, laughable, 2-minute micro-steps to build momentum.
    
    Current Tasks: ${JSON.stringify(pendingTasks.map(t => t.title))}
    
    Rules:
    1. Break each task into 3-5 micro-steps.
    2. Steps must be ridiculously easy (e.g., "Open the book", "Read one paragraph").
    3. Duration for each should be 2-5 minutes.
    4. Keep the original ID as 'parentId' if possible, or just create new IDs.
    5. Return a flat list of these new micro-tasks.
    
    Return JSON array of RoutineTask objects.
    `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              durationMinutes: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ['focus'] },
              completed: { type: Type.BOOLEAN },
              confidence: { type: Type.STRING, enum: ['high'] }
            }
          }
        }
      }
    });

    if (!response || !response.text) return [];
    const newTasks = safeJSONParse<any[]>(response.text, []);

    return newTasks.map(t => ({
      ...t,
      id: `panic_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      completed: false,
      type: 'focus',
      confidence: 'high'
    }));

  } catch (e) {
    console.error("Panic Gen Error", e);
    return [];
  }
};
