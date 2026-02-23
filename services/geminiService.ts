import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserPreferences, RoutineTask, Question, Flashcard, Note, QueueItem, Attachment } from '../types';
import { apiRateLimiter, searchRateLimiter } from './rateLimiter';
import { sanitizeContent, validateUserInput, validateJSON } from './validation';
import { getSecureKey, initializeSecureKeys, hasSecureKey } from './secureKeyManager';
import logger, { APIError, getClientErrorMessage } from './securityLogger';

// Initialize secure keys on module load
initializeSecureKeys();
import { UserPreferences, RoutineTask, Question, Flashcard, Note, QueueItem, Attachment, QuizReport } from '../types';

const getAI = () => {
  const apiKey = getSecureKey('GEMINI_API_KEY');
  if (!apiKey) {
    logger.logSecurityIncident('Gemini API key not configured', 'WARNING' as any);
    throw new APIError('AI service not configured', 503);
  }
  return new GoogleGenAI({ apiKey });
};

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_MULTIMODAL = 'gemini-2.0-flash-exp';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';


const cleanJSON = (text: string | undefined): string => {
  if (!text) return "";

  let cleaned = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  return cleaned;
};

const safeJSONParse = <T>(text: string, fallback: T): T => {
  try {
    const cleaned = cleanJSON(text);
    if (!cleaned) return fallback;
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON Parse failed", e);

    if (e instanceof SyntaxError && text.includes('[{')) {
      try {

        const lastRightBracket = text.lastIndexOf(']');
        const lastRightBrace = text.lastIndexOf('}');
        const cutOff = Math.max(lastRightBracket, lastRightBrace);
        if (cutOff > 0) {
          const sub = text.substring(0, cutOff + 1);
          return JSON.parse(cleanJSON(sub));
        }
      } catch (e2) {
        console.warn("Recovery failed", e2);
      }
    }
    return fallback;
  }
}



import { prepareTextForSummarization } from './extractionService';

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

    // Input validation
    const textValidation = validateUserInput(textContext, 'text');
    if (!textValidation.valid) {
      logger.logValidationError('textContext', textValidation.errors.join(', '));
      throw new APIError('Invalid text input', 400);
    }

    // Sanitize inputs
    const sanitizedText = sanitizeContent(textContext, 30000);
    const sanitizedMode = validateUserInput(mode, 'text').sanitized;
    const sanitizedPrompt = customPrompt ? sanitizeContent(customPrompt, 5000) : undefined;

    if (!sanitizedText) {
      throw new APIError('Text input cannot be empty', 400);
    }

    const ai = getAI();

    // 1. Normalize and extract content from all inputs
    const preparation = await prepareTextForSummarization(sanitizedText, attachments);

    if (!preparation) {
      return "Please enter text or add valid attachments to summarize.";
    }

    const finalContent = preparation.combinedText;

    // Inform user about any failed extractions
    let warningText = "";
    if (preparation.failedExtractions.length > 0) {
      logger.log(`Failed to process attachments: ${preparation.failedExtractions.join(', ')}`, 'EXTRACTION', 'WARNING' as any);
      warningText = `\n\n⚠️ Note: Some files could not be processed (${preparation.failedExtractions.join(', ')}). The summary includes only successfully processed content.`;
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
    parts.push({ text: `${systemPrompt}\n\nContent to summarize:\n${finalContent}` });

    const model = 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: model,
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
      model: 'gemini-3-flash-preview',
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

    const result = safeJSONParse(response.text, {
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


export const generateSingleQuestion = async (
  notesContent: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  questionIndex: number = 0
): Promise<Question> => {
  const ai = getAI();
  const safeContent = notesContent.substring(0, 15000); // Match flashcard limit


  let conceptPrompt = "";
  if (difficulty === 'easy') {
    conceptPrompt = "Focus on basic definitions and direct recall. What is X? Which statement defines Y?";
  } else if (difficulty === 'hard') {
    conceptPrompt = "Focus on application and reasoning. How does X relate to Y? Which scenario demonstrates Z?";
  } else {
    conceptPrompt = "Focus on understanding and distinction. What best explains X? Which option correctly describes Y?";
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [
        { text: `Extract 1 key concept from the content below and create a focused multiple choice question about it.\n${conceptPrompt}\nReturn JSON with exactly 4 plausible options.\nDo NOT create trivia questions. Focus on core learning concepts.\n\nCONTENT TO PROCESS:` },
        { text: safeContent }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING, description: "Clear, focused question about one concept" },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "4 plausible options with similar wording"
            },
            correctIndex: { type: Type.INTEGER, description: "Index of correct answer (0-3)" },
            explanation: { type: Type.STRING, description: "Why the correct answer is right" }
          }
        }
      }
    });

    if (!response || !response.text) {
      throw new Error("Empty response from AI");
    }

    const data = safeJSONParse<any>(response.text, null);

    if (!data || !data.text || !Array.isArray(data.options) || data.options.length !== 4 || typeof data.correctIndex !== 'number') {
      throw new Error("Invalid question format from AI");
    }

    return {
      id: data.id || `q_${Date.now()}_${questionIndex}`,
      text: data.text,
      options: data.options,
      correctIndex: data.correctIndex,
      explanation: data.explanation || "No explanation provided"
    };
  } catch (error) {
    console.error("Single Question Gen Error:", error);
    throw error;
  }
};

