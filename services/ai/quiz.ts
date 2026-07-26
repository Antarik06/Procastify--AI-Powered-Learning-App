/** Quiz generation, grading and reporting across every quiz mode. */
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
