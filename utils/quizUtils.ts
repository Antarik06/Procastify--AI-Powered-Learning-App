import { Question, FillInTheBlanksQuestion, ExplainQuestion, QuizModeType, TimerConfig } from '../types';

// Type guards
export function isFillBlanksQuestion(question: Question): question is FillInTheBlanksQuestion {
  return question.mode === 'fillBlanks';
}

export function isExplainQuestion(question: Question): question is ExplainQuestion {
  return question.mode === 'explain';
}

export function isStandardQuestion(question: Question): boolean {
  return !question.mode || question.mode === 'standard';
}

export function isSwipeQuestion(question: Question): boolean {
  return question.mode === 'swipe';
}

// Default timer configurations per mode
export const DEFAULT_TIMER_CONFIG: Record<QuizModeType, TimerConfig> = {
  standard: { enabled: true, duration: 30 },
  swipe: { enabled: false, duration: 15 },
  fillBlanks: { enabled: false, duration: 45 },
  explain: { enabled: false, duration: 90 },
};

// Fuzzy string matching for Fill in the Blanks
export function fuzzyMatch(userAnswer: string, correctAnswers: string[]): boolean {
  const normalizedUser = userAnswer.trim().toLowerCase();
  
  // Check exact matches first
  for (const correct of correctAnswers) {
    const normalizedCorrect = correct.trim().toLowerCase();
    if (normalizedUser === normalizedCorrect) {
      return true;
    }
  }
  
  // Check with Levenshtein distance for typos
  for (const correct of correctAnswers) {
    const normalizedCorrect = correct.trim().toLowerCase();
    const distance = levenshteinDistance(normalizedUser, normalizedCorrect);
    const maxAllowedDistance = Math.max(1, Math.floor(normalizedCorrect.length * 0.15)); // Allow 15% error
    
    if (distance <= maxAllowedDistance) {
      return true;
    }
  }
  
  return false;
}

// Levenshtein distance algorithm for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

// Parse text with blanks and create input positions
export function parseTextWithBlanks(textWithBlanks: string): {
  parts: { text: string; isBlank: boolean; blankId?: string }[];
} {
  const parts: { text: string; isBlank: boolean; blankId?: string }[] = [];
  const regex = /\[___\]/g;
  let lastIndex = 0;
  let match;
  let blankIndex = 0;

  while ((match = regex.exec(textWithBlanks)) !== null) {
    // Add text before blank
    if (match.index > lastIndex) {
      parts.push({
        text: textWithBlanks.substring(lastIndex, match.index),
        isBlank: false,
      });
    }

    // Add blank
    parts.push({
      text: '',
      isBlank: true,
      blankId: `blank-${blankIndex}`,
    });

    lastIndex = match.index + match[0].length;
    blankIndex++;
  }

  // Add remaining text
  if (lastIndex < textWithBlanks.length) {
    parts.push({
      text: textWithBlanks.substring(lastIndex),
      isBlank: false,
    });
  }

  return { parts };
}

// Calculate score for Fill in the Blanks
export function calculateFillBlanksScore(
  correctCount: number,
  totalBlanks: number,
  allCorrect: boolean,
  timeRemaining: number,
  streak: number,
  timerEnabled: boolean
): number {
  let score = 0;
  
  // Base points per blank
  score += correctCount * 20;
  
  // All correct bonus
  if (allCorrect && totalBlanks > 0) {
    score += 50;
  }
  
  // Timer bonus
  if (timerEnabled && timeRemaining > 0) {
    score += Math.floor(timeRemaining * 2);
  }
  
  // Streak bonus
  score += Math.min(streak * 10, 50);
  
  return score;
}

// Calculate score for Explain Your Answer
export function calculateExplainScore(
  answerCorrect: boolean,
  reasoningScore: number,
  timeRemaining: number,
  streak: number,
  timerEnabled: boolean
): number {
  let score = 0;
  
  // Answer points
  if (answerCorrect) {
    score += 50;
  }
  
  // Reasoning points (0-50 based on 1-5 scale)
  score += reasoningScore * 10;
  
  // Timer bonus
  if (timerEnabled && timeRemaining > 0) {
    score += Math.floor(timeRemaining * 2);
  }
  
  // Streak bonus
  score += Math.min(streak * 10, 50);
  
  return score;
}
