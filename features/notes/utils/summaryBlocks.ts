import type { Block, Flashcard, Summary } from '../../../types';

/**
 * Turns a summary (plus its flashcards) into document blocks so it can be
 * appended to a note from the Summarizer.
 */
export function buildSummaryBlocks(summary: Summary, flashcards: Flashcard[]): Block[] {
  const stamp = Date.now();
  const blocks: Block[] = [
    {
      id: `${stamp}-h1`,
      type: 'h1',
      content: `Summary: ${new Date().toLocaleDateString()}`,
    },
    {
      id: `${stamp}-text`,
      type: 'text',
      content: summary.summaryText.replace(/\n/g, '<br />'),
    },
  ];

  if (flashcards.length === 0) return blocks;

  blocks.push({
    id: `${stamp}-fc-h2`,
    type: 'h2',
    content: 'Flashcards (Key Learning Concepts)',
  });

  flashcards.forEach((card, index) => {
    blocks.push(
      { id: `${stamp}-fc-${index}-q`, type: 'h3', content: card.front },
      { id: `${stamp}-fc-${index}-a`, type: 'text', content: card.back },
      { id: `${stamp}-fc-${index}-d`, type: 'text', content: '' },
    );
  });

  return blocks;
}

/** Visual break inserted between an existing document and appended content. */
export function createSeparatorBlock(): Block {
  return { id: `${Date.now()}-sep`, type: 'text', content: '<br/>---<br/>' };
}
