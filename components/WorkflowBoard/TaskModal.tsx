// ============================================================
// TaskModal.tsx — Full-featured create/edit modal for tasks
// Matches discord dark theme; no new design language
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Flag, Calendar, Clock, Tag } from 'lucide-react';
import { BoardTask, BoardColumn, TaskPriority, LabelColor, Subtask } from './types';

interface TaskModalProps {
  open: boolean;
  columns: BoardColumn[];
  initialTask?: BoardTask | null;          // null = new task
  initialColumnId?: string;
  onClose: () => void;
  onSave: (data: Partial<BoardTask>, columnId: string) => void;
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'text-red-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'low', label: 'Low', color: 'text-green-400' },
];

const LABEL_COLORS: LabelColor[] = [
  '#5865F2', '#57F287', '#FEE75C', '#ED4245',
  '#EB459E', '#3BA55D', '#FAA61A', '#9B59B6',
];

const TaskModal: React.FC<TaskModalProps> = ({
  open,
  columns,
  initialTask,
  initialColumnId,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState(initialColumnId ?? columns[0]?.id ?? '');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [timeAllocation, setTimeAllocation] = useState('');
  const [labels, setLabels] = useState<LabelColor[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [titleError, setTitleError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (initialTask) {
        setTitle(initialTask.title);
        setDescription(initialTask.description);
        setColumnId(initialTask.columnId);
        setPriority(initialTask.priority);
        setDueDate(initialTask.dueDate ? initialTask.dueDate.split('T')[0] : '');
        setTimeAllocation(initialTask.timeAllocation ? String(initialTask.timeAllocation) : '');
        setLabels(initialTask.labels);
        setSubtasks(initialTask.subtasks);
      } else {
        // Reset form for new task
        setTitle('');
        setDescription('');
        setColumnId(initialColumnId ?? columns[0]?.id ?? '');
        setPriority('medium');
        setDueDate('');
        setTimeAllocation('');
        setLabels([]);
        setSubtasks([]);
      }
      setTitleError('');
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open, initialTask, initialColumnId, columns]);

  // Keyboard: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      { id: `sub-${Date.now()}`, title: newSubtask.trim(), done: false },
    ]);
    setNewSubtask('');
  };

  const toggleLabel = (color: LabelColor) => {
    setLabels((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError('Task title is required');
      titleRef.current?.focus();
      return;
    }

    const updates: Partial<BoardTask> = {
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
      timeAllocation: timeAllocation ? parseInt(timeAllocation, 10) : null,
      labels,
      subtasks,
    };

    onSave(updates, columnId);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-discord-bg border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-bold text-white text-lg">
            {initialTask ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-discord-textMuted hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-discord-textMuted mb-1.5 block">
              Title *
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Task title..."
              className={`w-full bg-discord-panel border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-discord-textMuted/50 focus:outline-none transition-colors
                ${titleError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-discord-accent/50'}`}
            />
            {titleError && <p className="text-red-400 text-xs mt-1">{titleError}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-discord-textMuted mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="w-full bg-discord-panel border border-white/10 focus:border-discord-accent/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-discord-textMuted/50 focus:outline-none resize-none transition-colors"
            />
          </div>

          {/* Row: Column + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-discord-textMuted mb-1.5 block">
                Column
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full bg-discord-panel border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-discord-accent/50 transition-colors"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-discord-textMuted mb-1.5 block flex items-center gap-1">
                <Flag size={10} /> Priority
              </label>
              <div className="flex gap-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border
                      ${priority === p.value
                        ? `${p.color} bg-white/10 border-white/20`
                        : 'text-discord-textMuted border-transparent hover:bg-white/5'
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row: Due date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-discord-textMuted mb-1.5 block flex items-center gap-1">
                <Calendar size={10} /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-discord-panel border border-white/10 focus:border-discord-accent/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition-colors [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-discord-textMuted mb-1.5 block flex items-center gap-1">
                <Clock size={10} /> Time (min)
              </label>
              <input
                type="number"
                value={timeAllocation}
                onChange={(e) => setTimeAllocation(e.target.value)}
                placeholder="e.g. 30"
                min={1}
                max={480}
                className="w-full bg-discord-panel border border-white/10 focus:border-discord-accent/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Color labels */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-discord-textMuted mb-2 block flex items-center gap-1">
              <Tag size={10} /> Labels
            </label>
            <div className="flex gap-2 flex-wrap">
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => toggleLabel(color)}
                  className={`w-7 h-7 rounded-lg transition-all border-2 ${
                    labels.includes(color) ? 'scale-110 border-white/60' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-discord-textMuted mb-2 block">
              Subtasks
            </label>
            <div className="space-y-1.5 mb-2">
              {subtasks.map((sub, idx) => (
                <div key={sub.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() =>
                      setSubtasks((prev) =>
                        prev.map((s) => (s.id === sub.id ? { ...s, done: !s.done } : s))
                      )
                    }
                    className="shrink-0"
                  >
                    {sub.done
                      ? <div className="w-4 h-4 rounded bg-discord-accent flex items-center justify-center">
                          <span className="text-white text-[10px]">✓</span>
                        </div>
                      : <div className="w-4 h-4 rounded border border-white/20 hover:border-discord-accent/60 transition-colors" />
                    }
                  </button>
                  <span className={`flex-1 text-sm ${sub.done ? 'line-through text-discord-textMuted' : 'text-discord-text'}`}>
                    {sub.title}
                  </span>
                  <button
                    onClick={() => setSubtasks((prev) => prev.filter((s) => s.id !== sub.id))}
                    className="p-1 rounded text-discord-textMuted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                placeholder="Add a subtask..."
                className="flex-1 bg-discord-panel border border-white/10 focus:border-discord-accent/50 rounded-xl px-3 py-2 text-white text-sm placeholder:text-discord-textMuted/50 focus:outline-none transition-colors"
              />
              <button
                onClick={handleAddSubtask}
                className="p-2 bg-discord-accent hover:bg-discord-accentHover text-white rounded-xl transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-discord-panel hover:bg-discord-hover border border-white/10 text-discord-text hover:text-white rounded-xl text-sm font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-discord-accent hover:bg-discord-accentHover text-white rounded-xl text-sm font-bold transition-all"
          >
            {initialTask ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
