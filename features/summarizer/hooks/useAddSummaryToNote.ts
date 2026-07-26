import { useCallback } from 'react';
import { useSession, useWorkspace } from '../../../app/providers';
import { useToast } from '../../../components/ui';
import { createNote } from '../../notes/utils/createNote';
import { buildSummaryBlocks, createSeparatorBlock } from '../../notes/utils/summaryBlocks';
import type { Flashcard, Summary } from '../../../types';

/**
 * Appends a summary (and its flashcards) to an existing note, or creates a new
 * note when `noteId` is null. Used by the Summarizer's "add to note" action.
 */
export function useAddSummaryToNote() {
  const { user } = useSession();
  const { notes, saveNote, refreshStats } = useWorkspace();
  const toast = useToast();

  return useCallback(
    async (noteId: string | null, summary: Summary, flashcards: Flashcard[]) => {
      if (!user) return;

      const blocks = buildSummaryBlocks(summary, flashcards);

      if (noteId === null) {
        const note = createNote({
          userId: user.id,
          title: `Summary: ${new Date().toLocaleDateString()}`,
          blocks,
        });
        note.folder = 'Summaries';

        await saveNote(note);
        await refreshStats();
        toast.success('Note created', 'Your summary is saved in My Notes.');
        return;
      }

      const target = notes.find((note) => note.id === noteId);
      if (!target) {
        toast.error("Couldn't find that note", 'It may have been deleted.');
        return;
      }

      await saveNote({
        ...target,
        document: {
          blocks: [...(target.document?.blocks || []), createSeparatorBlock(), ...blocks],
        },
        lastModified: Date.now(),
      });

      toast.success('Added to note', target.title);
    },
    [user, notes, saveNote, refreshStats, toast],
  );
}
