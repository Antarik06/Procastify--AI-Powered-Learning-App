import { Note, UserStats, UserPreferences, Quiz } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const apiKey = (import.meta.env as any).VITE_GEMINI_API_KEY || (process.env as any).VITE_GEMINI_API_KEY;
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

const MODEL_TEXT = 'gemini-3-flash-preview';

export type InsightType = 'analysis' | 'motivation' | 'revision' | 'insight' | 'humor' | 'action';
export type UserProfile = 'new' | 'consistent' | 'inconsistent' | 'returning';
export type CTAAction = 
  | { type: 'note'; noteId: string }
  | { type: 'quiz'; noteId?: string }
  | { type: 'focus' }
  | { type: 'create-note' }
  | { type: 'none' };

export interface DashboardInsight {
  welcomeMessage: string;
  insightType: InsightType;
  mainMessage: string;
  ctaLabel: string | null;
  ctaAction: CTAAction;
  recommendedNote: Note | null;
  profile: UserProfile;
}

interface CachedInsight {
  dataHash: string;
  insight: Omit<DashboardInsight, 'recommendedNote'> & { recommendedNoteId: string | null };
  timestamp: number;
}

const CACHE_KEY = 'procastify_ai_insight_cache';

// Generate a hash from user data to detect changes
const generateDataHash = (user: UserPreferences, notes: Note[], stats: UserStats): string => {
  const data = {
    userName: user.name,
    noteCount: notes.length,
    noteIds: notes.map(n => n.id).sort().join(','),
    noteTitles: notes.map(n => n.title).sort().join('|'),
    streak: stats.loginStreak,
    quizzesTaken: stats.quizzesTaken,
    totalMinutes: stats.totalTimeStudiedMinutes,
    highScore: stats.highScore,
  };
  let hash = 0;
  const str = JSON.stringify(data);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
};

const getCachedInsight = (): CachedInsight | null => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
};

