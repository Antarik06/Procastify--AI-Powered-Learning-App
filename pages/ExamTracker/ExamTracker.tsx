import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import {
  BookOpen, Plus, Trash2, Clock, Calendar, TrendingUp,
  Target, Flame, Award, ChevronRight, Edit2, Check, X,
  BarChart2, PieChart as PieIcon, Activity, Star, Zap,
  Download, Bell, ChevronDown, CheckCircle2, BookMarked,
  Timer, ArrowRight, AlertTriangle, Trophy, Layers,
} from 'lucide-react';
import { Exam, Subject, StudyLog, Topic } from './types';
import { ExamTrackerService } from './examTrackerService';

// ── Color palette for subjects ────────────────────────────────
const SUBJECT_COLORS = [
  '#5865F2', '#57F287', '#FEE75C', '#ED4245',
  '#EB459E', '#3BA55D', '#FAA61A', '#9B59B6',
  '#1ABC9C', '#E67E22', '#2ECC71', '#3498DB',
];

// ── Helpers ───────────────────────────────────────────────────
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const today = () => new Date().toISOString().split('T')[0];

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

// ── Custom tooltip for recharts ────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111214] border border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-[#b5bac1] mb-1 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill || '#5865F2' }} className="font-bold">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}h
        </p>
      ))}
    </div>
  );
};

// ── Tab type ──────────────────────────────────────────────────
type Tab = 'overview' | 'subjects' | 'log' | 'analytics';

// ── Main Component ────────────────────────────────────────────
interface ExamTrackerProps {
  userId: string;
}

