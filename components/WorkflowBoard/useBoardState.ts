// ============================================================
// useBoardState.ts — All state logic for the Workflow Board
// Separates UI state from Firestore operations
// Implements optimistic updates for snappy UX
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { Board, BoardColumn, BoardTask, TaskPriority, LabelColor, Subtask } from './types';
import * as svc from './boardService';

interface UseBoardStateReturn {
  // Data
  board: Board | null;
  columns: BoardColumn[];
  tasks: BoardTask[];
  loading: boolean;
  error: string | null;

  // Column actions
  addColumn: (title: string) => Promise<void>;
  renameColumn: (columnId: string, title: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (newOrder: string[]) => Promise<void>;
  toggleCollapse: (columnId: string) => void;

  // Task actions
  addTask: (columnId: string, title: string) => Promise<BoardTask>;
  updateTask: (taskId: string, updates: Partial<BoardTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, toColumnId: string, toIndex: number) => Promise<void>;
  reorderTask: (columnId: string, fromIndex: number, toIndex: number) => Promise<void>;

  // Computed
  getColumnTasks: (columnId: string) => BoardTask[];
  totalTasks: number;
  doneTasks: number;
}

export function useBoardState(userId: string): UseBoardStateReturn {
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer for position persistence (avoids write storms during rapid dragging)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load board on mount ──────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    svc.loadOrCreateBoard(userId)
      .then(({ board: b, columns: c, tasks: t }) => {
        setBoard(b);
        // Sort columns by order field
        setColumns([...c].sort((a, b) => a.order - b.order));
        // Sort tasks by position within each column
        setTasks([...t].sort((a, b) => a.position - b.position));
        setError(null);
      })
      .catch((err) => {
        console.error('[WorkflowBoard] Load error:', err);
        setError('Failed to load board. Using local state.');
        // Fall back gracefully
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Helper: persist task positions (debounced) ───────────────
  const schedulePersist = useCallback(
    (updatedTasks: BoardTask[]) => {
      if (!board) return;
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        svc.saveTaskPositions(userId, board.id, updatedTasks).catch(console.error);
      }, 600);
    },
    [userId, board]
  );

  // ── Column actions ───────────────────────────────────────────

  const addColumn = useCallback(
    async (title: string) => {
      if (!board) return;
      // Prevent duplicate column names
      if (columns.some((c) => c.title.toLowerCase() === title.toLowerCase())) {
        throw new Error(`Column "${title}" already exists.`);
      }
      const order = columns.length;
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimistic: BoardColumn = { id: tempId, title, order, collapsed: false };
      setColumns((prev) => [...prev, optimistic]);
      setBoard((prev) => prev ? { ...prev, columnOrder: [...prev.columnOrder, tempId] } : prev);

      try {
        const created = await svc.addColumn(userId, board.id, title, order);
        // Replace temp with real
        setColumns((prev) => prev.map((c) => (c.id === tempId ? created : c)));
        setBoard((prev) =>
          prev ? { ...prev, columnOrder: prev.columnOrder.map((id) => (id === tempId ? created.id : id)) } : prev
        );
      } catch (err) {
        // Rollback on failure
        setColumns((prev) => prev.filter((c) => c.id !== tempId));
        setBoard((prev) => prev ? { ...prev, columnOrder: prev.columnOrder.filter((id) => id !== tempId) } : prev);
        throw err;
      }
    },
    [userId, board, columns]
  );

  const renameColumn = useCallback(
    async (columnId: string, title: string) => {
      if (!board) return;
      // Prevent duplicate names (excluding self)
      if (columns.some((c) => c.id !== columnId && c.title.toLowerCase() === title.toLowerCase())) {
        throw new Error(`Column "${title}" already exists.`);
      }
      // Optimistic
      setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, title } : c)));
      try {
        await svc.renameColumn(userId, board.id, columnId, title);
      } catch (err) {
        // Rollback handled by re-fetching in practice — for now just log
        console.error('[WorkflowBoard] Rename failed:', err);
        throw err;
      }
    },
    [userId, board, columns]
  );

  const deleteColumn = useCallback(
    async (columnId: string) => {
      if (!board) return;
      const columnTasks = tasks.filter((t) => t.columnId === columnId);
      // Optimistic removal
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setTasks((prev) => prev.filter((t) => t.columnId !== columnId));
      setBoard((prev) =>
        prev ? { ...prev, columnOrder: prev.columnOrder.filter((id) => id !== columnId) } : prev
      );

      try {
        await svc.deleteColumn(userId, board.id, columnId, columnTasks.map((t) => t.id));
      } catch (err) {
        console.error('[WorkflowBoard] Delete column failed:', err);
        throw err;
      }
    },
    [userId, board, tasks]
  );

  const reorderColumns = useCallback(
    async (newOrder: string[]) => {
      if (!board) return;
      // Optimistic reorder with updated 'order' field
      setBoard((prev) => (prev ? { ...prev, columnOrder: newOrder } : prev));
      setColumns((prev) => {
        const map = Object.fromEntries(prev.map((c) => [c.id, c]));
        return newOrder.map((id, idx) => ({ ...map[id], order: idx })).filter(Boolean);
      });

      try {
        await svc.saveColumnOrder(userId, board.id, newOrder);
      } catch (err) {
        console.error('[WorkflowBoard] Reorder columns failed:', err);
      }
    },
    [userId, board]
  );

  const toggleCollapse = useCallback(
    (columnId: string) => {
      if (!board) return;
      setColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, collapsed: !c.collapsed } : c))
      );
      const col = columns.find((c) => c.id === columnId);
      if (col) {
        svc.toggleColumnCollapse(userId, board.id, columnId, !col.collapsed).catch(console.error);
      }
    },
    [userId, board, columns]
  );

  // ── Task actions ─────────────────────────────────────────────

  const addTask = useCallback(
    async (columnId: string, title: string): Promise<BoardTask> => {
      if (!board) throw new Error('No board loaded');
      const colTasks = tasks.filter((t) => t.columnId === columnId);
      const position = colTasks.length;

      const newTask: Omit<BoardTask, 'id'> = {
        title,
        description: '',
        columnId,
        position,
        dueDate: null,
        priority: 'medium',
        labels: [],
        subtasks: [],
        timeAllocation: null,
        createdAt: Date.now(),
      };

      // Optimistic
      const tempId = `temp-task-${Date.now()}`;
      const optimistic = { ...newTask, id: tempId };
      setTasks((prev) => [...prev, optimistic]);

      try {
        const created = await svc.addTask(userId, board.id, newTask);
        setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
        return created;
      } catch (err) {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        throw err;
      }
    },
    [userId, board, tasks]
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<BoardTask>) => {
      if (!board) return;
      // Optimistic
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
      try {
        await svc.updateTask(userId, board.id, taskId, updates);
      } catch (err) {
        console.error('[WorkflowBoard] Update task failed:', err);
        throw err;
      }
    },
    [userId, board]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!board) return;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      try {
        await svc.deleteTask(userId, board.id, taskId);
      } catch (err) {
        console.error('[WorkflowBoard] Delete task failed:', err);
        throw err;
      }
    },
    [userId, board]
  );

  /**
   * Move a task to a different column at a specific index.
   * Recalculates position for all tasks in affected columns.
   */
  const moveTask = useCallback(
    async (taskId: string, toColumnId: string, toIndex: number) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (!task) return prev;

        // Remove from source column
        const without = prev.filter((t) => t.id !== taskId);

        // Get destination column tasks (sorted), insert at toIndex
        const destTasks = without
          .filter((t) => t.columnId === toColumnId)
          .sort((a, b) => a.position - b.position);

        destTasks.splice(toIndex, 0, { ...task, columnId: toColumnId });

        // Reassign positions in destination column
        const reassigned = destTasks.map((t, i) => ({ ...t, position: i }));

        // Rebuild: tasks not in dest column + reassigned dest tasks
        const result = [
          ...without.filter((t) => t.columnId !== toColumnId),
          ...reassigned,
        ];

        // Persist (debounced) — only send affected tasks
        schedulePersist(result.filter((t) => t.columnId === toColumnId || (task && t.columnId === task.columnId)));
        return result;
      });
    },
    [schedulePersist]
  );

  /**
   * Reorder tasks within the same column.
   */
  const reorderTask = useCallback(
    async (columnId: string, fromIndex: number, toIndex: number) => {
      setTasks((prev) => {
        const colTasks = prev
          .filter((t) => t.columnId === columnId)
          .sort((a, b) => a.position - b.position);

        // Splice to reorder
        const [moved] = colTasks.splice(fromIndex, 1);
        colTasks.splice(toIndex, 0, moved);

        // Reassign positions
        const reassigned = colTasks.map((t, i) => ({ ...t, position: i }));
        const result = [...prev.filter((t) => t.columnId !== columnId), ...reassigned];
        schedulePersist(reassigned);
        return result;
      });
    },
    [schedulePersist]
  );

  // ── Computed ─────────────────────────────────────────────────

  const getColumnTasks = useCallback(
    (columnId: string) =>
      tasks
        .filter((t) => t.columnId === columnId)
        .sort((a, b) => a.position - b.position),
    [tasks]
  );

  const doneTasks = tasks.filter((t) => {
    const col = columns.find((c) => c.id === t.columnId);
    return col?.title.toLowerCase().includes('done');
  }).length;

  return {
    board,
    columns,
    tasks,
    loading,
    error,
    addColumn,
    renameColumn,
    deleteColumn,
    reorderColumns,
    toggleCollapse,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTask,
    getColumnTasks,
    totalTasks: tasks.length,
    doneTasks,
  };
}
