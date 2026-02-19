// ============================================================
// KanbanColumn.tsx — Column UI with sticky header and drag support
// Uses native HTML5 drag-and-drop to avoid new dependencies
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  GripVertical,
  Check,
  X,
} from 'lucide-react';
import { BoardColumn, BoardTask } from './types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  column: BoardColumn;
  tasks: BoardTask[];
  isColumnDragging?: boolean;
  // Column actions
  onRename: (columnId: string, newTitle: string) => void;
  onDelete: (columnId: string) => void;
  onToggleCollapse: (columnId: string) => void;
  // Task actions
  onAddTask: (columnId: string) => void;
  onEditTask: (task: BoardTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  // Drag handlers (task DnD)
  onTaskDragStart: (taskId: string, fromColumnId: string, fromIndex: number) => void;
  onTaskDragOver: (e: React.DragEvent, toColumnId: string, toIndex: number) => void;
  onTaskDrop: (e: React.DragEvent, toColumnId: string, toIndex: number) => void;
  // Column DnD
  onColumnDragStart: (e: React.DragEvent, columnId: string) => void;
  onColumnDragOver: (e: React.DragEvent, columnId: string) => void;
  onColumnDrop: (e: React.DragEvent, columnId: string) => void;
  onColumnDragEnd: () => void;
  // Drop indicator
  dropIndicator: { columnId: string; index: number } | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  isColumnDragging,
  onRename,
  onDelete,
  onToggleCollapse,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleSubtask,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDrop,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragEnd,
  dropIndicator,
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(column.title);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRenameSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== column.title) {
      try {
        onRename(column.id, trimmed);
      } catch {
        setEditValue(column.title);
      }
    } else {
      setEditValue(column.title);
    }
    setEditing(false);
  };

  const handleDeleteConfirm = () => {
    if (tasks.length > 0) {
      setConfirmDelete(true);
    } else {
      onDelete(column.id);
    }
    setShowMenu(false);
  };

  // Color the column header accent based on column name
  const getHeaderAccent = () => {
    const name = column.title.toLowerCase();
    if (name.includes('done') || name.includes('complete')) return 'from-green-500/20';
    if (name.includes('progress') || name.includes('doing')) return 'from-discord-accent/20';
    if (name.includes('review') || name.includes('block')) return 'from-yellow-500/20';
    return 'from-white/5';
  };

  return (
    <div
      className={`
        flex flex-col rounded-2xl border w-72 shrink-0
        transition-all duration-200
        ${isColumnDragging
          ? 'border-discord-accent/50 opacity-60 scale-95'
          : 'border-white/5 bg-discord-panel/60 backdrop-blur-sm'
        }
      `}
      style={{ maxHeight: 'calc(100vh - 100px)' }}
      draggable={!editing}
      onDragStart={(e) => onColumnDragStart(e, column.id)}
      onDragOver={(e) => onColumnDragOver(e, column.id)}
      onDrop={(e) => onColumnDrop(e, column.id)}
      onDragEnd={onColumnDragEnd}
    >
      {/* ── Sticky Column Header ── */}
      <div className={`sticky top-0 z-10 px-4 py-3 rounded-t-2xl border-b border-white/5 bg-gradient-to-r ${getHeaderAccent()} to-transparent backdrop-blur-sm`}>
        <div className="flex items-center gap-2">
          {/* Column drag handle */}
          <div className="text-discord-textMuted hover:text-white cursor-grab active:cursor-grabbing shrink-0 transition-colors">
            <GripVertical size={16} />
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => onToggleCollapse(column.id)}
            className="text-discord-textMuted hover:text-white transition-colors shrink-0"
          >
            {column.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Title (inline edit) */}
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') { setEditValue(column.title); setEditing(false); }
              }}
              className="flex-1 bg-discord-bg border border-discord-accent/50 rounded-lg px-2 py-0.5 text-sm font-bold text-white focus:outline-none"
              autoFocus
            />
          ) : (
            <h3
              onDoubleClick={() => { setEditing(true); setEditValue(column.title); }}
              className="flex-1 font-bold text-sm text-white truncate cursor-text"
              title="Double-click to rename"
            >
              {column.title}
            </h3>
          )}

          {/* Task count badge */}
          <span className="text-xs font-bold bg-discord-bg text-discord-textMuted px-2 py-0.5 rounded-full border border-white/10 shrink-0">
            {tasks.length}
          </span>

          {/* Column menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-1 rounded-lg text-discord-textMuted hover:text-white hover:bg-white/10 transition-all"
            >
              <MoreVertical size={14} />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-7 z-20 bg-discord-bg border border-white/10 rounded-xl shadow-xl shadow-black/60 overflow-hidden w-40">
                  <button
                    onClick={() => { setEditing(true); setEditValue(column.title); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-discord-text hover:bg-discord-panel hover:text-white transition-colors"
                  >
                    <Pencil size={13} /> Rename
                  </button>
                  <button
                    onClick={() => { onAddTask(column.id); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-discord-text hover:bg-discord-panel hover:text-white transition-colors"
                  >
                    <Plus size={13} /> Add Task
                  </button>
                  <div className="border-t border-white/5 mt-1" />
                  <button
                    onClick={handleDeleteConfirm}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={13} /> Delete Column
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm delete with tasks ── */}
      {confirmDelete && (
        <div className="mx-3 mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-xs text-red-300 mb-2 font-medium">
            Delete column and {tasks.length} task{tasks.length !== 1 ? 's' : ''}?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { onDelete(column.id); setConfirmDelete(false); }}
              className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <Check size={12} /> Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-1.5 bg-discord-panel hover:bg-discord-hover border border-white/10 text-discord-text rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Task list (hidden when collapsed) ── */}
      {!column.collapsed && (
        <div
          className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[60px]" style={{ overscrollBehavior: "contain" }}
          onDragOver={(e) => { e.preventDefault(); onTaskDragOver(e, column.id, tasks.length); }}
          onDrop={(e) => onTaskDrop(e, column.id, tasks.length)}
        >
          {tasks.length === 0 && !dropIndicator && (
            <div className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-white/5 hover:border-discord-accent/20 transition-colors">
              <div className="w-8 h-8 rounded-full bg-discord-bg border border-white/10 flex items-center justify-center mb-2">
                <Plus size={14} className="text-discord-textMuted" />
              </div>
              <p className="text-xs text-discord-textMuted text-center">
                Drop tasks here or<br />
                <button
                  onClick={() => onAddTask(column.id)}
                  className="text-discord-accent hover:underline"
                >
                  add a task
                </button>
              </p>
            </div>
          )}

          {tasks.map((task, idx) => (
            <React.Fragment key={task.id}>
              {/* Drop indicator line */}
              {dropIndicator?.columnId === column.id && dropIndicator.index === idx && (
                <div className="h-0.5 bg-discord-accent rounded-full mx-1 animate-pulse" />
              )}

              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('taskId', task.id);
                  e.dataTransfer.setData('fromColumnId', column.id);
                  e.dataTransfer.setData('fromIndex', String(idx));
                  onTaskDragStart(task.id, column.id, idx);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTaskDragOver(e, column.id, idx);
                }}
                onDrop={(e) => {
                  e.stopPropagation();
                  onTaskDrop(e, column.id, idx);
                }}
                className="transition-transform duration-150"
              >
                <TaskCard
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onToggleSubtask={onToggleSubtask}
                />
              </div>
            </React.Fragment>
          ))}

          {/* Drop indicator at bottom of list */}
          {dropIndicator?.columnId === column.id && dropIndicator.index === tasks.length && (
            <div className="h-0.5 bg-discord-accent rounded-full mx-1 animate-pulse" />
          )}
        </div>
      )}

      {/* ── Add task button ── */}
      {!column.collapsed && (
        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => onAddTask(column.id)}
            className="w-full flex items-center gap-2 py-2 px-3 rounded-xl text-discord-textMuted hover:text-white hover:bg-white/5 text-sm font-medium transition-all group"
          >
            <Plus size={16} className="group-hover:text-discord-accent transition-colors" />
            Add Task
          </button>
        </div>
      )}
    </div>
  );
};

export default KanbanColumn;
