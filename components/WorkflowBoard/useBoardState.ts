
import { useState, useEffect, useCallback, useRef } from 'react';
import { Board, BoardColumn, BoardTask } from './types';
import * as svc from './boardService';

interface UseBoardStateReturn {
  board: Board | null;
  columns: BoardColumn[];
  tasks: BoardTask[];
  loading: boolean;
  error: string | null;

  addColumn: (title: string) => Promise<void>;
  renameColumn: (columnId: string, title: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (newOrder: string[]) => Promise<void>;
  toggleCollapse: (columnId: string) => void;

  addTask: (columnId: string, title: string) => Promise<BoardTask>;
  updateTask: (taskId: string, updates: Partial<BoardTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, toColumnId: string, toIndex: number) => Promise<void>;
  reorderTask: (columnId: string, fromIndex: number, toIndex: number) => Promise<void>;

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

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    svc.loadOrCreateBoard(userId)
      .then(({ board: b, columns: c, tasks: t }) => {
        setBoard(b);
        setColumns([...c].sort((a, b) => a.order - b.order));
        setTasks([...t].sort((a, b) => a.position - b.position));
        setError(null);
      })
      .catch((err) => {
        console.error('[WorkflowBoard] Load error:', err);
        setError('Failed to load board. Using local state.');
      })
      .finally(() => setLoading(false));
  }, [userId]);

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

  const addColumn = useCallback(
    async (title: string) => {
      if (!board) return;
      if (columns.some((c) => c.title.toLowerCase() === title.toLowerCase())) {
        throw new Error(`Column "${title}" already exists.`);
      }
      const order = columns.length;
      const tempId = `temp-${Date.now()}`;
      const optimistic: BoardColumn = { id: tempId, title, order, collapsed: false };
      setColumns((prev) => [...prev, optimistic]);
      setBoard((prev) => prev ? { ...prev, columnOrder: [...prev.columnOrder, tempId] } : prev);

      try {
        const created = await svc.addColumn(userId, board.id, title, order);
        setColumns((prev) => prev.map((c) => (c.id === tempId ? created : c)));
        setBoard((prev) =>
          prev ? { ...prev, columnOrder: prev.columnOrder.map((id) => (id === tempId ? created.id : id)) } : prev
        );
      } catch (err) {
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
      if (columns.some((c) => c.id !== columnId && c.title.toLowerCase() === title.toLowerCase())) {
        throw new Error(`Column "${title}" already exists.`);
      }
      setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, title } : c)));
      try {
        await svc.renameColumn(userId, board.id, columnId, title);
      } catch (err) {
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

  const moveTask = useCallback(
    async (taskId: string, toColumnId: string, toIndex: number) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (!task) return prev;

        const without = prev.filter((t) => t.id !== taskId);

        const destTasks = without
          .filter((t) => t.columnId === toColumnId)
          .sort((a, b) => a.position - b.position);

        destTasks.splice(toIndex, 0, { ...task, columnId: toColumnId });

        const reassigned = destTasks.map((t, i) => ({ ...t, position: i }));

        const result = [
          ...without.filter((t) => t.columnId !== toColumnId),
          ...reassigned,
        ];

        schedulePersist(result.filter((t) => t.columnId === toColumnId || (task && t.columnId === task.columnId)));
        return result;
      });
    },
    [schedulePersist]
  );

  const reorderTask = useCallback(
    async (columnId: string, fromIndex: number, toIndex: number) => {
      setTasks((prev) => {
        const colTasks = prev
          .filter((t) => t.columnId === columnId)
          .sort((a, b) => a.position - b.position);

        const [moved] = colTasks.splice(fromIndex, 1);
        colTasks.splice(toIndex, 0, moved);

        const reassigned = colTasks.map((t, i) => ({ ...t, position: i }));
        const result = [...prev.filter((t) => t.columnId !== columnId), ...reassigned];
        schedulePersist(reassigned);
        return result;
      });
    },
    [schedulePersist]
  );

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
