import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StorageService } from '../../services/storageService';
import { useSession } from './SessionProvider';
import type { Folder, Note, Summary, UserStats } from '../../types';

interface WorkspaceContextValue {
  notes: Note[];
  summaries: Summary[];
  folders: Folder[];
  stats: UserStats | null;
  loading: boolean;

  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;

  /** Persists and merges a single note into local state. */
  saveNote: (note: Note) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  addSummary: (summary: Summary) => Promise<void>;
  refreshStats: () => Promise<void>;
  reload: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Owns the user's content: notes, folders, summaries and stats. Pages read and
 * mutate through this instead of each holding their own copy.
 */
export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await StorageService.checkLoginStreak();
      const [nextNotes, nextSummaries, nextStats, nextFolders] = await Promise.all([
        StorageService.getNotes(),
        StorageService.getSummaries(),
        StorageService.getStats(),
        StorageService.getFolders(),
      ]);
      setNotes(nextNotes);
      setSummaries(nextSummaries);
      setStats(nextStats);
      setFolders(nextFolders);
    } catch (error) {
      console.error('[Workspace] Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setSummaries([]);
      setFolders([]);
      setStats(null);
      return;
    }
    void reload();
  }, [user?.id, reload]);

  const refreshStats = useCallback(async () => {
    if (!user) return;
    try {
      setStats(await StorageService.getStats());
    } catch (error) {
      console.error('[Workspace] Failed to refresh stats:', error);
    }
  }, [user?.id]);

  const saveNote = useCallback(async (note: Note) => {
    setNotes((current) => {
      const index = current.findIndex((item) => item.id === note.id);
      if (index === -1) return [note, ...current];
      return current.map((item) => (item.id === note.id ? note : item));
    });
    await StorageService.saveNote(note);
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    await StorageService.deleteNote(noteId);
    setNotes((current) => current.filter((note) => note.id !== noteId));
  }, []);

  const addSummary = useCallback(
    async (summary: Summary) => {
      const next = [summary, ...summaries];
      setSummaries(next);
      await StorageService.saveSummaries(next);
    },
    [summaries],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      notes,
      summaries,
      folders,
      stats,
      loading,
      setNotes,
      setFolders,
      saveNote,
      deleteNote,
      addSummary,
      refreshStats,
      reload,
    }),
    [notes, summaries, folders, stats, loading, saveNote, deleteNote, addSummary, refreshStats, reload],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return context;
}