// ... existing generateQuizFromNotes function ...
export const generateQuizFromNotes = async (
  notesContent: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Question[]> => {
  // ... existing implementation ...
  const ai = getAI();
  const safeContent = notesContent.substring(0, 15000);
  let conceptPrompt = "";
  if (difficulty === 'easy') {
    conceptPrompt = "Focus on basic definitions.";
  } else if (difficulty === 'hard') {
    conceptPrompt = "Focus on application and reasoning.";
  } else {
    conceptPrompt = "Focus on understanding.";
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [
        { text: `Extract 5 key concepts and create multiple choice questions.\n${conceptPrompt}\nReturn JSON array with exactly 4 options per question.` },
        { text: safeContent }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] }
            }
          }
        }
      }
    });

    if (!response || !response.text) return [];
    const data = safeJSONParse<any[]>(response.text, []);
    return data.map((q, i) => ({
      ...q,
      id: q.id || `q_${Date.now()}_${i}`,
      explanation: q.explanation || "No explanation provided",
      difficulty: q.difficulty || difficulty // Fallback to requested difficulty if AI omits it
    }));
  } catch (error) {
    console.error("Quiz Gen Error:", error);
    return [];
  }
};

export const generateTrueFalseQuiz = async (
  notesContent: string
): Promise<Question[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [
        { text: `Extract 5 key facts from the content and create True/False questions.\nSome should be True, some False (balanced mix).\nReturn JSON array.\nOptions MUST be ["True", "False"].` },
        { text: notesContent.substring(0, 15000) }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING, description: "Statement that is either True or False" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Must be exactly ['True', 'False']"
              },
              correctIndex: { type: Type.INTEGER, description: "0 for True, 1 for False" },
              explanation: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (!response || !response.text) return [];
    const data = safeJSONParse<any[]>(response.text, []);
    return data.map((q, i) => ({
      ...q,
      id: `tf_${Date.now()}_${i}`,
      options: ['True', 'False'], // Force standard options
      explanation: q.explanation || ""
    }));
  } catch (e) {
    console.error("TF Quiz Error", e);
    return [];
  }
};


export const generateRoutine = async (prefs: UserPreferences): Promise<RoutineTask[]> => {
  return []; // Deprecated
};


