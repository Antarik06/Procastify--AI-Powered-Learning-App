
import React, { memo, useState } from 'react';
import { Calendar, Clock, MoreVertical, CheckSquare, Square, GripVertical, Trash2, Edit2 } from 'lucide-react';
import { BoardTask, TaskPriority } from './types';

interface TaskCardProps {
  task: BoardTask;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onEdit: (task: BoardTask) => void;
  onDelete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; dot: string }> = {
  high: {
    label: 'High',
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20',
    dot: 'bg-red-400',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
    dot: 'bg-yellow-400',
  },
  low: {
    label: 'Low',
    color: 'text-green-400',
    bg: 'bg-green-400/10 border-green-400/20',
    dot: 'bg-green-400',
  },
};

const TaskCard: React.FC<TaskCardProps> = memo(
  ({ task, isDragging, dragHandleProps, onEdit, onDelete, onToggleSubtask }) => {
    const [showMenu, setShowMenu] = useState(false);
    const priority = PRIORITY_CONFIG[task.priority];

    const completedSubtasks = task.subtasks.filter((s) => s.done).length;
    const subtaskProgress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0;

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.subtasks.every((s) => s.done);

    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
      <div
        className={`
          group relative bg-discord-panel border rounded-xl
          transition-all duration-200 select-none cursor-default
          ${isDragging
            ? 'border-discord-accent/60 shadow-xl shadow-discord-accent/20 scale-105 rotate-1 opacity-90'
            : 'border-white/5 hover:border-discord-accent/30 hover:shadow-md hover:shadow-black/40'
          }
        `}
        style={{ willChange: 'transform' }}
      >
        {task.labels.length > 0 && (
          <div className="flex gap-1 px-3 pt-2">
            {task.labels.map((color) => (
              <div
                key={color}
                className="h-1.5 rounded-full flex-1"
                style={{ backgroundColor: color, maxWidth: 40 }}
              />
            ))}
          </div>
        )}

        <div className="p-3">
          <div className="flex items-start gap-2">
            <div
              {...dragHandleProps}
              className="mt-0.5 text-discord-textMuted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
            >
              <GripVertical size={14} />
            </div>

            <h4 className="flex-1 font-semibold text-sm text-white leading-snug break-words">
              {task.title}
            </h4>

            <div className="relative shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
                className="p-1 rounded-lg text-discord-textMuted hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <MoreVertical size={14} />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-6 z-20 bg-discord-bg border border-white/10 rounded-xl shadow-xl shadow-black/50 overflow-hidden w-36">
                    <button
                      onClick={() => { onEdit(task); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-discord-text hover:bg-discord-panel hover:text-white transition-colors"
                    >
                      <Edit2 size={13} /> Edit Task
                    </button>
                    <button
                      onClick={() => { onDelete(task.id); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-discord-textMuted mt-1.5 ml-5 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {task.subtasks.length > 0 && (
            <div className="mt-2.5 ml-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-discord-textMuted">
                  {completedSubtasks}/{task.subtasks.length} subtasks
                </span>
              </div>
              <div className="h-1 bg-discord-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-discord-accent rounded-full transition-all duration-500"
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
              <div className="mt-2 space-y-1">
                {task.subtasks.slice(0, 2).map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => onToggleSubtask(task.id, sub.id)}
                    className="flex items-center gap-1.5 w-full text-left group/sub"
                  >
                    {sub.done ? (
                      <CheckSquare size={12} className="text-discord-accent shrink-0" />
                    ) : (
                      <Square size={12} className="text-discord-textMuted shrink-0 group-hover/sub:text-discord-accent" />
                    )}
                    <span className={`text-[11px] transition-colors ${sub.done ? 'line-through text-discord-textMuted' : 'text-discord-text'}`}>
                      {sub.title}
                    </span>
                  </button>
                ))}
                {task.subtasks.length > 2 && (
                  <p className="text-[10px] text-discord-textMuted pl-4">
                    +{task.subtasks.length - 2} more
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 ml-5 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${priority.bg} ${priority.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
              {priority.label}
            </span>

            {task.dueDate && (
              <span className={`text-[10px] flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-discord-textMuted'}`}>
                <Calendar size={10} />
                {formatDate(task.dueDate)}
              </span>
            )}

            {task.timeAllocation && (
              <span className="text-[10px] text-discord-textMuted flex items-center gap-1">
                <Clock size={10} />
                {task.timeAllocation}m
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

TaskCard.displayName = 'TaskCard';
export default TaskCard;