const setCachedInsight = (dataHash: string, insight: DashboardInsight): void => {
  try {
    const cached: CachedInsight = {
      dataHash,
      insight: {
        welcomeMessage: insight.welcomeMessage,
        insightType: insight.insightType,
        mainMessage: insight.mainMessage,
        ctaLabel: insight.ctaLabel,
        ctaAction: insight.ctaAction,
        profile: insight.profile,
        recommendedNoteId: insight.recommendedNote?.id || null,
      },
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch { /* ignore */ }
};

const clearCache = (): void => {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
};

const detectUserProfile = (stats: UserStats, notes: Note[]): UserProfile => {
  const hasNotes = notes.length > 0;
  const hasQuizHistory = stats.quizzesTaken > 0;
  const hasStreak = stats.loginStreak > 1;
  const hasStudyTime = stats.totalTimeStudiedMinutes > 0;
  
  const recentActivityDays = Object.keys(stats.dailyActivity).filter(key => {
    const daysDiff = (Date.now() - new Date(key).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  }).length;

  if (!hasNotes && !hasQuizHistory && stats.totalTimeStudiedMinutes < 30) return 'new';
  if (hasStreak && recentActivityDays >= 3 && (hasQuizHistory || hasStudyTime)) return 'consistent';
  
  const today = new Date().toISOString().split('T')[0];
  if (!hasStreak && stats.dailyActivity[today] > 0 && (hasNotes || hasQuizHistory)) return 'returning';
  if (notes.length > 0 || hasQuizHistory) return 'inconsistent';
  
  return 'new';
};

interface NoteWithPriority { note: Note; priority: number; reason: string; }

const prioritizeNotes = (notes: Note[]): NoteWithPriority[] => {
  if (notes.length === 0) return [];
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  return notes.map(note => {
    let priority = 50;
    let reason = 'general review';
    const daysSinceModified = (now - note.lastModified) / dayInMs;

    if (daysSinceModified > 14) { priority += 30; reason = 'not reviewed in 2+ weeks'; }
    else if (daysSinceModified > 7) { priority += 20; reason = 'not reviewed in a week'; }
    else if (daysSinceModified > 3) { priority += 10; reason = 'due for review'; }
    else if (daysSinceModified < 1) { priority += 5; reason = 'recently created'; }

    if (note.aiAnalysis?.difficulty === 'hard') { priority += 15; reason = 'challenging material'; }
    if (note.aiAnalysis?.cognitiveLoad === 'heavy') priority += 10;

    const hasContent = (note.document?.blocks?.length || 0) > 3 || (note.canvas?.elements?.length || 0) > 0;
    if (hasContent) priority += 5;

    return { note, priority, reason };
  }).sort((a, b) => b.priority - a.priority);
};

const determineCTA = (profile: UserProfile, topNote: NoteWithPriority | undefined): { label: string; action: CTAAction } => {
  if (profile === 'new' || !topNote) {
    return { label: 'Create Note', action: { type: 'create-note' } };
  }
  
  const actions: Record<UserProfile, { label: string; action: CTAAction }[]> = {
    new: [{ label: 'Create Note', action: { type: 'create-note' } }],
    consistent: [
      { label: 'Start Review', action: { type: 'note', noteId: topNote.note.id } },
      { label: 'Take Quiz', action: { type: 'quiz', noteId: topNote.note.id } },
    ],
    inconsistent: [
      { label: 'Quick Review', action: { type: 'note', noteId: topNote.note.id } },
      { label: 'Focus Session', action: { type: 'focus' } },
    ],
    returning: [
      { label: 'Continue Learning', action: { type: 'note', noteId: topNote.note.id } },
    ],
  };
  
  const options = actions[profile];
  return options[Math.floor(Math.random() * options.length)];
};

const generateAIInsight = async (
  user: UserPreferences,
  notes: Note[],
  stats: UserStats,
  profile: UserProfile,
  topNote: NoteWithPriority | undefined
): Promise<{ welcomeMessage: string; mainMessage: string; insightType: InsightType }> => {
  const ai = getAI();
  
  const context = {
    userName: user.name || 'there',
    profile,
    streak: stats.loginStreak,
    quizzesTaken: stats.quizzesTaken,
    totalNotes: notes.length,
    totalStudyMinutes: stats.totalTimeStudiedMinutes,
    highScore: stats.highScore,
    recommendedNote: topNote ? {
      title: topNote.note.title,
      reason: topNote.reason,
      daysSinceModified: Math.floor((Date.now() - topNote.note.lastModified) / (24 * 60 * 60 * 1000)),
    } : null,
  };

  const prompt = `You are a friendly, intelligent learning assistant for a study app called Procastify.
Generate a personalized dashboard message for this user.

User Context:
- Name: ${context.userName}
- Profile Type: ${context.profile} (new = just started, consistent = active streak, inconsistent = returning after break, returning = came back today)
- Login Streak: ${context.streak} days
- Total Notes: ${context.totalNotes}
- Quizzes Taken: ${context.quizzesTaken}
- Total Study Time: ${context.totalStudyMinutes} minutes
- High Score: ${context.highScore}
${context.recommendedNote ? `- Recommended Note: "${context.recommendedNote.title}" (${context.recommendedNote.reason}, last touched ${context.recommendedNote.daysSinceModified} days ago)` : '- No notes yet'}

Generate a response with:
1. welcomeMessage: A short, warm greeting (5 words max, can reference their name or streak)
2. mainMessage: 1-2 sentences of personalized insight/motivation. Reference actual data like their streak, note title, study time. Be encouraging but natural, not robotic. Vary between analytical insights, motivational nudges, spaced-repetition reminders, or occasional light humor.
3. insightType: One of: analysis, motivation, revision, insight, humor, action

Guidelines:
- For "new" users: Encourage starting, highlight app features
- For "consistent" users: Celebrate streak, suggest specific note review or quiz
- For "inconsistent" users: Be gentle, no guilt, suggest small wins
- For "returning" users: Welcome back warmly, encourage fresh start
- Keep it conversational, not formal
- Reference the specific recommended note if available`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            welcomeMessage: { type: Type.STRING },
            mainMessage: { type: Type.STRING },
            insightType: { type: Type.STRING, enum: ['analysis', 'motivation', 'revision', 'insight', 'humor', 'action'] },
          },
          required: ['welcomeMessage', 'mainMessage', 'insightType'],
        },
      },
    });

    if (response?.text) {
      const parsed = JSON.parse(response.text);
      return {
        welcomeMessage: parsed.welcomeMessage || 'Welcome!',
        mainMessage: parsed.mainMessage || 'Ready to learn something new?',
        insightType: parsed.insightType || 'motivation',
      };
    }
  } catch (error) {
    console.error('AI insight generation failed:', error);
  }

  // Fallback if AI fails
  return getFallbackInsight(context.userName);
};

