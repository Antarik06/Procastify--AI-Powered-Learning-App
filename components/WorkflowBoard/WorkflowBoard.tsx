
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  Loader2,
  AlertCircle,
  Kanban,
  LayoutGrid,
} from 'lucide-react';
import { useBoardState } from './useBoardState';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';
import { BoardTask } from './types';

interface WorkflowBoardProps {
  userId: string;
  onClose: () => void;
  sidebarCollapsed?: boolean;
}

const WorkflowBoard: React.FC<WorkflowBoardProps> = ({ userId, onClose, sidebarCollapsed = false }) => {
  const {
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
    totalTasks,
    doneTasks,
  } = useBoardState(userId);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<BoardTask | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string>('');

  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [colError, setColError] = useState('');
  const newColRef = useRef<HTMLInputElement>(null);

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ columnId: string; index: number } | null>(null);
  const dragColumnFrom = useRef<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'N' && !taskModalOpen && !addingColumn) {
        e.preventDefault();
        const firstCol = columns[0];
        if (firstCol) {
          setActiveColumnId(firstCol.id);
          setEditingTask(null);
          setTaskModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [columns, taskModalOpen, addingColumn]);

  useEffect(() => {
    if (addingColumn) {
      setTimeout(() => newColRef.current?.focus(), 50);
    }
  }, [addingColumn]);

  const handleTaskDragStart = useCallback((taskId: string, fromColumnId: string, fromIndex: number) => {
    setDraggingTaskId(taskId);
    setDraggingColumnId(null);
  }, []);

  const handleTaskDragOver = useCallback((e: React.DragEvent, toColumnId: string, toIndex: number) => {
    e.preventDefault();
    if (draggingTaskId) {
      setDropIndicator({ columnId: toColumnId, index: toIndex });
    }
  }, [draggingTaskId]);

  const handleTaskDrop = useCallback((e: React.DragEvent, toColumnId: string, toIndex: number) => {
    e.preventDefault();
    if (!draggingTaskId) return;

    const fromColumnId = e.dataTransfer.getData('fromColumnId');
    const fromIndex = parseInt(e.dataTransfer.getData('fromIndex'), 10);

    if (fromColumnId === toColumnId) {
      if (fromIndex !== toIndex) {
        reorderTask(toColumnId, fromIndex, toIndex > fromIndex ? toIndex - 1 : toIndex);
      }
    } else {
      moveTask(draggingTaskId, toColumnId, toIndex);
    }

    setDraggingTaskId(null);
    setDropIndicator(null);
  }, [draggingTaskId, moveTask, reorderTask]);

  const handleColumnDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    if (draggingTaskId) return;
    e.dataTransfer.setData('columnId', columnId);
    e.dataTransfer.effectAllowed = 'move';
    dragColumnFrom.current = columnId;
    setDraggingColumnId(columnId);
  }, [draggingTaskId]);

  const handleColumnDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggingColumnId) return;
    if (draggingColumnId === columnId) return;
    e.dataTransfer.dropEffect = 'move';
  }, [draggingColumnId]);

  const handleColumnDrop = useCallback((e: React.DragEvent, toColumnId: string) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('columnId');
    if (!fromId || fromId === toColumnId) {
      setDraggingColumnId(null);
      return;
    }

    const currentOrder = board?.columnOrder ?? columns.map((c) => c.id);
    const fromIdx = currentOrder.indexOf(fromId);
    const toIdx = currentOrder.indexOf(toColumnId);

    if (fromIdx === -1 || toIdx === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, fromId);

    reorderColumns(newOrder);
    setDraggingColumnId(null);
  }, [board, columns, reorderColumns]);

  const handleColumnDragEnd = useCallback(() => {
    setDraggingColumnId(null);
    dragColumnFrom.current = null;
  }, []);

  const handleOpenAddTask = useCallback((columnId: string) => {
    setActiveColumnId(columnId);
    setEditingTask(null);
    setTaskModalOpen(true);
  }, []);

  const handleOpenEditTask = useCallback((task: BoardTask) => {
    setEditingTask(task);
    setActiveColumnId(task.columnId);
    setTaskModalOpen(true);
  }, []);

  const handleSaveTask = useCallback(async (data: Partial<BoardTask>, columnId: string) => {
    if (editingTask) {
      await updateTask(editingTask.id, { ...data, columnId });
    } else {
      await addTask(columnId, data.title ?? 'Untitled');
    }
  }, [editingTask, updateTask, addTask]);

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask(taskId);
  }, [deleteTask]);

  const handleToggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, done: !s.done } : s
    );
    updateTask(taskId, { subtasks: updatedSubtasks });
  }, [tasks, updateTask]);

  const handleAddColumn = async () => {
    const title = newColTitle.trim();
    if (!title) { setColError('Column name is required'); return; }

    try {
      await addColumn(title);
      setNewColTitle('');
      setAddingColumn(false);
      setColError('');
    } catch (err: any) {
      setColError(err.message ?? 'Failed to add column');
    }
  };

  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const orderedColumns = React.useMemo(() => {
    if (board && board.columnOrder && board.columnOrder.length > 0) {
      const mapped = board.columnOrder
        .map((id) => columns.find((c) => c.id === id))
        .filter(Boolean) as typeof columns;
      if (mapped.length === columns.length) return mapped;
    }
    return [...columns].sort((a, b) => a.order - b.order);
  }, [board, columns]);

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 z-40 bg-discord-bg flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'left-20' : 'left-64'}`}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-discord-panel shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-discord-accent/10 border border-discord-accent/20 flex items-center justify-center">
            <Kanban size={18} className="text-discord-accent" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-none">
              {board?.name ?? 'Workflow Board'}
            </h1>
            <p className="text-discord-textMuted text-xs mt-0.5">
              {totalTasks} tasks · {doneTasks} done · <span className="text-discord-accent font-semibold">{progressPct}%</span> complete
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-xs mx-8">
          <div className="h-2 bg-discord-bg rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-discord-accent to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-discord-textMuted hidden sm:block">
            Shift+N for new task
          </span>

          <button
            onClick={() => setAddingColumn(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-discord-accent/10 hover:bg-discord-accent/20 border border-discord-accent/20 text-discord-accent rounded-xl text-sm font-semibold transition-all"
          >
            <Plus size={15} /> Column
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-discord-textMuted hover:text-white hover:bg-white/10 border border-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-discord-panel border border-white/5 flex items-center justify-center">
              <Loader2 size={24} className="text-discord-accent animate-spin" />
            </div>
            <p className="text-discord-textMuted text-sm">Loading your board...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="mx-6 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2 text-sm text-yellow-300">
          <AlertCircle size={16} /> {error} — Working offline.
        </div>
      )}

      {!loading && (
        <div
          className="flex-1 overflow-x-auto overflow-y-auto p-6"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            setDraggingTaskId(null);
            setDropIndicator(null);
          }}
        >
          <div className="flex gap-4 min-h-full items-start pb-6">
            {orderedColumns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={getColumnTasks(col.id)}
                isColumnDragging={draggingColumnId === col.id}
                onRename={renameColumn}
                onDelete={deleteColumn}
                onToggleCollapse={toggleCollapse}
                onAddTask={handleOpenAddTask}
                onEditTask={handleOpenEditTask}
                onDeleteTask={handleDeleteTask}
                onToggleSubtask={handleToggleSubtask}
                onTaskDragStart={handleTaskDragStart}
                onTaskDragOver={handleTaskDragOver}
                onTaskDrop={handleTaskDrop}
                onColumnDragStart={handleColumnDragStart}
                onColumnDragOver={handleColumnDragOver}
                onColumnDrop={handleColumnDrop}
                onColumnDragEnd={handleColumnDragEnd}
                dropIndicator={dropIndicator}
              />
            ))}

            {addingColumn ? (
              <div className="w-72 shrink-0 bg-discord-panel border border-discord-accent/30 rounded-2xl p-4 shadow-lg shadow-discord-accent/10">
                <p className="text-xs font-bold uppercase tracking-wider text-discord-accent mb-2">New Column</p>
                <input
                  ref={newColRef}
                  value={newColTitle}
                  onChange={(e) => { setNewColTitle(e.target.value); setColError(''); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') { setAddingColumn(false); setNewColTitle(''); setColError(''); }
                  }}
                  placeholder="Column name..."
                  className="w-full bg-discord-bg border border-white/10 focus:border-discord-accent/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-discord-textMuted/50 focus:outline-none transition-colors mb-2"
                />
                {colError && <p className="text-red-400 text-xs mb-2">{colError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleAddColumn}
                    className="flex-1 py-2 bg-discord-accent hover:bg-discord-accentHover text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingColumn(false); setNewColTitle(''); setColError(''); }}
                    className="p-2 bg-discord-bg hover:bg-discord-hover border border-white/10 text-discord-textMuted hover:text-white rounded-xl transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="w-64 shrink-0 h-24 rounded-2xl border-2 border-dashed border-white/10 hover:border-discord-accent/30 text-discord-textMuted hover:text-discord-accent flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <Plus size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Add Column</span>
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && orderedColumns.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-discord-panel border border-white/5 flex items-center justify-center mx-auto mb-4">
              <LayoutGrid size={36} className="text-discord-textMuted opacity-40" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">No columns yet</h3>
            <p className="text-discord-textMuted text-sm">Click "Column" above to get started</p>
          </div>
        </div>
      )}

      <TaskModal
        open={taskModalOpen}
        columns={orderedColumns}
        initialTask={editingTask}
        initialColumnId={activeColumnId}
        onClose={() => { setTaskModalOpen(false); setEditingTask(null); }}
        onSave={handleSaveTask}
      />
    </div>
  );
};

export default WorkflowBoard;
