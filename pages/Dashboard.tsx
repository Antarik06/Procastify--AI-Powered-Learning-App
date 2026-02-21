import React, { useMemo, useState, useEffect } from 'react';
import { UserPreferences, Summary, Note, UserStats } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, BookOpen, FileText, Zap, Calendar, Flame, Trophy, ArrowRight, BrainCircuit, Sparkles, Target, PenLine, TrendingUp, Activity } from 'lucide-react';
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

type TimeRange = 7 | 14 | 30;

const Dashboard: React.FC<DashboardProps> = ({ user, summaries, notes, stats, onNoteClick, onNavigate }) => {

  const [timeRange, setTimeRange] = useState<TimeRange>(7);

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


  const getActivityData = (days: number) => {
    const getLocalDateKey = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const daysArray = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getLocalDateKey(d);
      const minutes = safeStats.dailyActivity[key] || 0;
      daysArray.push({
        date: key,
        name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        minutes: minutes,
        hours: minutes / 60,
        displayHours: minutes < 60 ? `${minutes}m` : `${(minutes / 60).toFixed(1)}h`
      });
    }
    return daysArray;
  };

  const activityData = getActivityData(timeRange);

  // Calculate dynamic Y-axis domain based on data
  const maxHours = useMemo(() => {
    if (activityData.length === 0) return 4;
    const max = Math.max(...activityData.map(d => d.hours));
    if (max === 0) return 4; // Minimum scale for no activity
    if (max < 1) return 1; // For short sessions (10-15 mins)
    if (max <= 4) return 4;
    // Round up to nearest hour for longer sessions
    return Math.ceil(max * 1.1); // Add 10% padding
  }, [activityData]);

  // Calculate total study time for the selected period
  const totalStudyTime = useMemo(() => {
    const totalMinutes = activityData.reduce((acc, d) => acc + d.minutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, [activityData]);

  // Calculate average daily study time
  const averageDaily = useMemo(() => {
    const totalMinutes = activityData.reduce((acc, d) => acc + d.minutes, 0);
    const avgMinutes = Math.round(totalMinutes / timeRange);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, [activityData, timeRange]);

  // Find best day
  const bestDay = useMemo(() => {
    if (activityData.length === 0) return null;
    const best = activityData.reduce((prev, current) => 
      current.hours > prev.hours ? current : prev
    );
    return best.hours > 0 ? best : null;
  }, [activityData]);

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

      {/* Study Analytics - Full Width */}
      <div className="bg-discord-panel p-6 rounded-2xl border border-white/5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity size={18} className="text-discord-accent" /> Study Analytics
          </h3>
          
          {/* Time Range Filter Buttons */}
          <div className="flex items-center gap-2 bg-discord-bg rounded-lg p-1">
            {([7, 14, 30] as TimeRange[]).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  timeRange === days
                    ? 'bg-discord-accent text-white shadow-md'
                    : 'text-discord-textMuted hover:text-white hover:bg-white/5'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-discord-bg/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-discord-accent" />
              <span className="text-xs text-discord-textMuted">Total Time</span>
            </div>
            <p className="text-xl font-bold text-white">{totalStudyTime}</p>
          </div>
          <div className="bg-discord-bg/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-green-400" />
              <span className="text-xs text-discord-textMuted">Daily Average</span>
            </div>
            <p className="text-xl font-bold text-white">{averageDaily}</p>
          </div>
          <div className="bg-discord-bg/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-xs text-discord-textMuted">Best Day</span>
            </div>
            <p className="text-xl font-bold text-white">
              {bestDay ? bestDay.displayHours : '—'}
            </p>
          </div>
        </div>

        {/* Area Chart */}
        <div style={{ width: '100%', height: '280px', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5865F2" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#5865F2" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2b2d31" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#949ba4" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#949ba4', fontSize: 12 }}
                interval={timeRange === 30 ? 'preserveStartEnd' : 0}
              />
              <YAxis 
                stroke="#949ba4" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#949ba4', fontSize: 12 }}
                domain={[0, maxHours]}
                tickFormatter={(value) => value >= 1 ? `${value}h` : `${value * 60}m`}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#111214', 
                  border: '1px solid #2b2d31', 
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
                itemStyle={{ color: '#dbdee1' }}
                labelStyle={{ color: '#949ba4', marginBottom: '4px' }}
                formatter={(value) => {
                  const numValue = Number(value);
                  return [
                    numValue < 1 ? `${Math.round(numValue * 60)} minutes` : `${numValue.toFixed(1)} hours`,
                    'Study Time'
                  ];
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="hours" 
                stroke="#5865F2" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorHours)" 
                animationDuration={1000}
                animationEasing="ease-out"
                dot={{ 
                  fill: '#5865F2', 
                  strokeWidth: 0, 
                  r: 4
                }}
                activeDot={{ 
                  r: 6, 
                  fill: '#5865F2', 
                  stroke: '#fff', 
                  strokeWidth: 2 
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