const ExamTracker: React.FC<ExamTrackerProps> = ({ userId }) => {
  // ── State ─────────────────────────────────────────────────
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Exam form
  const [showExamForm, setShowExamForm] = useState(false);
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // Subject form
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectPlanned, setSubjectPlanned] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

  // Topic form
  const [addingTopicForSubjectId, setAddingTopicForSubjectId] = useState<string | null>(null);
  const [topicName, setTopicName] = useState('');
  const [topicPlanned, setTopicPlanned] = useState('');

  // Log form
  const [logSubjectId, setLogSubjectId] = useState('');
  const [logTopicId, setLogTopicId] = useState('');
  const [logHours, setLogHours] = useState('');
  const [logDate, setLogDate] = useState(today());
  const [logNote, setLogNote] = useState('');
  const [logSuccess, setLogSuccess] = useState(false);

  // ── Load from storage ─────────────────────────────────────
  useEffect(() => {
    const state = ExamTrackerService.getState();
    setExams(state.exams);
    setSubjects(state.subjects);
    setLogs(state.logs);
    if (state.exams.length > 0) setSelectedExamId(state.exams[0].id);
  }, []);

  // ── Derived data ──────────────────────────────────────────
  const selectedExam = useMemo(
    () => exams.find((e) => e.id === selectedExamId) ?? null,
    [exams, selectedExamId]
  );

  const examSubjects = useMemo(
    () => subjects.filter((s) => s.examId === selectedExamId),
    [subjects, selectedExamId]
  );

  const examLogs = useMemo(
    () => logs.filter((l) => l.examId === selectedExamId),
    [logs, selectedExamId]
  );

  const totalHoursLogged = useMemo(
    () => examLogs.reduce((sum, l) => sum + l.hours, 0),
    [examLogs]
  );

  const totalPlannedHours = useMemo(
    () => examSubjects.reduce((sum, s) => sum + s.plannedHours, 0),
    [examSubjects]
  );

  const daysLeft = selectedExam ? daysUntil(selectedExam.date) : null;

  // Streak calculation
  const streak = useMemo(() => {
    if (!examLogs.length) return 0;
    const logDates = new Set(examLogs.map((l) => l.date));
    let count = 0;
    let d = new Date();
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      if (logDates.has(dateStr)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return count;
  }, [examLogs]);

  // Hours per subject (for pie chart)
  const hoursPerSubject = useMemo(() =>
    examSubjects.map((s) => ({
      name: s.name,
      value: examLogs.filter((l) => l.subjectId === s.id).reduce((sum, l) => sum + l.hours, 0),
      planned: s.plannedHours,
      color: s.color,
    })).filter((d) => d.value > 0 || d.planned > 0),
    [examSubjects, examLogs]
  );

  // Topic-wise bar chart data
  const topicBarData = useMemo(() => {
    const rows: { name: string; actual: number; planned: number; color: string }[] = [];
    examSubjects.forEach((s) => {
      s.topics.forEach((t) => {
        const actual = examLogs
          .filter((l) => l.subjectId === s.id && l.topicId === t.id)
          .reduce((sum, l) => sum + l.hours, 0);
        rows.push({ name: `${t.name}`, actual, planned: t.plannedHours, color: s.color });
      });
    });
    return rows;
  }, [examSubjects, examLogs]);

  // Cumulative line chart (last 30 days)
  const cumulativeData = useMemo(() => {
    const days = getLast30Days();
    let cumulative = 0;
    return days.map((date) => {
      const dayHours = examLogs
        .filter((l) => l.date === date)
        .reduce((sum, l) => sum + l.hours, 0);
      cumulative += dayHours;
      return {
        date: date.slice(5), // MM-DD
        daily: dayHours,
        cumulative,
      };
    });
  }, [examLogs]);

  // Calendar heatmap (last 30 days)
  const heatmapData = useMemo(() => {
    const days = getLast30Days();
    return days.map((date) => {
      const hours = examLogs.filter((l) => l.date === date).reduce((sum, l) => sum + l.hours, 0);
      return { date, hours };
    });
  }, [examLogs]);

  const maxHeatmap = Math.max(...heatmapData.map((d) => d.hours), 1);

  // ── Actions ───────────────────────────────────────────────

  const handleSaveExam = () => {
    if (!examName.trim() || !examDate) return;
    const exam: Exam = {
      id: editingExamId ?? uid(),
      name: examName.trim(),
      date: examDate,
      description: examDesc.trim() || undefined,
      createdAt: Date.now(),
    };
    ExamTrackerService.saveExam(exam);
    setExams((prev) => {
      const idx = prev.findIndex((e) => e.id === exam.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = exam; return n; }
      return [...prev, exam];
    });
    if (!selectedExamId) setSelectedExamId(exam.id);
    resetExamForm();
  };

  const resetExamForm = () => {
    setShowExamForm(false);
    setExamName(''); setExamDate(''); setExamDesc('');
    setEditingExamId(null);
  };

  const handleEditExam = (exam: Exam) => {
    setExamName(exam.name);
    setExamDate(exam.date);
    setExamDesc(exam.description ?? '');
    setEditingExamId(exam.id);
    setShowExamForm(true);
  };

  const handleDeleteExam = (examId: string) => {
    ExamTrackerService.deleteExam(examId);
    setExams((prev) => prev.filter((e) => e.id !== examId));
    setSubjects((prev) => prev.filter((s) => s.examId !== examId));
    setLogs((prev) => prev.filter((l) => l.examId !== examId));
    if (selectedExamId === examId) setSelectedExamId(exams.find((e) => e.id !== examId)?.id ?? null);
  };

  const handleSaveSubject = () => {
    if (!subjectName.trim() || !selectedExamId) return;
    const existing = editingSubjectId ? subjects.find((s) => s.id === editingSubjectId) : null;
    const subject: Subject = {
      id: editingSubjectId ?? uid(),
      examId: selectedExamId,
      name: subjectName.trim(),
      color: existing?.color ?? SUBJECT_COLORS[examSubjects.length % SUBJECT_COLORS.length],
      plannedHours: parseFloat(subjectPlanned) || 0,
      topics: existing?.topics ?? [],
      createdAt: existing?.createdAt ?? Date.now(),
    };
    ExamTrackerService.saveSubject(subject);
    setSubjects((prev) => {
      const idx = prev.findIndex((s) => s.id === subject.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = subject; return n; }
      return [...prev, subject];
    });
    setShowSubjectForm(false);
    setSubjectName(''); setSubjectPlanned(''); setEditingSubjectId(null);
  };

  const handleDeleteSubject = (subjectId: string) => {
    ExamTrackerService.deleteSubject(subjectId);
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    setLogs((prev) => prev.filter((l) => l.subjectId !== subjectId));
  };

  const handleAddTopic = (subjectId: string) => {
    if (!topicName.trim()) return;
    const topic: Topic = {
      id: uid(),
      name: topicName.trim(),
      plannedHours: parseFloat(topicPlanned) || 0,
    };
    setSubjects((prev) => prev.map((s) => {
      if (s.id !== subjectId) return s;
      const updated = { ...s, topics: [...s.topics, topic] };
      ExamTrackerService.saveSubject(updated);
      return updated;
    }));
    setTopicName(''); setTopicPlanned('');
    setAddingTopicForSubjectId(null);
  };

  const handleDeleteTopic = (subjectId: string, topicId: string) => {
    setSubjects((prev) => prev.map((s) => {
      if (s.id !== subjectId) return s;
      const updated = { ...s, topics: s.topics.filter((t) => t.id !== topicId) };
      ExamTrackerService.saveSubject(updated);
      return updated;
    }));
    setLogs((prev) => prev.filter((l) => !(l.subjectId === subjectId && l.topicId === topicId)));
  };

  const handleLogStudy = () => {
    if (!logSubjectId || !logHours || !selectedExamId) return;
    const hours = parseFloat(logHours);
    if (isNaN(hours) || hours <= 0) return;
    const log: StudyLog = {
      id: uid(),
      examId: selectedExamId,
      subjectId: logSubjectId,
      topicId: logTopicId || undefined,
      date: logDate,
      hours,
      note: logNote.trim() || undefined,
      createdAt: Date.now(),
    };
    ExamTrackerService.saveLog(log);
    setLogs((prev) => [...prev, log]);
    setLogHours(''); setLogNote(''); setLogTopicId('');
    setLogSuccess(true);
    setTimeout(() => setLogSuccess(false), 2000);
  };

  const handleDeleteLog = (logId: string) => {
    ExamTrackerService.deleteLog(logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  // Export CSV
  const handleExport = () => {
    if (!selectedExam) return;
    const rows = [
      ['Date', 'Subject', 'Topic', 'Hours', 'Note'],
      ...examLogs.map((l) => {
        const sub = subjects.find((s) => s.id === l.subjectId);
        const topic = sub?.topics.find((t) => t.id === l.topicId);
        return [l.date, sub?.name ?? '', topic?.name ?? '', l.hours, l.note ?? ''];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExam.name.replace(/\s+/g, '_')}_study_log.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Heatmap cell color ────────────────────────────────────
  const heatColor = (hours: number) => {
    if (hours === 0) return 'bg-white/5';
    const intensity = Math.min(hours / maxHeatmap, 1);
    if (intensity < 0.25) return 'bg-discord-accent/20';
    if (intensity < 0.5) return 'bg-discord-accent/40';
    if (intensity < 0.75) return 'bg-discord-accent/70';
    return 'bg-discord-accent';
  };

  // ── Tab bar ───────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Target size={15} /> },
    { id: 'subjects', label: 'Subjects', icon: <BookOpen size={15} /> },
    { id: 'log', label: 'Log Study', icon: <Clock size={15} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={15} /> },
  ];

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#1e1f22] text-white">
      {/* ── Header ── */}
      <div className="bg-[#111214] border-b border-white/5 px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-discord-accent/10 border border-discord-accent/20 flex items-center justify-center">
              <BookMarked size={18} className="text-discord-accent" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">Exam Tracker</h1>
              <p className="text-[#b5bac1] text-xs mt-0.5">Track your study progress</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Exam selector */}
            {exams.length > 0 && (
              <div className="relative">
                <select
                  value={selectedExamId ?? ''}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="bg-[#2b2d31] border border-white/10 text-white text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-discord-accent/50 appearance-none cursor-pointer"
                >
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-[#b5bac1] pointer-events-none" />
              </div>
            )}
            {selectedExam && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[#b5bac1] hover:text-white rounded-xl text-sm transition-all"
              >
                <Download size={14} /> Export
              </button>
            )}
            <button
              onClick={() => { setShowExamForm(true); setEditingExamId(null); setExamName(''); setExamDate(''); setExamDesc(''); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-discord-accent/10 hover:bg-discord-accent/20 border border-discord-accent/20 text-discord-accent rounded-xl text-sm font-semibold transition-all"
            >
              <Plus size={15} /> New Exam
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-discord-accent/15 text-discord-accent border border-discord-accent/20'
                  : 'text-[#b5bac1] hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Exam Form Modal ── */}
      {showExamForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={resetExamForm} />
          <div className="relative bg-[#111214] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-bold text-white text-lg mb-4">{editingExamId ? 'Edit Exam' : 'Add New Exam'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1">Exam Name *</label>
                <input
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. Final Exam, GATE 2025..."
                  autoFocus
                  className="w-full bg-[#2b2d31] border border-white/10 focus:border-discord-accent/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[#6d6f78] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1">Exam Date *</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-[#2b2d31] border border-white/10 focus:border-discord-accent/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1">Description</label>
                <textarea
                  value={examDesc}
                  onChange={(e) => setExamDesc(e.target.value)}
                  placeholder="Optional notes about this exam..."
                  rows={2}
                  className="w-full bg-[#2b2d31] border border-white/10 focus:border-discord-accent/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[#6d6f78] focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={resetExamForm} className="flex-1 py-2.5 bg-[#2b2d31] hover:bg-[#383a40] border border-white/10 text-[#b5bac1] rounded-xl text-sm font-semibold transition-all">Cancel</button>
              <button onClick={handleSaveExam} disabled={!examName.trim() || !examDate} className="flex-1 py-2.5 bg-discord-accent hover:bg-discord-accent/80 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-40">
                {editingExamId ? 'Save Changes' : 'Create Exam'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── No exam selected ── */}
      {!selectedExam && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-[#2b2d31] border border-white/5 flex items-center justify-center">
            <BookMarked size={36} className="text-[#6d6f78]" />
          </div>
          <h3 className="text-white font-bold text-xl">No Exam Yet</h3>
          <p className="text-[#b5bac1] text-sm max-w-xs">Create your first exam to start tracking your study progress, subjects, and analytics.</p>
          <button
            onClick={() => setShowExamForm(true)}
            className="flex items-center gap-2 px-5 py-3 bg-discord-accent hover:bg-discord-accent/80 text-white rounded-xl text-sm font-bold transition-all"
          >
            <Plus size={16} /> Create First Exam
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      {selectedExam && (
        <div className="p-6 max-w-7xl mx-auto">

          {/* ════════════════ OVERVIEW TAB ════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Exam countdown hero */}
              <div className="relative overflow-hidden rounded-2xl border border-discord-accent/20 bg-gradient-to-br from-discord-accent/10 via-[#2b2d31] to-[#1e1f22] p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-discord-accent bg-discord-accent/10 px-2 py-0.5 rounded-full border border-discord-accent/20">
                        {daysLeft !== null && daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'TODAY!' : 'Past'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-white">{selectedExam.name}</h2>
                    <p className="text-[#b5bac1] text-sm mt-1 flex items-center gap-1.5">
                      <Calendar size={13} /> {formatDate(selectedExam.date)}
                    </p>
                    {selectedExam.description && (
                      <p className="text-[#b5bac1] text-xs mt-2 max-w-sm">{selectedExam.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-black text-discord-accent tabular-nums">
                      {daysLeft !== null ? Math.abs(daysLeft) : '--'}
                    </div>
                    <div className="text-[#b5bac1] text-xs">
                      {daysLeft !== null && daysLeft >= 0 ? 'days to go' : 'days ago'}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-[#b5bac1] mb-1.5">
                    <span>{totalHoursLogged.toFixed(1)}h studied</span>
                    <span>{totalPlannedHours}h planned</span>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-discord-accent to-purple-500 rounded-full transition-all duration-700"
                      style={{ width: `${totalPlannedHours > 0 ? Math.min((totalHoursLogged / totalPlannedHours) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-discord-accent font-bold mt-1 text-right">
                    {totalPlannedHours > 0 ? Math.round((totalHoursLogged / totalPlannedHours) * 100) : 0}% complete
                  </p>
                </div>

                {/* Edit/Delete */}
                <div className="absolute top-4 right-4 flex gap-1">
                  <button onClick={() => handleEditExam(selectedExam)} className="p-1.5 rounded-lg text-[#b5bac1] hover:text-white hover:bg-white/10 transition-all"><Edit2 size={13} /></button>
                  <button onClick={() => handleDeleteExam(selectedExam.id)} className="p-1.5 rounded-lg text-[#b5bac1] hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Hours Studied', value: totalHoursLogged.toFixed(1) + 'h', icon: <Clock size={16} />, color: 'text-discord-accent' },
                  { label: 'Study Streak', value: streak + ' days', icon: <Flame size={16} />, color: 'text-orange-400' },
                  { label: 'Subjects', value: examSubjects.length, icon: <BookOpen size={16} />, color: 'text-green-400' },
                  { label: 'Topics', value: examSubjects.reduce((s, sub) => s + sub.topics.length, 0), icon: <Layers size={16} />, color: 'text-yellow-400' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[#2b2d31] border border-white/5 rounded-2xl p-4">
                    <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                    <div className="text-2xl font-black text-white">{stat.value}</div>
                    <div className="text-xs text-[#b5bac1] mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick chart preview */}
              {hoursPerSubject.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#2b2d31] border border-white/5 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><PieIcon size={14} className="text-discord-accent" /> Hours by Subject</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={hoursPerSubject} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name">
                          {hoursPerSubject.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {hoursPerSubject.map((s) => (
                        <span key={s.name} className="flex items-center gap-1 text-xs text-[#b5bac1]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#2b2d31] border border-white/5 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Activity size={14} className="text-green-400" /> Cumulative Progress</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={cumulativeData.slice(-14)}>
                        <defs>
                          <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5865F2" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#5865F2" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fill: '#b5bac1', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#b5bac1', fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="cumulative" stroke="#5865F2" fill="url(#cumGrad)" strokeWidth={2} name="Cumulative" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Calendar heatmap */}
              <div className="bg-[#2b2d31] border border-white/5 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Calendar size={14} className="text-yellow-400" /> Study Activity (Last 30 Days)</h3>
                <div className="flex flex-wrap gap-1.5">
                  {heatmapData.map((d) => (
                    <div
                      key={d.date}
                      title={`${d.date}: ${d.hours.toFixed(1)}h`}
                      className={`w-7 h-7 rounded-md transition-all cursor-default ${heatColor(d.hours)}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-[#b5bac1]">Less</span>
                  {['bg-white/5', 'bg-discord-accent/20', 'bg-discord-accent/40', 'bg-discord-accent/70', 'bg-discord-accent'].map((c) => (
                    <div key={c} className={`w-4 h-4 rounded ${c}`} />
                  ))}
                  <span className="text-xs text-[#b5bac1]">More</span>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ SUBJECTS TAB ════════════════ */}
          {activeTab === 'subjects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Subjects & Topics</h2>
                <button
                  onClick={() => { setShowSubjectForm(true); setEditingSubjectId(null); setSubjectName(''); setSubjectPlanned(''); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-discord-accent/10 hover:bg-discord-accent/20 border border-discord-accent/20 text-discord-accent rounded-xl text-sm font-semibold transition-all"
                >
                  <Plus size={15} /> Add Subject
                </button>
              </div>

              {/* Subject form inline */}
              {showSubjectForm && (
                <div className="bg-[#2b2d31] border border-discord-accent/20 rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-discord-accent mb-3">{editingSubjectId ? 'Edit Subject' : 'New Subject'}</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="Subject name..."
                      autoFocus
                      className="bg-[#1e1f22] border border-white/10 focus:border-discord-accent/50 rounded-xl px-3 py-2 text-white text-sm placeholder:text-[#6d6f78] focus:outline-none"
                    />
                    <input
                      type="number"
                      value={subjectPlanned}
                      onChange={(e) => setSubjectPlanned(e.target.value)}
                      placeholder="Planned hours..."
                      min={0}
                      className="bg-[#1e1f22] border border-white/10 focus:border-discord-accent/50 rounded-xl px-3 py-2 text-white text-sm placeholder:text-[#6d6f78] focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveSubject} className="px-4 py-2 bg-discord-accent hover:bg-discord-accent/80 text-white rounded-xl text-sm font-bold transition-all">Save</button>
                    <button onClick={() => { setShowSubjectForm(false); setSubjectName(''); setSubjectPlanned(''); setEditingSubjectId(null); }} className="px-4 py-2 bg-[#1e1f22] border border-white/10 text-[#b5bac1] rounded-xl text-sm transition-all">Cancel</button>
                  </div>
                </div>
              )}

              {examSubjects.length === 0 && !showSubjectForm && (
                <div className="text-center py-12 text-[#b5bac1] text-sm">
                  <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
                  No subjects yet. Add your first subject to get started.
                </div>
              )}

              {examSubjects.map((subject) => {
                const subjectHours = examLogs.filter((l) => l.subjectId === subject.id).reduce((s, l) => s + l.hours, 0);
                const pct = subject.plannedHours > 0 ? Math.min((subjectHours / subject.plannedHours) * 100, 100) : 0;
                return (
                  <div key={subject.id} className="bg-[#2b2d31] border border-white/5 rounded-2xl overflow-hidden">
                    {/* Subject header */}
                    <div className="flex items-center gap-3 p-4 border-b border-white/5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-white text-sm">{subject.name}</h3>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-[#b5bac1]">{subjectHours.toFixed(1)}h / {subject.plannedHours}h</span>
                            <button onClick={() => { setSubjectName(subject.name); setSubjectPlanned(String(subject.plannedHours)); setEditingSubjectId(subject.id); setShowSubjectForm(true); }}
                              className="p-1 rounded text-[#b5bac1] hover:text-white hover:bg-white/10 transition-all ml-1"><Edit2 size={12} /></button>
                            <button onClick={() => handleDeleteSubject(subject.id)}
                              className="p-1 rounded text-[#b5bac1] hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: subject.color }} />
                        </div>
                      </div>
                    </div>

                    {/* Topics */}
                    <div className="p-3 space-y-1.5">
                      {subject.topics.map((topic) => {
                        const topicHours = examLogs.filter((l) => l.subjectId === subject.id && l.topicId === topic.id).reduce((s, l) => s + l.hours, 0);
                        return (
                          <div key={topic.id} className="flex items-center gap-2 px-3 py-2 bg-white/3 hover:bg-white/5 rounded-xl group">
                            <ArrowRight size={11} className="text-[#6d6f78] shrink-0" />
                            <span className="flex-1 text-sm text-[#b5bac1]">{topic.name}</span>
                            <span className="text-xs text-[#6d6f78]">{topicHours.toFixed(1)}h / {topic.plannedHours}h</span>
                            <button onClick={() => handleDeleteTopic(subject.id, topic.id)}
                              className="p-1 rounded text-[#6d6f78] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X size={11} /></button>
                          </div>
                        );
                      })}

                      {/* Add topic inline */}
                      {addingTopicForSubjectId === subject.id ? (
                        <div className="flex items-center gap-2 px-1">
                          <input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Topic name..." autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTopic(subject.id); if (e.key === 'Escape') setAddingTopicForSubjectId(null); }}
                            className="flex-1 bg-[#1e1f22] border border-discord-accent/30 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none" />
                          <input value={topicPlanned} onChange={(e) => setTopicPlanned(e.target.value)} placeholder="Hours" type="number" min={0}
                            className="w-20 bg-[#1e1f22] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                          <button onClick={() => handleAddTopic(subject.id)} className="p-1.5 bg-discord-accent rounded-lg text-white"><Check size={12} /></button>
                          <button onClick={() => setAddingTopicForSubjectId(null)} className="p-1.5 bg-white/5 rounded-lg text-[#b5bac1]"><X size={12} /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setAddingTopicForSubjectId(subject.id); setTopicName(''); setTopicPlanned(''); }}
                          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6d6f78] hover:text-discord-accent hover:bg-discord-accent/5 rounded-xl transition-all">
                          <Plus size={12} /> Add Topic
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ════════════════ LOG STUDY TAB ════════════════ */}
          {activeTab === 'log' && (
            <div className="space-y-6 max-w-2xl">
              <h2 className="text-lg font-bold text-white">Log Study Session</h2>

              {/* Log form */}
              <div className="bg-[#2b2d31] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1.5">Subject *</label>
                    <select
                      value={logSubjectId}
                      onChange={(e) => { setLogSubjectId(e.target.value); setLogTopicId(''); }}
                      className="w-full bg-[#1e1f22] border border-white/10 focus:border-discord-accent/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                    >
                      <option value="">Select subject...</option>
                      {examSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1.5">Topic (optional)</label>
                    <select
                      value={logTopicId}
                      onChange={(e) => setLogTopicId(e.target.value)}
                      disabled={!logSubjectId}
                      className="w-full bg-[#1e1f22] border border-white/10 focus:border-discord-accent/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none disabled:opacity-40"
                    >
                      <option value="">No topic</option>
                      {examSubjects.find((s) => s.id === logSubjectId)?.topics.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1.5">Hours *</label>
                    <input
                      type="number"
                      value={logHours}
                      onChange={(e) => setLogHours(e.target.value)}
                      placeholder="e.g. 2.5"
                      min={0.1}
                      step={0.25}
                      className="w-full bg-[#1e1f22] border border-white/10 focus:border-discord-accent/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1.5">Date</label>
                    <input
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full bg-[#1e1f22] border border-white/10 focus:border-discord-accent/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1.5">Notes (optional)</label>
                  <input
                    value={logNote}
                    onChange={(e) => setLogNote(e.target.value)}
                    placeholder="What did you study today?"
                    className="w-full bg-[#1e1f22] border border-white/10 focus:border-discord-accent/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-[#6d6f78] focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleLogStudy}
                  disabled={!logSubjectId || !logHours}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    logSuccess
                      ? 'bg-green-500 text-white'
                      : 'bg-discord-accent hover:bg-discord-accent/80 text-white disabled:opacity-40'
                  }`}
                >
                  {logSuccess ? <><CheckCircle2 size={16} /> Logged!</> : <><Timer size={16} /> Log Study Session</>}
                </button>
              </div>

              {/* Recent logs */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3">Recent Logs</h3>
                <div className="space-y-2">
                  {examLogs.length === 0 && (
                    <p className="text-[#b5bac1] text-sm text-center py-6">No study sessions logged yet.</p>
                  )}
                  {[...examLogs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10).map((log) => {
                    const sub = subjects.find((s) => s.id === log.subjectId);
                    const topic = sub?.topics.find((t) => t.id === log.topicId);
                    return (
                      <div key={log.id} className="flex items-center gap-3 bg-[#2b2d31] border border-white/5 rounded-xl px-4 py-3 group">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub?.color ?? '#5865F2' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">{sub?.name ?? 'Unknown'}</span>
                            {topic && <span className="text-xs text-[#b5bac1]">→ {topic.name}</span>}
                          </div>
                          {log.note && <p className="text-xs text-[#6d6f78] truncate">{log.note}</p>}
                        </div>
                        <span className="text-xs text-[#b5bac1] shrink-0">{log.date}</span>
                        <span className="text-sm font-bold text-discord-accent shrink-0">{log.hours}h</span>
                        <button onClick={() => handleDeleteLog(log.id)}
                          className="p-1 rounded text-[#6d6f78] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"><X size={12} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ ANALYTICS TAB ════════════════ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white">Analytics</h2>

              {examLogs.length === 0 ? (
                <div className="text-center py-16 text-[#b5bac1]">
                  <TrendingUp size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No study data yet. Log some sessions to see analytics.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pie + bar side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie chart */}
                    <div className="bg-[#2b2d31] border border-white/5 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2"><PieIcon size={14} className="text-discord-accent" /> Hours per Subject</h3>
                      <p className="text-xs text-[#b5bac1] mb-4">Actual vs planned study time distribution</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={hoursPerSubject} cx="40%" cy="50%" outerRadius={85} dataKey="value" nameKey="name" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {hoursPerSubject.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {hoursPerSubject.map((s) => (
                          <div key={s.name} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-xs text-[#b5bac1] flex-1">{s.name}</span>
                            <span className="text-xs font-bold text-white">{s.value.toFixed(1)}h</span>
                            <span className="text-xs text-[#6d6f78]">/ {s.planned}h</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Topic bar chart */}
                    <div className="bg-[#2b2d31] border border-white/5 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2"><BarChart2 size={14} className="text-green-400" /> Topic-wise Study Hours</h3>
                      <p className="text-xs text-[#b5bac1] mb-4">Planned vs actual per topic</p>
                      {topicBarData.length === 0 ? (
                        <p className="text-xs text-[#6d6f78] text-center py-8">Add topics to subjects to see topic breakdown.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={topicBarData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#b5bac1', fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#b5bac1', fontSize: 10 }} width={80} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="planned" name="Planned" fill="rgba(255,255,255,0.1)" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="actual" name="Actual" radius={[0, 4, 4, 0]}>
                              {topicBarData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Line chart: daily + cumulative */}
                  <div className="bg-[#2b2d31] border border-white/5 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2"><TrendingUp size={14} className="text-purple-400" /> Study Progress (Last 30 Days)</h3>
                    <p className="text-xs text-[#b5bac1] mb-4">Daily hours and cumulative total</p>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={cumulativeData}>
                        <defs>
                          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5865F2" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#5865F2" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fill: '#b5bac1', fontSize: 9 }} interval={4} />
                        <YAxis tick={{ fill: '#b5bac1', fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#b5bac1' }} />
                        <Line type="monotone" dataKey="daily" stroke="#57F287" strokeWidth={2} dot={false} name="Daily" />
                        <Line type="monotone" dataKey="cumulative" stroke="#5865F2" strokeWidth={2.5} dot={false} name="Cumulative" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Calendar heatmap */}
                  <div className="bg-[#2b2d31] border border-white/5 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2"><Calendar size={14} className="text-yellow-400" /> Study Heatmap</h3>
                    <p className="text-xs text-[#b5bac1] mb-4">Daily study activity — darker = more hours</p>
                    <div className="flex flex-wrap gap-1.5">
                      {heatmapData.map((d) => (
                        <div key={d.date} title={`${d.date}: ${d.hours.toFixed(1)}h`}
                          className={`w-8 h-8 rounded-lg transition-all cursor-default flex items-center justify-center ${heatColor(d.hours)}`}>
                          <span className="text-[9px] text-white/50">{d.date.slice(8)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-[#6d6f78]">Less</span>
                      {['bg-white/5', 'bg-discord-accent/20', 'bg-discord-accent/40', 'bg-discord-accent/70', 'bg-discord-accent'].map((c, i) => (
                        <div key={i} className={`w-5 h-5 rounded-md ${c}`} />
                      ))}
                      <span className="text-xs text-[#6d6f78]">More</span>
                    </div>
                  </div>

                  {/* Gamification / streak */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-5 text-center">
                      <Flame size={28} className="text-orange-400 mx-auto mb-2" />
                      <div className="text-3xl font-black text-white">{streak}</div>
                      <div className="text-xs text-orange-300 font-semibold mt-0.5">Day Streak 🔥</div>
                      <p className="text-xs text-[#b5bac1] mt-1">{streak >= 7 ? 'On fire! Keep it up!' : streak >= 3 ? 'Great momentum!' : 'Log daily to build streak'}</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-5 text-center">
                      <Trophy size={28} className="text-yellow-400 mx-auto mb-2" />
                      <div className="text-3xl font-black text-white">{totalHoursLogged.toFixed(0)}h</div>
                      <div className="text-xs text-yellow-300 font-semibold mt-0.5">Total Studied</div>
                      <p className="text-xs text-[#b5bac1] mt-1">
                        {totalPlannedHours > 0 ? `${Math.round((totalHoursLogged / totalPlannedHours) * 100)}% of goal` : 'Keep studying!'}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20 rounded-2xl p-5 text-center">
                      <Zap size={28} className="text-green-400 mx-auto mb-2" />
                      <div className="text-3xl font-black text-white">
                        {examLogs.length > 0 ? (totalHoursLogged / Math.max(new Set(examLogs.map(l => l.date)).size, 1)).toFixed(1) : '0'}h
                      </div>
                      <div className="text-xs text-green-300 font-semibold mt-0.5">Daily Average</div>
                      <p className="text-xs text-[#b5bac1] mt-1">Across all study days</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamTracker;
