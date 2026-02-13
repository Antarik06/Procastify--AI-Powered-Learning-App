import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
} from 'recharts';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Flame, 
  Award, 
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';

type TimeRange = '7d' | '30d' | '6w' | 'all';
type ChartType = 'area' | 'bar';

interface StudyActivityChartProps {
  dailyActivity: Record<string, number>; // Key: YYYY-MM-DD, Value: minutes
  loginStreak?: number;
  studyGoalMinutes?: number; // Daily study goal in minutes
}

interface ChartDataPoint {
  date: string;
  dateKey: string;
  minutes: number;
  displayTime: string;
  isPeak: boolean;
  isStreak: boolean;
  weekday: string;
  dayOfWeek: number;
  intensity: 'none' | 'low' | 'medium' | 'high' | 'peak';
}

interface WeekComparison {
  thisWeek: number;
  lastWeek: number;
  change: number;
  changePercent: number;
}

interface StudyPattern {
  bestDay: string;
  bestDayMinutes: number;
  consistency: number; // 0-100%
}

const timeRangeConfig: Record<TimeRange, { label: string; days: number | null }> = {
  '7d': { label: 'Last 7 Days', days: 7 },
  '30d': { label: 'Last 30 Days', days: 30 },
  '6w': { label: 'Last 6 Weeks', days: 42 },
  'all': { label: 'All Time', days: null },
};