const getFallbackInsight = (userName: string): { welcomeMessage: string; mainMessage: string; insightType: InsightType } => {
  return {
    welcomeMessage: `Welcome, ${userName}!`,
    mainMessage: 'Ready to learn something new today?',
    insightType: 'motivation',
  };
};

// Main Export: Synchronous function that returns cached or fallback insight
export const generateDashboardInsight = (
  user: UserPreferences,
  notes: Note[],
  stats: UserStats,
  _quizzes?: Quiz[]
): DashboardInsight => {
  const dataHash = generateDataHash(user, notes, stats);
  const cached = getCachedInsight();
  
  // Return cached insight if data hasn't changed
  if (cached && cached.dataHash === dataHash) {
    const recommendedNote = cached.insight.recommendedNoteId 
      ? notes.find(n => n.id === cached.insight.recommendedNoteId) || null
      : null;
    
    return {
      ...cached.insight,
      recommendedNote,
    };
  }

  clearCache();
  
  const profile = detectUserProfile(stats, notes);
  const prioritizedNotes = prioritizeNotes(notes);
  const topNote = prioritizedNotes[0];
  const { label, action } = determineCTA(profile, topNote);
  const fallback = getFallbackInsight(user.name || 'there');

  return {
    welcomeMessage: fallback.welcomeMessage,
    insightType: fallback.insightType,
    mainMessage: fallback.mainMessage,
    ctaLabel: label,
    ctaAction: action,
    recommendedNote: topNote?.note || null,
    profile,
  };
};

// Async function to fetch AI insight and update cache
export const generateDashboardInsightAsync = async (
  user: UserPreferences,
  notes: Note[],
  stats: UserStats
): Promise<DashboardInsight> => {
  const dataHash = generateDataHash(user, notes, stats);
  const cached = getCachedInsight();
  
  // Return cached if data unchanged
  if (cached && cached.dataHash === dataHash) {
    const recommendedNote = cached.insight.recommendedNoteId 
      ? notes.find(n => n.id === cached.insight.recommendedNoteId) || null
      : null;
    return { ...cached.insight, recommendedNote };
  }

  const profile = detectUserProfile(stats, notes);
  const prioritizedNotes = prioritizeNotes(notes);
  const topNote = prioritizedNotes[0];
  const { label, action } = determineCTA(profile, topNote);

  // Call Gemini AI
  const aiResult = await generateAIInsight(user, notes, stats, profile, topNote);

  const insight: DashboardInsight = {
    welcomeMessage: aiResult.welcomeMessage,
    insightType: aiResult.insightType,
    mainMessage: aiResult.mainMessage,
    ctaLabel: label,
    ctaAction: action,
    recommendedNote: topNote?.note || null,
    profile,
  };

  // Cache the result
  setCachedInsight(dataHash, insight);

  return insight;
};

// Force refresh (clears cache and generates new)
export const refreshDashboardInsight = async (
  user: UserPreferences,
  notes: Note[],
  stats: UserStats
): Promise<DashboardInsight> => {
  clearCache();
  return generateDashboardInsightAsync(user, notes, stats);
};
