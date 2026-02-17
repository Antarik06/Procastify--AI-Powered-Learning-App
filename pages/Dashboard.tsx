import React, { useMemo, useState, useEffect } from 'react';
import { UserPreferences, Summary, Note, UserStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, BookOpen, FileText, Zap, Calendar, Flame, Trophy, ArrowRight, BrainCircuit, Sparkles, Target, PenLine } from 'lucide-react';
import { generateDashboardInsight, generateDashboardInsightAsync, DashboardInsight, CTAAction } from '../services/insightService';

interface DashboardProps {
  user: UserPreferences;
  summaries: Summary[];
  notes: Note[];
  stats: UserStats | null;
  onNoteClick?: (noteId: string) => void;
  onNavigate?: (view: string) => void;
}

interface StatCard {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ComponentType<{ size: number }>;
  color: string;
  bg: string;
}

const Dashboard: React.FC<DashboardProps> = ({ user, summaries, notes, stats, onNoteClick, onNavigate }) => {

  const safeStats = stats || {
    id: '',
    userId: '',
    totalTimeStudiedMinutes: 0,
    notesCreated: 0,
    quizzesTaken: 0,
    loginStreak: 0,
    lastLoginDate: new Date().toISOString(),
    dailyActivity: {},
    highScore: 0
  };


  const highScore = safeStats.highScore || 0;


  const actualNotesCreated = notes.length;
  const actualSummariesCount = summaries.length;


  const getLast7Days = () => {
    const getLocalDateKey = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getLocalDateKey(d);
      days.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        hours: (safeStats.dailyActivity[key] || 0) / 60 // Convert minutes to hours
      });
    }
    return days;
  };

  const activityData = getLast7Days();

  const statCards: StatCard[] = [
    {
      label: 'Highest Quiz Score',
      value: highScore > 0 ? highScore.toLocaleString() : '—',
      subtext: highScore > 0 ? undefined : 'No games yet',
      icon: Trophy,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10'
    },
    { label: 'Daily Streak', value: `${safeStats.loginStreak} Days`, icon: Flame, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: 'Notes Created', value: String(actualNotesCreated ?? 0), icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Summaries Made', value: String(actualSummariesCount ?? 0), icon: FileText, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

  // for immediate display
  const syncInsight = useMemo<DashboardInsight>(() => {
    return generateDashboardInsight(user, notes, safeStats);
  }, [user.id, notes.length, safeStats.loginStreak, safeStats.quizzesTaken]);

  const [insight, setInsight] = useState<DashboardInsight>(syncInsight);

  // Fetch AI insight when data changes
  useEffect(() => {
    setInsight(syncInsight); // Show cached/fallback immediately
    
    let cancelled = false;
    generateDashboardInsightAsync(user, notes, safeStats)
      .then((aiInsight: DashboardInsight) => {
        if (!cancelled) setInsight(aiInsight);
      })
      .catch(console.error);
    
    return () => { cancelled = true; };
  }, [user.id, notes.length, safeStats.loginStreak, safeStats.quizzesTaken]);

  const handleCTAClick = () => {
    const action = insight.ctaAction;
    switch (action.type) {
      case 'note':
        if (action.noteId) onNoteClick?.(action.noteId);
        break;
      case 'quiz':
        onNavigate?.('quiz');
        break;
      case 'focus':
        onNavigate?.('focus');
        break;
      case 'create-note':
        onNavigate?.('notes');
        break;
      default:
        break;
    }
  };

  const getInsightIcon = () => {
    switch (insight.insightType) {
      case 'analysis': return Target;
      case 'motivation': return Sparkles;
      case 'revision': return BookOpen;
      case 'action': return Zap;
      case 'humor': return Sparkles;
      default: return BrainCircuit;
    }
  };
  const InsightIcon = getInsightIcon();




  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">

      {/* ... existing header ... */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* User Avatar */}
          {user?.avatarUrl && (
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-discord-accent/30 shadow-lg">
              <img 
                src={user.avatarUrl} 
                alt={`${user.name}'s avatar`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              Welcome back, {user?.name || 'User'} <span className="animate-wave origin-bottom-right inline-block">👋</span>
            </h1>
            <p className="text-discord-textMuted mt-1">
              You're on track with your <strong>{user?.goal || 'study'}</strong> goal.
            </p>
          </div>
        </div>
        <div className="bg-discord-panel px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2 text-discord-textMuted text-sm shadow-sm backdrop-blur-sm">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Intelligent Focus Widget */}
      <div className="bg-gradient-to-r from-discord-accent to-purple-600 p-1 rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-4">
        <div className="bg-discord-bg/90 backdrop-blur-sm p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-4 md:gap-6 flex-1 min-w-0">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-discord-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
              <InsightIcon size={28} className="text-discord-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg md:text-xl font-bold text-white">{insight.welcomeMessage}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-discord-accent/20 text-discord-accent font-medium capitalize hidden sm:inline-block">
                  {insight.insightType}
                </span>
              </div>
              <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                {insight.mainMessage}
              </p>
              {insight.recommendedNote && (
                <p className="text-white/70 text-xs mt-2 flex items-center gap-1.5 truncate">
                  <BookOpen size={14} className="flex-shrink-0" />
                  <span className="truncate">{insight.recommendedNote.title}</span>
                </p>
              )}
            </div>
          </div>
          {insight.ctaLabel && insight.ctaAction.type !== 'none' && (
            <button
              onClick={handleCTAClick}
              className="bg-white text-discord-accent px-5 py-2.5 md:px-6 md:py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg whitespace-nowrap flex-shrink-0"
            >
              {insight.ctaLabel} <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ... existing stat cards ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-discord-panel p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all shadow-sm group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white tracking-tight">{stat.value}</h3>
            <p className="text-sm text-discord-textMuted font-medium">{stat.label}</p>
            {stat.subtext && (
              <p className="text-xs text-discord-textMuted/70 mt-1">{stat.subtext}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 bg-discord-panel p-6 rounded-2xl border border-white/5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap size={18} className="text-discord-accent" /> Study Activity (Hours)
            </h3>
          </div>
          <div style={{ width: '100%', height: '256px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <XAxis dataKey="name" stroke="#949ba4" tickLine={false} axisLine={false} />
                <YAxis stroke="#949ba4" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111214', border: '1px solid #2b2d31', borderRadius: '12px' }}
                  itemStyle={{ color: '#dbdee1' }}
                  cursor={{ fill: '#35373c' }}
                />
                <Bar dataKey="hours" fill="#5865F2" radius={[6, 6, 0, 0]} barSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>


        <div className="bg-discord-panel p-6 rounded-2xl border border-white/5 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-discord-accent" /> Recent Notes
          </h3>
          <div className="space-y-2 overflow-y-auto flex-1 max-h-[300px] pr-2 custom-scrollbar">
            {notes.slice(0, 5).map(note => (
              <div
                key={note.id}
                onClick={() => onNoteClick?.(note.id)}
                className="p-3 bg-discord-bg rounded-lg border border-white/5 hover:bg-discord-hover hover:border-discord-accent/30 transition-all cursor-pointer group">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white truncate flex-1 group-hover:text-discord-accent transition-colors">
                    {note.title.length > 50 ? note.title.substring(0, 50) + '…' : note.title}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[9px] text-discord-textMuted/70">{note.folder}</span>
                  <span className="text-[9px] text-discord-textMuted">
                    {new Date(note.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
            {notes.length === 0 && (
              <div className="text-center py-8">
                <BookOpen size={28} className="mx-auto mb-2 text-discord-textMuted/40" />
                <p className="text-xs text-discord-textMuted">Start creating notes to see them here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;