const formatTime = (minutes: number): string => {
  if (minutes === 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const formatYAxis = (minutes: number): string => {
  if (minutes === 0) return '0';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 1) return `${Math.round(minutes)}m`;
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`;
};

const getIntensity = (minutes: number, maxMinutes: number): ChartDataPoint['intensity'] => {
  if (minutes === 0) return 'none';
  const ratio = minutes / maxMinutes;
  if (ratio >= 0.9) return 'peak';
  if (ratio >= 0.6) return 'high';
  if (ratio >= 0.3) return 'medium';
  return 'low';
};

const intensityColors = {
  none: 'bg-app-bg',
  low: 'bg-green-500/30',
  medium: 'bg-green-500/50',
  high: 'bg-green-500/70',
  peak: 'bg-yellow-500/90',
};

const StudyActivityChart: React.FC<StudyActivityChartProps> = ({ 
  dailyActivity, 
  loginStreak = 0,
  studyGoalMinutes = 60, // Default 1 hour goal
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [chartType, setChartType] = useState<ChartType>('area');

  const chartData = useMemo(() => {
    const config = timeRangeConfig[timeRange];
    const data: ChartDataPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determine how many days to show
    let daysToShow: number;
    if (config.days === null) {
      const dates = Object.keys(dailyActivity).sort();
      if (dates.length === 0) {
        daysToShow = 7;
      } else {
        const earliest = new Date(dates[0]);
        daysToShow = Math.max(7, Math.ceil((today.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      }
    } else {
      daysToShow = config.days;
    }

    // First pass: collect all data
    const rawData: { dateKey: string; minutes: number; date: Date }[] = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      rawData.push({
        dateKey,
        minutes: dailyActivity[dateKey] || 0,
        date: d,
      });
    }

    const maxMinutes = Math.max(...rawData.map(d => d.minutes), 1);

    // Second pass: create chart data points
    for (const item of rawData) {
      const d = item.date;
      
      data.push({
        date: d.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          ...(daysToShow > 14 ? {} : { weekday: 'short' })
        }),
        dateKey: item.dateKey,
        minutes: item.minutes,
        displayTime: formatTime(item.minutes),
        isPeak: false,
        isStreak: false,
        weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
        dayOfWeek: d.getDay(),
        intensity: getIntensity(item.minutes, maxMinutes),
      });
    }

    // Find peak day
    if (data.length > 0) {
      const maxMinutes = Math.max(...data.map(d => d.minutes));
      if (maxMinutes > 0) {
        const peakIndex = data.findIndex(d => d.minutes === maxMinutes);
        if (peakIndex >= 0) {
          data[peakIndex].isPeak = true;
        }
      }
    }

    // Mark streak days (last N consecutive days with activity)
    for (let i = data.length - 1; i >= Math.max(0, data.length - loginStreak); i--) {
      if (data[i].minutes > 0) {
        data[i].isStreak = true;
      }
    }

    return data;
  }, [dailyActivity, timeRange, loginStreak]);

  // Calculate statistics
  const stats = useMemo(() => {
    const activeDays = chartData.filter(d => d.minutes > 0);
    const totalMinutes = chartData.reduce((sum, d) => sum + d.minutes, 0);
    const avgMinutes = activeDays.length > 0 ? totalMinutes / activeDays.length : 0;
    const maxMinutes = Math.max(...chartData.map(d => d.minutes), 0);
    const peakDay = chartData.find(d => d.isPeak);

    // Calculate trend (compare last half to first half)
    const mid = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, mid);
    const secondHalf = chartData.slice(mid);
    const firstAvg = firstHalf.reduce((s, d) => s + d.minutes, 0) / (firstHalf.length || 1);
    const secondAvg = secondHalf.reduce((s, d) => s + d.minutes, 0) / (secondHalf.length || 1);
    const trend = secondAvg - firstAvg;
    const trendPercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    // Goal progress (for today)
    const todayKey = new Date().toISOString().split('T')[0];
    const todayMinutes = dailyActivity[todayKey] || 0;
    const goalProgress = Math.min(100, Math.round((todayMinutes / studyGoalMinutes) * 100));

    return {
      totalMinutes,
      avgMinutes,
      maxMinutes,
      activeDays: activeDays.length,
      totalDays: chartData.length,
      peakDay,
      trend,
      trendPercent,
      todayMinutes,
      goalProgress,
    };
  }, [chartData, dailyActivity, studyGoalMinutes]);

  // Calculate week-over-week comparison
  const weekComparison = useMemo((): WeekComparison => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let thisWeekTotal = 0;
    let lastWeekTotal = 0;

    for (let i = 0; i < 7; i++) {
      const thisWeekDate = new Date(today);
      thisWeekDate.setDate(thisWeekDate.getDate() - i);
      const thisKey = thisWeekDate.toISOString().split('T')[0];
      thisWeekTotal += dailyActivity[thisKey] || 0;

      const lastWeekDate = new Date(today);
      lastWeekDate.setDate(lastWeekDate.getDate() - i - 7);
      const lastKey = lastWeekDate.toISOString().split('T')[0];
      lastWeekTotal += dailyActivity[lastKey] || 0;
    }

    const change = thisWeekTotal - lastWeekTotal;
    const changePercent = lastWeekTotal > 0 ? (change / lastWeekTotal) * 100 : 0;

    return { thisWeek: thisWeekTotal, lastWeek: lastWeekTotal, change, changePercent };
  }, [dailyActivity]);

  // Study pattern analysis
  const studyPattern = useMemo((): StudyPattern => {
    const dayTotals: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let activeDays = 0;
    let totalDays = 0;

    Object.entries(dailyActivity).forEach(([dateKey, minutes]) => {
      const date = new Date(dateKey);
      dayTotals[date.getDay()] += minutes;
      totalDays++;
      if (minutes > 0) activeDays++;
    });

    const bestDayIndex = Object.entries(dayTotals).reduce((a, b) => 
      b[1] > a[1] ? b : a
    )[0];

    return {
      bestDay: dayNames[parseInt(bestDayIndex)],
      bestDayMinutes: dayTotals[parseInt(bestDayIndex)],
      consistency: totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0,
    };
  }, [dailyActivity]);

  // Dynamic Y-axis domain
  const yAxisDomain = useMemo(() => {
    const max = Math.max(stats.maxMinutes, studyGoalMinutes, 30);
    // Round up to nice numbers
    if (max <= 30) return [0, 30];
    if (max <= 60) return [0, 60];
    if (max <= 120) return [0, 120];
    if (max <= 180) return [0, 180];
    if (max <= 240) return [0, 240];
    if (max <= 360) return [0, 360];
    if (max <= 480) return [0, 480];
    return [0, Math.ceil(max / 60) * 60];
  }, [stats.maxMinutes, studyGoalMinutes]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload as ChartDataPoint;
    const goalMet = data.minutes >= studyGoalMinutes;

    return (
      <div className="bg-app-panel border border-app-border rounded-xl p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={14} className="text-app-accent" />
          <span className="text-app-text font-semibold">{data.weekday}, {data.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-yellow-400" />
          <span className="text-app-text text-lg font-bold">{data.displayTime}</span>
          <span className="text-app-textMuted text-sm">studied</span>
        </div>
        {goalMet && (
          <div className="flex items-center gap-1 mt-2 text-green-400 text-xs font-medium">
            <Target size={12} /> Daily goal achieved!
          </div>
        )}
        {data.isPeak && (
          <div className="flex items-center gap-1 mt-2 text-yellow-400 text-xs font-medium">
            <Award size={12} /> Peak Study Day!
          </div>
        )}
        {data.isStreak && (
          <div className="flex items-center gap-1 mt-1 text-orange-400 text-xs font-medium">
            <Flame size={12} /> Part of your streak
          </div>
        )}
      </div>
    );
  };

  // Calculate average line position
  const avgMinutes = stats.avgMinutes;

  return (
    <div className="bg-app-panel p-6 rounded-2xl border border-app-border shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-app-accent/10">
            <Zap size={20} className="text-app-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-app-text">Study Activity</h3>
            <p className="text-sm text-app-textMuted">
              {stats.activeDays} active days out of {stats.totalDays}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Chart Type Toggle */}
          <div className="flex gap-1 bg-app-bg rounded-lg p-1 border border-app-border">
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded transition-all ${chartType === 'area' ? 'bg-app-accent text-white' : 'text-app-textMuted hover:text-app-text'}`}
              title="Area Chart"
            >
              <TrendingUp size={16} />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded transition-all ${chartType === 'bar' ? 'bg-app-accent text-white' : 'text-app-textMuted hover:text-app-text'}`}
              title="Bar Chart"
            >
              <BarChart3 size={16} />
            </button>
          </div>

          {/* Time Range Filters */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(timeRangeConfig) as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-app-accent text-white shadow-md shadow-app-accent/30'
                    : 'bg-app-bg text-app-textMuted hover:bg-app-hover hover:text-app-text border border-app-border'
                }`}
              >
                {timeRangeConfig[range].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Goal Progress */}
      <div className="bg-gradient-to-r from-app-accent/10 to-purple-500/10 rounded-xl p-4 border border-app-accent/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-app-accent" />
            <span className="text-app-text font-semibold">Today's Goal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-app-text font-bold">{formatTime(stats.todayMinutes)}</span>
            <span className="text-app-textMuted">/ {formatTime(studyGoalMinutes)}</span>
          </div>
        </div>
        <div className="h-2 bg-app-bg rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              stats.goalProgress >= 100 
                ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                : 'bg-gradient-to-r from-app-accent to-purple-500'
            }`}
            style={{ width: `${Math.min(100, stats.goalProgress)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-app-textMuted">{stats.goalProgress}% complete</span>
          {stats.goalProgress >= 100 && (
            <span className="text-green-400 font-medium flex items-center gap-1">
              <Sparkles size={12} /> Goal achieved!
            </span>
          )}
        </div>
      </div>

      {/* Stats Row - Enhanced with Week Comparison */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-app-bg rounded-xl p-4 border border-app-border">
          <p className="text-app-textMuted text-xs font-medium uppercase tracking-wider mb-1">Total Time</p>
          <p className="text-app-text text-xl font-bold">{formatTime(stats.totalMinutes)}</p>
        </div>
        <div className="bg-app-bg rounded-xl p-4 border border-app-border">
          <p className="text-app-textMuted text-xs font-medium uppercase tracking-wider mb-1">Daily Average</p>
          <p className="text-app-text text-xl font-bold">{formatTime(stats.avgMinutes)}</p>
        </div>
        <div className="bg-app-bg rounded-xl p-4 border border-app-border">
          <p className="text-app-textMuted text-xs font-medium uppercase tracking-wider mb-1">Peak Session</p>
          <p className="text-app-text text-xl font-bold">{formatTime(stats.maxMinutes)}</p>
        </div>
        
        {/* Week Comparison */}
        <div className="bg-app-bg rounded-xl p-4 border border-app-border">
          <p className="text-app-textMuted text-xs font-medium uppercase tracking-wider mb-1">This Week</p>
          <p className="text-app-text text-xl font-bold">{formatTime(weekComparison.thisWeek)}</p>
        </div>
        <div className="bg-app-bg rounded-xl p-4 border border-app-border">
          <p className="text-app-textMuted text-xs font-medium uppercase tracking-wider mb-1">vs Last Week</p>
          <div className="flex items-center gap-1">
            {weekComparison.change > 0 ? (
              <ArrowUpRight size={18} className="text-green-400" />
            ) : weekComparison.change < 0 ? (
              <ArrowDownRight size={18} className="text-red-400" />
            ) : (
              <Minus size={18} className="text-app-textMuted" />
            )}
            <span className={`text-xl font-bold ${
              weekComparison.change > 0 ? 'text-green-400' : 
              weekComparison.change < 0 ? 'text-red-400' : 
              'text-app-textMuted'
            }`}>
              {weekComparison.change > 0 ? '+' : ''}{Math.abs(weekComparison.changePercent) > 0.5 
                ? `${weekComparison.changePercent.toFixed(0)}%` 
                : 'Same'}
            </span>
          </div>
        </div>

        {/* Trend */}
        <div className="bg-app-bg rounded-xl p-4 border border-app-border">
          <p className="text-app-textMuted text-xs font-medium uppercase tracking-wider mb-1">Trend</p>
          <div className="flex items-center gap-2">
            {stats.trend > 5 ? (
              <TrendingUp size={20} className="text-green-400" />
            ) : stats.trend < -5 ? (
              <TrendingDown size={20} className="text-red-400" />
            ) : (
              <Minus size={20} className="text-app-textMuted" />
            )}
            <span className={`text-xl font-bold ${
              stats.trend > 5 ? 'text-green-400' : 
              stats.trend < -5 ? 'text-red-400' : 
              'text-app-textMuted'
            }`}>
              {stats.trend > 5 ? 'Up' : stats.trend < -5 ? 'Down' : 'Stable'}
            </span>
          </div>
        </div>
      </div>

      {/* Study Pattern Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} className="text-purple-400" />
            <span className="text-app-textMuted text-xs font-medium uppercase tracking-wider">Best Day</span>
          </div>
          <p className="text-app-text text-lg font-bold">{studyPattern.bestDay}</p>
          <p className="text-app-textMuted text-xs">{formatTime(studyPattern.bestDayMinutes)} total</p>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-xl p-4 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={16} className="text-orange-400" />
            <span className="text-app-textMuted text-xs font-medium uppercase tracking-wider">Current Streak</span>
          </div>
          <p className="text-app-text text-lg font-bold">{loginStreak} days</p>
          <p className="text-app-textMuted text-xs">Keep it going!</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-green-400" />
            <span className="text-app-textMuted text-xs font-medium uppercase tracking-wider">Consistency</span>
          </div>
          <p className="text-app-text text-lg font-bold">{studyPattern.consistency}%</p>
          <p className="text-app-textMuted text-xs">Days with activity</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 sm:h-80">
        {chartData.length > 0 && stats.totalMinutes > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="studyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5865F2" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#5865F2" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#5865F2" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#5865F2" />
                    <stop offset="50%" stopColor="#7289DA" />
                    <stop offset="100%" stopColor="#5865F2" />
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="var(--app-border)" 
                  strokeOpacity={0.5}
                  vertical={false}
                />
                
                <XAxis 
                  dataKey="date" 
                  stroke="var(--app-text-muted)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }}
                  interval={chartData.length > 14 ? Math.floor(chartData.length / 7) : 0}
                  angle={chartData.length > 21 ? -45 : 0}
                  textAnchor={chartData.length > 21 ? 'end' : 'middle'}
                  height={chartData.length > 21 ? 60 : 30}
                />
                
                <YAxis 
                  domain={yAxisDomain}
                  stroke="var(--app-text-muted)"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }}
                  width={45}
                />
                
                {/* Goal line */}
                <ReferenceLine 
                  y={studyGoalMinutes} 
                  stroke="#22c55e" 
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  strokeOpacity={0.7}
                  label={{
                    value: `Goal: ${formatTime(studyGoalMinutes)}`,
                    position: 'right',
                    fill: '#22c55e',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
                
                {/* Average reference line */}
                {avgMinutes > 0 && (
                  <ReferenceLine 
                    y={avgMinutes} 
                    stroke="#f59e0b" 
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    strokeOpacity={0.6}
                    label={{
                      value: `Avg: ${formatTime(avgMinutes)}`,
                      position: 'left',
                      fill: '#f59e0b',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}
                
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ 
                    stroke: 'var(--app-accent)', 
                    strokeWidth: 2, 
                    strokeDasharray: '4 4',
                    strokeOpacity: 0.5
                  }}
                />
                
                <Area 
                  type="monotone"
                  dataKey="minutes"
                  stroke="url(#lineGradient)"
                  strokeWidth={3}
                  fill="url(#studyGradient)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload.isPeak) {
                      return (
                        <g key={`peak-${payload.dateKey}`}>
                          <circle cx={cx} cy={cy} r={8} fill="#f59e0b" opacity={0.2} />
                          <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="white" strokeWidth={2} />
                        </g>
                      );
                    }
                    if (payload.isStreak && payload.minutes > 0) {
                      return (
                        <circle key={`streak-${payload.dateKey}`} cx={cx} cy={cy} r={4} fill="#fb923c" stroke="white" strokeWidth={1.5} />
                      );
                    }
                    if (payload.minutes > 0) {
                      return (
                        <circle 
                          key={`dot-${payload.dateKey}`}
                          cx={cx} 
                          cy={cy} 
                          r={3} 
                          fill="#5865F2" 
                          stroke="white" 
                          strokeWidth={1.5}
                        />
                      );
                    }
                    return <g key={`empty-${payload.dateKey}`} />;
                  }}
                  activeDot={{
                    r: 6,
                    fill: '#5865F2',
                    stroke: 'white',
                    strokeWidth: 2,
                  }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            ) : (
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="var(--app-border)" 
                  strokeOpacity={0.5}
                  vertical={false}
                />
                
                <XAxis 
                  dataKey="date" 
                  stroke="var(--app-text-muted)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }}
                  interval={chartData.length > 14 ? Math.floor(chartData.length / 7) : 0}
                />
                
                <YAxis 
                  domain={yAxisDomain}
                  stroke="var(--app-text-muted)"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }}
                  width={45}
                />
                
                <ReferenceLine 
                  y={studyGoalMinutes} 
                  stroke="#22c55e" 
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  strokeOpacity={0.7}
                />
                
                {avgMinutes > 0 && (
                  <ReferenceLine 
                    y={avgMinutes} 
                    stroke="#f59e0b" 
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    strokeOpacity={0.6}
                  />
                )}
                
                <Tooltip content={<CustomTooltip />} />
                
                <Bar 
                  dataKey="minutes" 
                  fill="#5865F2" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="minutes" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 4"
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-app-textMuted">
            <Zap size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No study activity yet</p>
            <p className="text-sm">Start a focus session to see your progress here</p>
          </div>
        )}
      </div>

      {/* Activity Heatmap (Mini version) */}
      {chartData.length > 0 && timeRange === '30d' && (
        <div className="pt-4 border-t border-app-border">
          <h4 className="text-sm font-medium text-app-text mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-app-accent" />
            Activity Heatmap
          </h4>
          <div className="flex flex-wrap gap-1">
            {chartData.map((day) => (
              <div
                key={day.dateKey}
                className={`w-4 h-4 rounded-sm ${intensityColors[day.intensity]} border border-app-border/50 cursor-pointer transition-transform hover:scale-125`}
                title={`${day.date}: ${day.displayTime}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-app-textMuted">
            <span>Less</span>
            <div className="flex gap-1">
              {(['none', 'low', 'medium', 'high', 'peak'] as const).map((intensity) => (
                <div key={intensity} className={`w-3 h-3 rounded-sm ${intensityColors[intensity]} border border-app-border/50`} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      )}

      {/* Legend */}
      {chartData.length > 0 && stats.totalMinutes > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-app-border text-sm">
          <div className="flex items-center gap-2 text-app-textMuted">
            <div className="w-3 h-3 rounded-full bg-[#5865F2]" />
            <span>Study Time</span>
          </div>
          <div className="flex items-center gap-2 text-app-textMuted">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Peak Day</span>
          </div>
          <div className="flex items-center gap-2 text-app-textMuted">
            <div className="w-3 h-3 rounded-full bg-orange-400" />
            <span>Streak Days</span>
          </div>
          <div className="flex items-center gap-2 text-app-textMuted">
            <div className="w-6 border-t-2 border-dashed border-yellow-500" />
            <span>Average</span>
          </div>
          <div className="flex items-center gap-2 text-app-textMuted">
            <div className="w-6 border-t-2 border-dashed border-green-500" />
            <span>Daily Goal</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyActivityChart;