import { Note, NoteChatContext, ChatResponse, Block } from '../types';

/**
 * Extracts all text content from a note (document blocks + canvas elements)
 */
export const extractNoteText = (note: Note): string => {
  const textParts: string[] = [];

  // Extract from document blocks
  if (note.document?.blocks) {
    for (const block of note.document.blocks) {
      if (block.content && typeof block.content === 'string') {
        textParts.push(block.content);
      }
    }
  }

  // Extract from canvas elements
  const elements = note.canvas?.elements || note.elements || [];
  for (const element of elements) {
    if (element.content && typeof element.content === 'string') {
      textParts.push(element.content);
    }
  }

  return textParts.join('\n').trim();
};

/**
 * Prepares note context for the chatbot
 */
export const prepareNoteContext = (note: Note): NoteChatContext => {
  return {
    noteId: note.id,
    noteTitle: note.title,
    content: extractNoteText(note)
  };
};

/**
 * Simple keyword-based relevance scoring
 * Returns a score indicating how relevant a note is to a query
 */
const calculateRelevanceScore = (query: string, noteText: string, noteTitle: string): number => {
  const queryLower = query.toLowerCase();
  const textLower = noteText.toLowerCase();
  const titleLower = noteTitle.toLowerCase();

  // Extract query words (remove common stop words)
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'where', 'when', 'how', 'why', 'who', 'which', 'this', 'that', 'these', 'those', 'i', 'my', 'me', 'about', 'did', 'do', 'does', 'from', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const queryWords = queryLower
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  if (queryWords.length === 0) return 0;

  let score = 0;

  // Title matches are weighted heavily
  for (const word of queryWords) {
    if (titleLower.includes(word)) {
      score += 10;
    }
  }

  // Content matches
  for (const word of queryWords) {
    const regex = new RegExp(word, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      score += matches.length;
    }
  }

  // Exact phrase match bonus
  if (textLower.includes(queryLower) || titleLower.includes(queryLower)) {
    score += 20;
  }

  return score;
};

/**
 * Finds the most relevant notes for a given query
 */
export const findRelevantNotes = (
  query: string,
  notes: Note[],
  maxNotes: number = 5
): Note[] => {
  // Score all notes
  const scoredNotes = notes.map(note => {
    const text = extractNoteText(note);
    const score = calculateRelevanceScore(query, text, note.title);
    return { note, score };
  });

  // Sort by score descending and filter out zero-score notes
  const relevant = scoredNotes
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxNotes)
    .map(item => item.note);

  return relevant;
};

/**
 * Builds the context string for the AI prompt
 */
export const buildContextPrompt = (notes: NoteChatContext[]): string => {
  if (notes.length === 0) {
    return 'No notes available.';
  }

  return notes.map((ctx, index) => {
    const truncatedContent = ctx.content.length > 3000 
      ? ctx.content.substring(0, 3000) + '...[truncated]'
      : ctx.content;
    
    return `[Note ${index + 1}: "${ctx.noteTitle}" - ID: ${ctx.noteId}]\n${truncatedContent}`;
  }).join('\n\n---\n\n');
};

/**
 * Formats the system prompt for note-grounded chat
 */
export const getSystemPrompt = (hasSelectedNote: boolean): string => {
  const baseInstructions = `You are a helpful study assistant that answers questions based ONLY on the user's notes.

CRITICAL RULES:
1. ONLY use information from the provided notes to answer questions
2. If the answer is NOT in the notes, clearly say "I couldn't find information about this in your notes"
3. Always cite which note(s) you used by mentioning their titles
4. Be concise but thorough
5. If asked "where did I learn X", identify the specific note title

When citing sources, use this format: "Based on your note '[Note Title]'..."`;

  if (hasSelectedNote) {
    return baseInstructions + `\n\nThe user has selected a specific note to focus on. Answer questions only from that note's content.`;
  }

  return baseInstructions;
};

/**
 * Estimates context size to avoid exceeding token limits
 */
export const estimateTokenCount = (text: string): number => {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
};

/**
 * Trims context to fit within token budget
 */
export const trimContextToFit = (
  contexts: NoteChatContext[],
  maxTokens: number = 8000
): NoteChatContext[] => {
  const result: NoteChatContext[] = [];
  let currentTokens = 0;

  for (const ctx of contexts) {
    const contextTokens = estimateTokenCount(ctx.content + ctx.noteTitle);
    
    if (currentTokens + contextTokens > maxTokens) {
      // Try to include a truncated version
      const remainingTokens = maxTokens - currentTokens;
      if (remainingTokens > 500) {
        const truncatedChars = (remainingTokens - 100) * 4;
        result.push({
          ...ctx,
          content: ctx.content.substring(0, truncatedChars) + '...[truncated]'
        });
      }
      break;
    }

    result.push(ctx);
    currentTokens += contextTokens;
  }

  return result;
};