export const generateQuiz = async (note: Note): Promise<Question[]> => {
  // Try document blocks first (new architecture)
  let textContent = '';

  if (note.document?.blocks && note.document.blocks.length > 0) {
    textContent = note.document.blocks
      .map(block => block.content)
      .filter(content => content && content.trim())
      .join('\n\n');
  } else {
    // Fallback to legacy elements
    textContent = (note.elements || [])
      .filter(el => el.type === 'text' && el.content)
      .map(el => el.content)
      .join('\n\n');
  }

  if (!textContent.trim()) {
    throw new Error('No text content found in note to generate quiz from');
  }

  return generateQuizFromNotes(textContent, 'medium');
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

export const generateQuizReport = async (
  attemptedQuestions: Array<{
    question: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    difficulty?: 'easy' | 'medium' | 'hard';
  }>
): Promise<QuizReport> => {
  const ai = getAI();

  const performanceSummary = attemptedQuestions.map((q, i) =>
    `Q${i + 1} (${q.difficulty || 'medium'}): ${q.question.substring(0, 50)}... - ${q.isCorrect ? 'CORRECT' : 'WRONG'}`
  ).join('\n');

  const accuracy = Math.round((attemptedQuestions.filter(q => q.isCorrect).length / attemptedQuestions.length) * 100);
  const difficulties = attemptedQuestions.map(q => q.difficulty || 'medium');

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [
        {
          text: `Analyze this quiz performance and generate a learning report.
Performance Summary:
${performanceSummary}

Return JSON with:
- strengths: array of strings (concepts they know well)
- weaknesses: array of strings (concepts they need to review)
- suggestions: array of strings (actionable advice)
- difficultyProgression: array of 'easy'|'medium'|'hard' matching the questions order (just echo back what I sent effectively, or infer if missing)
- overallAccuracy: number (0-100)

Make the insights personalized. Look for patterns:
- Did they struggle specifically with 'hard' questions?
- Did accuracy improve when difficulty changed?
- Are there specific topics (e.g., definitions vs application) they missed?
Reflect these patterns in the suggestions.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallAccuracy: { type: Type.NUMBER },
            difficultyProgression: { type: Type.ARRAY, items: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] } },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    if (!response || !response.text) throw new Error("No report generated");

    const report = safeJSONParse<QuizReport>(response.text, {
      overallAccuracy: accuracy,
      difficultyProgression: difficulties,
      strengths: ["Completed the quiz"],
      weaknesses: [],
      suggestions: ["Review the questions you missed."]
    });
    
    // Ensure accuracy matches actual calculation if AI drifts
    report.overallAccuracy = accuracy; 
    
    return report;

  } catch (error) {
    console.error("Report Gen Error:", error);
    return {
      overallAccuracy: accuracy,
      difficultyProgression: difficulties,
      strengths: [],
      weaknesses: [],
      suggestions: ["Could not generate detailed AI report. Please review your answers manually."]
    };
  }
};



// Generate Fill in the Blanks Quiz
export const generateFillInTheBlanksQuiz = async (
  notesContent: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<any[]> => {
  const ai = getAI();
  const safeContent = notesContent.substring(0, 15000);

  let conceptPrompt = "";
  if (difficulty === 'easy') {
    conceptPrompt = "Focus on basic terms and simple facts. Create 1-2 blanks per question.";
  } else if (difficulty === 'hard') {
    conceptPrompt = "Focus on complex concepts and relationships. Create 2-3 blanks per question.";
  } else {
    conceptPrompt = "Focus on key concepts and definitions. Create 1-2 blanks per question.";
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [
        { 
          text: `Create 5 fill-in-the-blank questions from the content below.
${conceptPrompt}

For each question:
1. Replace key terms/concepts with [___] placeholder
2. Provide multiple acceptable answers (synonyms, variations, different forms)
3. Include a clear explanation

Example format:
{
  "text": "The capital of France is [___].",
  "textWithBlanks": "The capital of France is [___].",
  "blanks": [
    {
      "id": "blank-0",
      "correctAnswers": ["Paris", "paris"]
    }
  ],
  "explanation": "Paris is the capital and largest city of France."
}

CONTENT TO PROCESS:` 
        },
        { text: safeContent }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING, description: "Original question text" },
              textWithBlanks: { type: Type.STRING, description: "Question with [___] placeholders" },
              blanks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    correctAnswers: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING },
                      description: "Multiple acceptable answers including variations"
                    }
                  }
                }
              },
              explanation: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] }
            }
          }
        }
      }
    });

    if (!response || !response.text) return [];
    
    const data = safeJSONParse<any[]>(response.text, []);
    return data.map((q, i) => ({
      ...q,
      id: q.id || `fb_${Date.now()}_${i}`,
      mode: 'fillBlanks',
      explanation: q.explanation || "No explanation provided",
      difficulty: q.difficulty || difficulty
    }));
  } catch (error) {
    console.error("Fill Blanks Quiz Gen Error:", error);
    return [];
  }
};

// Generate Explain Your Answer Quiz
export const generateExplainQuiz = async (
  notesContent: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Question[]> => {
  const ai = getAI();
  const safeContent = notesContent.substring(0, 15000);

  let conceptPrompt = "";
  if (difficulty === 'easy') {
    conceptPrompt = "Focus on 'why' questions about basic concepts. Questions should test understanding, not just recall.";
  } else if (difficulty === 'hard') {
    conceptPrompt = "Focus on complex reasoning, application, and analysis. Questions should require deep thinking.";
  } else {
    conceptPrompt = "Focus on understanding and reasoning. Questions should require explanation of concepts.";
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [
        { 
          text: `Create 5 multiple choice questions that require reasoning and explanation.
${conceptPrompt}

These questions should:
- Ask "why" or "how" rather than just "what"
- Have 4 plausible options
- Require the student to explain their reasoning
- Test understanding, not just memorization

Return JSON array with standard MCQ format.

CONTENT TO PROCESS:` 
        },
        { text: safeContent }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING, description: "Question that requires reasoning" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "4 plausible options"
              },
              correctIndex: { type: Type.INTEGER, description: "Index of correct answer (0-3)" },
              explanation: { type: Type.STRING, description: "Detailed explanation of why the answer is correct" },
              difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] }
            }
          }
        }
      }
    });

    if (!response || !response.text) return [];
    
    const data = safeJSONParse<any[]>(response.text, []);
    return data.map((q, i) => ({
      ...q,
      id: q.id || `ex_${Date.now()}_${i}`,
      mode: 'explain',
      explanation: q.explanation || "No explanation provided",
      difficulty: q.difficulty || difficulty
    }));
  } catch (error) {
    console.error("Explain Quiz Gen Error:", error);
    return [];
  }
};

// Evaluate student's reasoning for Explain Your Answer mode
export const evaluateReasoning = async (
  question: string,
  correctAnswer: string,
  userAnswer: string,
  userExplanation: string
): Promise<{
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}> => {
  const ai = getAI();

  const answerCorrect = userAnswer === correctAnswer;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [
        {
          text: `Evaluate this student's reasoning for a quiz question.

Question: ${question}
Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}
Student's Explanation: ${userExplanation}

Evaluate the QUALITY OF REASONING (not just answer correctness):
- Logical coherence (does it make sense?)
- Relevance to the question
- Depth of understanding
- Use of evidence or examples

Return a score from 1-5:
1 = No reasoning or completely off-topic
2 = Weak reasoning with major gaps
3 = Adequate reasoning with some understanding
4 = Good reasoning with clear logic
5 = Excellent reasoning with deep understanding

Also provide:
- feedback: Overall assessment (2-3 sentences)
- strengths: What they did well (array of strings)
- improvements: What they could improve (array of strings)

Be encouraging but honest. Even if their answer is wrong, good reasoning should be acknowledged.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "1-5 rating of reasoning quality" },
            feedback: { type: Type.STRING, description: "Overall assessment" },
            strengths: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "What the student did well"
            },
            improvements: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Areas for improvement"
            }
          }
        }
      }
    });

    if (!response || !response.text) {
      throw new Error("No evaluation generated");
    }

    const evaluation = safeJSONParse<any>(response.text, {
      score: 3,
      feedback: "Could not evaluate reasoning automatically.",
      strengths: [],
      improvements: []
    });

    // Ensure score is within valid range
    evaluation.score = Math.max(1, Math.min(5, evaluation.score));

    return evaluation;

  } catch (error) {
    console.error("Reasoning Evaluation Error:", error);
    
    // Fallback evaluation
    return {
      score: answerCorrect ? 3 : 2,
      feedback: "Automatic evaluation unavailable. Your answer has been recorded.",
      strengths: answerCorrect ? ["Selected the correct answer"] : [],
      improvements: ["Try to provide more detailed reasoning in your explanation"]
    };
  }
};

// ============================================
// Notes Chatbot - Source-Grounded AI Chat
// ============================================

import { ChatResponse, NoteChatContext } from '../types';
import { 
  buildContextPrompt, 
  getSystemPrompt,
  trimContextToFit 
} from './noteChatbotService';

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
