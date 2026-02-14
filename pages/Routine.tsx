import React, { useState, useEffect } from 'react';
import { UserPreferences, RoutineTask, Note, QueueItem } from '../types';
import { analyzeNoteWorkload, generateAdaptiveRoutine, generatePanicDecomposition } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { Clock, CheckCircle, RefreshCw, CalendarCheck, PlayCircle, Plus, BrainCircuit, Settings, Coffee, Trash2, AlertTriangle, Zap } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

interface SortableTaskProps {
  id: string;
  children: React.ReactNode;
}

const SortableTask = ({ id, children }: SortableTaskProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

interface RoutineProps {
    user: UserPreferences;
    setUser: (u: UserPreferences) => void;
    notes: Note[];
    setNotes: (n: Note[]) => void;
    onStartTask: (task: RoutineTask) => void;
}

const Routine: React.FC<RoutineProps> = ({
  user,
  setUser,
  notes,
  setNotes,
  onStartTask
}) => {
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  })
);
const handleDragEnd = (event: any) => {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  setTasks((items) => {
    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    return arrayMove(items, oldIndex, newIndex);
  });
};


  const [activeTab, setActiveTab] = useState<'plan' | 'schedule'>('plan');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [tasks, setTasks] = useState<RoutineTask[]>([]);

  
  useEffect(() => {
    const saved = localStorage.getItem("routine_tasks");
    if (saved) {
      setTasks(JSON.parse(saved));
    }
  }, []);


  useEffect(() => {
    localStorage.setItem("routine_tasks", JSON.stringify(tasks));
  }, [tasks]);

  const addManualTask = () => {
    if (!user) return;

    const newTask: RoutineTask = {
      id: `task_${Date.now()}`,
      userId: user.id,
      title: "New Task",
      durationMinutes: 25,
      type: "focus",
      completed: false,
      subTasks: []
    };

    setTasks(prev => [...prev, newTask]);
  };



    const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null); // Note ID being analyzed
    const [generatingRoutine, setGeneratingRoutine] = useState(false);
    const [routineMeta, setRoutineMeta] = useState<{ projection: string, confidence: string } | null>(null);
    const [panicMode, setPanicMode] = useState(false);
    const [previousTasks, setPreviousTasks] = useState<RoutineTask[]>([]);


    const [showSettings, setShowSettings] = useState(false);


    useEffect(() => {
        const loadData = async () => {
            const q = await StorageService.getQueue();
            const t = await StorageService.getTasks();
            setQueue(q);
            setTasks(t);


            const savedMeta = localStorage.getItem('procastify_routine_meta');
            if (savedMeta) setRoutineMeta(JSON.parse(savedMeta));
        };
        loadData();
    }, [user.id]);

    // Clean up stale queue items that reference non-existent notes
    useEffect(() => {
        if (notes.length > 0 && queue.length > 0) {
            const noteIds = new Set(notes.map(n => n.id));
            const validQueue = queue.filter(item => noteIds.has(item.noteId));

            // Only update if we found invalid items to avoid infinite loops
            if (validQueue.length !== queue.length) {
                console.log('[Routine] Removing stale queue items:', queue.length - validQueue.length);
                setQueue(validQueue);
            }
        }
    }, [notes, queue]);


    useEffect(() => {

        if (queue.length > 0 || tasks.length > 0) {
            StorageService.saveQueue(queue);
            StorageService.saveTasks(tasks);
        }
        if (routineMeta) localStorage.setItem('procastify_routine_meta', JSON.stringify(routineMeta));
    }, [queue, tasks, routineMeta]);




    const addToQueue = async (noteId: string) => {
        // Already in queue?
        if (queue.find(q => q.noteId === noteId)) return;

        // Analyze note if it doesn't have AI analysis
        setLoadingAnalysis(noteId);
        let note = notes.find(n => n.id === noteId);

        if (note) {
            // Debug: Check what structure the note has
            console.log('[Routine] Note structure:', {
                id: note.id,
                title: note.title,
                hasDocument: !!note.document,
                hasBlocks: !!note.document?.blocks,
                blocksLength: note.document?.blocks?.length,
                blocks: note.document?.blocks,
                hasAiAnalysis: !!note.aiAnalysis
            });

            // Check if note has content in document.blocks
            const hasContent = note.document?.blocks && note.document.blocks.length > 0;

            if (!note.aiAnalysis && hasContent) {
                // Extract text from document blocks
                const textContent = note.document.blocks.map(block => block.content || "").join("\n");
                console.log('[Routine] Analyzing note with content:', textContent.substring(0, 100));

                const analysis = await analyzeNoteWorkload(textContent || "Empty Note");
                console.log('[Routine] Analysis result:', analysis);

                // Update the note with analysis
                const updatedNote = { ...note, aiAnalysis: analysis };
                const updatedNotes = notes.map(n => n.id === noteId ? updatedNote : n);
                setNotes(updatedNotes);
            } else {
                console.log('[Routine] Skipping analysis - hasContent:', hasContent, 'hasAiAnalysis:', !!note.aiAnalysis);
            }
        }
        setLoadingAnalysis(null);

        // Add to queue
        setQueue([...queue, { id: Date.now().toString(), userId: user.id, noteId, priority: 'medium', status: 'pending' }]);
    };

    const removeFromQueue = (id: string) => {
        setQueue(queue.filter(q => q.id !== id));
    };

   const generatePlan = async () => {
    if (queue.length === 0) return;
    setGeneratingRoutine(true);

    const result = await generateAdaptiveRoutine(queue, notes, user);

    setTasks(
      result.tasks.map(task => ({
        ...task,
        subTasks: []
      }))
    );

    setRoutineMeta({ projection: result.projection, confidence: result.confidence });
    setGeneratingRoutine(false);
    setPanicMode(false);

    setActiveTab('schedule');
};


    const updateTaskStatus = (taskId: string) => {
        const newTasks = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
        setTasks(newTasks);
    };

    const activatePanicMode = async () => {
        if (tasks.filter(t => !t.completed).length === 0) return;

        setPreviousTasks(tasks); // Save state before panic
        setGeneratingRoutine(true);
        const panicTasks = await generatePanicDecomposition(tasks);

        if (panicTasks.length > 0) {
            setTasks(
  panicTasks.map(task => ({
    ...task,
    subTasks: []
  }))
);

            setPanicMode(true);
            setRoutineMeta({
                projection: "PANIC PROTOCOL ENGAGED. Breaking everything down. Just do the first tiny thing.",
                confidence: 'high'
            });
        }
        setGeneratingRoutine(false);
    };

    const undoPanicMode = () => {
        if (previousTasks.length > 0) {
            setTasks(previousTasks);
            setPanicMode(false);
            setRoutineMeta(prev => prev ? { ...prev, projection: "Restored original plan. You've got this.", confidence: 'medium' } : null);
        }
    };

    const getDifficultyColor = (diff?: string) => {
        switch (diff) {
            case 'easy': return 'text-green-400 bg-green-400/10';
            case 'medium': return 'text-yellow-400 bg-yellow-400/10';
            case 'hard': return 'text-red-400 bg-red-400/10';
            default: return 'text-gray-400 bg-gray-400/10';
        }
    };



    const renderQueue = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="lg:col-span-1 bg-discord-panel p-6 rounded-2xl border border-white/5 h-fit">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <BrainCircuit size={18} className="text-discord-accent" /> Notes Library
                </h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {notes.map(note => {
                        const inQueue = queue.find(q => q.noteId === note.id);
                        return (
                            <div key={note.id} className="p-3 bg-discord-bg rounded-xl border border-white/5 hover:border-discord-accent/30 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-white truncate w-32">{note.title}</h4>
                                    {inQueue ? (
                                        <span className="text-xs text-green-400 font-medium">In Queue</span>
                                    ) : (
                                        <button
                                            onClick={() => addToQueue(note.id)}
                                            disabled={!!loadingAnalysis}
                                            className="p-1.5 bg-discord-accent hover:bg-discord-accentHover text-white rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {loadingAnalysis === note.id ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-xs text-discord-textMuted bg-discord-panel px-2 py-0.5 rounded">{note.folder}</span>
                                    {note.aiAnalysis && (
                                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${getDifficultyColor(note.aiAnalysis.difficulty)}`}>
                                            {note.aiAnalysis.estimatedMinutes}m
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {notes.length === 0 && <p className="text-discord-textMuted text-sm">Create notes to study.</p>}
                </div>
            </div>


            <div className="lg:col-span-2 space-y-6">
                <div className="bg-discord-panel p-6 rounded-2xl border border-white/5 min-h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white">Active Learning Queue</h3>
                            <p className="text-discord-textMuted text-sm">Select what you want to conquer today.</p>
                        </div>
                        <button
                            onClick={generatePlan}
                            disabled={queue.length === 0 || generatingRoutine}
                            className="bg-discord-green hover:bg-green-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                            {generatingRoutine ? <RefreshCw className="animate-spin" /> : <PlayCircle />}
                            {generatingRoutine ? "Generating..." : "Generate Routine"}
                        </button>
                    </div>

                    {queue.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-xl">
                            <BrainCircuit size={48} className="mx-auto text-discord-textMuted opacity-30 mb-4" />
                            <p className="text-discord-textMuted">Your queue is empty. Add notes from the library.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {queue
                                .filter(item => notes.find(n => n.id === item.noteId)) // Validate items before rendering
                                .map((item, idx) => {
                                    const note = notes.find(n => n.id === item.noteId);
                                    return (
                                        <div key={item.id} className="bg-discord-bg p-4 rounded-xl border border-white/5 flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center justify-center w-12 h-12 bg-discord-panel rounded-lg border border-white/5 text-discord-textMuted font-bold text-lg">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white text-lg">{note?.title}</h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        {note?.aiAnalysis ? (
                                                            <>
                                                                <span className={`text-xs px-2 py-0.5 rounded capitalize ${getDifficultyColor(note?.aiAnalysis.difficulty)}`}>
                                                                    {note?.aiAnalysis.difficulty}
                                                                </span>
                                                                <span className="text-xs text-discord-textMuted flex items-center gap-1">
                                                                    <Clock size={12} /> {note?.aiAnalysis.estimatedMinutes}m est.
                                                                </span>
                                                                <span className="text-xs text-discord-textMuted capitalize">
                                                                    Load: {note?.aiAnalysis.cognitiveLoad}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-discord-textMuted italic">Analysis pending...</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <select
                                                    value={item.priority}
                                                    onChange={(e) => {
                                                        const updated = queue.map(q => q.id === item.id ? { ...q, priority: e.target.value as any } : q);
                                                        setQueue(updated);
                                                    }}
                                                    className="bg-discord-panel text-sm text-white border border-white/10 rounded-lg px-2 py-1 focus:outline-none"
                                                >
                                                    <option value="high">High Priority</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="low">Low</option>
                                                </select>
                                                <button onClick={() => removeFromQueue(item.id)} className="text-discord-textMuted hover:text-red-400 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderSchedule = () => (
        <div className="max-w-4xl mx-auto">
            {routineMeta && (
                <div className={`mb-8 p-4 border rounded-xl flex items-start gap-4 ${panicMode ? 'bg-red-500/10 border-red-500/20' : 'bg-discord-accent/10 border-discord-accent/20'}`}>
                    <div className="mt-1">
                        {panicMode ? <AlertTriangle className="text-red-500" size={24} /> : <BrainCircuit className="text-discord-accent" size={24} />}
                    </div>
                    <div>
                        <h4 className={`font-bold mb-1 ${panicMode ? 'text-red-400' : 'text-white'}`}>{panicMode ? "PANIC MODE ACTIVE" : "AI Projection"}</h4>
                        <p className="text-discord-text leading-relaxed">{routineMeta.projection}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-discord-textMuted uppercase tracking-wider font-bold">Confidence:</span>
                            <span className={`text-xs font-bold uppercase ${routineMeta.confidence === 'high' ? 'text-green-400' : 'text-yellow-400'}`}>
                                {routineMeta.confidence}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end mb-4 gap-3">
                {panicMode && (
                    <button
                        onClick={undoPanicMode}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all bg-discord-panel hover:bg-white/10 text-white border border-white/10"
                    >
                        <RefreshCw size={16} /> Undo Panic
                    </button>
                )}
                <button
                    onClick={activatePanicMode}
                    disabled={generatingRoutine || panicMode || tasks.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shadow-lg
                    ${panicMode
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50 cursor-default'
                            : 'bg-red-500 hover:bg-red-600 text-white animate-pulse'}`}
                >
                    {generatingRoutine && panicMode ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" />}
                    {panicMode ? "Panic Mode Active" : "PANIC BUTTON"}
                </button>
            </div>

            <div className="space-y-6 relative">

                <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-white/5"></div>

                {tasks.length === 0 && (
                    <div className="text-center text-discord-textMuted py-10">
                        No schedule yet. Go to Plan tab to generate one.
                    </div>
                )}

                {/* Add Task Button */}
<button
  onClick={addManualTask}
  className="mb-6 px-4 py-2 rounded-lg bg-discord-accent text-white hover:opacity-90 transition"
>
  + Add Task
</button>

<DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task, idx) => (
              <SortableTask key={task.id} id={task.id}>
                <div className="relative bg-discord-card p-4 rounded-xl">
                  {/* Delete Task */}
                  <button
                    onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))}
                    className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition"
                  >
                    ✕
                  </button>

                  <div className="mt-4 border-t border-gray-700 pt-3">
                    <button
                      onClick={() => {
                        const newSubtask = {
                          id: crypto.randomUUID(),
                          title: "New Subtask",
                          completed: false,
                        };
                        setTasks(prev =>
                          prev.map(t =>
                            t.id === task.id
                              ? { ...t, subTasks: [...(t.subTasks || []), newSubtask] }
                              : t
                          )
                        );
                      }}
                      className="text-sm text-indigo-400 hover:text-indigo-600 mb-2"
                    >
                      + Add Subtask
                    </button>


      <div className="space-y-2">
        {(task.subTasks || []).map(sub => (
          <div key={sub.id} className="flex items-center gap-2">

            <input
              type="checkbox"
              checked={sub.completed}
              onChange={() =>
                setTasks(prev =>
                  prev.map(t =>
                    t.id === task.id
                      ? {
                          ...t,
                          subTasks: t.subTasks.map(s =>
                            s.id === sub.id
                              ? { ...s, completed: !s.completed }
                              : s
                          )
                        }
                      : t
                  )
                )
              }
            />

            <input
              value={sub.title}
              onChange={(e) =>
                setTasks(prev =>
                  prev.map(t =>
                    t.id === task.id
                      ? {
                          ...t,
                          subTasks: t.subTasks.map(s =>
                            s.id === sub.id
                              ? { ...s, title: e.target.value }
                              : s
                          )
                        }
                      : t
                  )
                )
              }
              className="bg-transparent border-b border-gray-600 text-sm text-white focus:outline-none"
            />

            <button
              onClick={() =>
                setTasks(prev =>
                  prev.map(t =>
                    t.id === task.id
                      ? {
                          ...t,
                          subTasks: t.subTasks.filter(s => s.id !== sub.id)
                        }
                      : t
                  )
                )
              }
              className="text-red-400 text-xs"
            >
              ✕
            </button>
            </div>
             ))}
      </div></div>


          
 <div className={`
                          w-12 h-12 rounded-full border-4 shrink-0 flex items-center justify-center z-10 transition-colors
                          ${task.completed ? 'bg-discord-bg border-discord-textMuted' :
                                task.type === 'procastify' ? 'bg-discord-bg border-purple-400' :
                                    task.type === 'break' ? 'bg-discord-bg border-green-400' :
                                        panicMode ? 'bg-discord-bg border-red-400' :
                                            'bg-discord-panel border-discord-accent'}
                      `}>
                            {task.completed ? <CheckCircle size={20} className="text-discord-textMuted" /> :
                                task.type === 'procastify' ? <Coffee size={20} className="text-purple-400" /> :
                                    task.type === 'break' ? <Coffee size={20} className="text-green-400" /> :
                                        <span className="font-bold text-white text-sm">{idx + 1}</span>
                            }
                        </div>


                        <div className={`
                          flex-1 p-5 rounded-2xl border transition-all relative overflow-hidden
                          ${task.type === 'procastify' ? 'bg-purple-500/5 border-purple-500/20' :
                                task.type === 'break' ? 'bg-green-500/5 border-green-500/20' :
                                    panicMode ? 'bg-red-500/5 border-red-500/20' :
                                        'bg-discord-panel border-white/5 hover:border-discord-accent/50'}
                      `}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-bold uppercase tracking-wider
                                          ${task.type === 'procastify' ? 'text-purple-400' :
                                                task.type === 'break' ? 'text-green-400' :
                                                    panicMode ? 'text-red-400' : 'text-discord-accent'}
                                      `}>
                                            {task.type === 'procastify' ? 'Guilt-Free Break' : task.type}
                                        </span>
                                        <span className="text-xs text-discord-textMuted flex items-center gap-1">
                                            <div className="flex items-center gap-1">
  <Clock size={12} />
  <input
    type="number"
    value={task.durationMinutes}
    onChange={(e) =>
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? { ...t, durationMinutes: Number(e.target.value) }
            : t
        )
      )
    }
    className="w-14 bg-transparent border-b border-gray-600 text-white text-sm focus:outline-none focus:border-indigo-500"
  />
  <span className="text-gray-400 text-sm">m</span>
</div>

                                        </span>
                                    </div>
                                    <input
  type="text"
  value={task.title}
  onChange={(e) =>
    setTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? { ...t, title: e.target.value }
          : t
      )
    )
  }
  className="font-bold text-xl text-white bg-transparent border-b border-gray-600 focus:outline-none focus:border-indigo-500 w-full"
/>

                                </div>
                                <button
                                    onClick={() => updateTaskStatus(task.id)}
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center hover:bg-white/10 transition-colors
                                      ${task.completed ? 'bg-discord-accent border-discord-accent text-white' : 'border-white/20 text-white'}
                                  `}
                                >
                                    {task.completed && <CheckCircle size={16} />}
                                </button>
                            </div>

                            {task.type === 'focus' && !task.completed && (
                                <button
                                    onClick={() => onStartTask(task)}
                                    className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
                                >
                                    <PlayCircle size={16} /> Start Timer
                                </button>
                            )}
                        </div>
                    </div>
                    </SortableTask>
                ))}
                </SortableContext>
        </DndContext>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <CalendarCheck className="text-discord-accent" /> Intelligent Routine
                    </h1>
                    <p className="text-discord-textMuted mt-1">
                        Optimized for <strong>{user.energyPeak}</strong> energy peak. {user.freeTimeHours}h free today.
                    </p>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-3 bg-discord-panel hover:bg-discord-hover text-discord-text rounded-xl transition-colors border border-white/5"
                >
                    <Settings size={20} />
                </button>
            </div>


            {showSettings && (
                <div className="mb-8 bg-discord-panel p-6 rounded-2xl border border-white/5 animate-in slide-in-from-top-2">
                    <h3 className="font-bold text-white mb-4">Daily Calibration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-xs text-discord-textMuted uppercase font-bold block mb-2">Available Hours</label>
                            <input
                                type="number"
                                value={user.freeTimeHours}
                                onChange={(e) => setUser({ ...user, freeTimeHours: Number(e.target.value) })}
                                className="w-full bg-discord-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-discord-textMuted uppercase font-bold block mb-2">Energy Peak</label>
                            <select
                                value={user.energyPeak}
                                onChange={(e) => setUser({ ...user, energyPeak: e.target.value as any })}
                                className="w-full bg-discord-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                            >
                                <option value="morning">Morning</option>
                                <option value="afternoon">Afternoon</option>
                                <option value="night">Night</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-discord-textMuted uppercase font-bold block mb-2">Distraction Level</label>
                            <select
                                value={user.distractionLevel}
                                onChange={(e) => setUser({ ...user, distractionLevel: e.target.value as any })}
                                className="w-full bg-discord-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                            >
                                <option value="low">Low (Deep Work)</option>
                                <option value="medium">Medium</option>
                                <option value="high">High (More Breaks)</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}


            <div className="flex gap-1 bg-discord-panel p-1 rounded-xl border border-white/5 w-fit mb-8">
                {[
                    { id: 'plan', label: '1. Plan & Queue', icon: BrainCircuit },
                    { id: 'schedule', label: '2. Today\'s Schedule', icon: CalendarCheck },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all
                    ${activeTab === tab.id
                                ? 'bg-discord-accent text-white shadow-md'
                                : 'text-discord-textMuted hover:bg-white/5 hover:text-white'}
                `}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>


            <div className="flex-1">
                {activeTab === 'plan' && renderQueue()}
                {activeTab === 'schedule' && renderSchedule()}
            </div>
        </div>
    );
};

export default Routine;