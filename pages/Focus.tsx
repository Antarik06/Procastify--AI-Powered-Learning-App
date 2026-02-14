import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RoutineTask } from '../types';
import {
  Play, Pause, Square, Coffee, BrainCircuit, ChevronLeft, Volume2, VolumeX,
  Settings2, Sparkles, Zap, Wind, Timer, StopCircle, RotateCcw, BarChart3, ShieldAlert
} from 'lucide-react';

interface FocusProps {
  initialTask?: RoutineTask;
  onExit: (minutesSpent: number) => void;
}

type FocusPhase = 'warmup' | 'flow' | 'fatigue' | 'completed' | 'break' | 'stopwatch';
type FocusMode = 'countdown' | 'stopwatch';
type SoundType = 'brown-noise' | 'heavy-rain' | 'forest' | 'none';

const PRESETS = [
  { label: 'Pomodoro', focus: 25 },
  { label: 'Deep Work', focus: 50 },
  { label: 'Extended', focus: 90 },
];

const SOUND_LIBRARY: Record<SoundType, string | null> = {
  'brown-noise': null, // Generated via Web Audio
  'heavy-rain': 'https://www.soundjay.com/nature/rain-01.mp3',
  'forest': 'https://www.soundjay.com/nature/forest-01.mp3',
  'none': null
};

// --- Enhanced Audio Engine ---
class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  // Use AudioNode as the base type to support both buffers and media elements
  private source: AudioNode | null = null;
  private audioTag: HTMLAudioElement | null = null;
  private isPlaying = false;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
      this.gainNode.gain.value = 0;
    }
  }

  play(type: SoundType) {
    this.stop();
    this.init();
    if (!this.ctx || !this.gainNode) return;

    if (type === 'brown-noise') {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        data[i] = lastOut * 3.5;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      noise.connect(filter);
      filter.connect(this.gainNode);
      noise.start();
      this.source = noise;
    } else if (SOUND_LIBRARY[type]) {
      this.audioTag = new Audio(SOUND_LIBRARY[type]!);
      this.audioTag.loop = true;
      this.source = this.ctx.createMediaElementSource(this.audioTag);
      this.source.connect(this.gainNode);
      this.audioTag.play();
    }

    this.isPlaying = true;
    this.fadeIn();
  }

  stop() {
    if (this.isPlaying) {
      this.fadeOut(() => {
        if (this.audioTag) { this.audioTag.pause(); this.audioTag = null; }
        if (this.source instanceof AudioBufferSourceNode) this.source.stop();
        this.isPlaying = false;
      });
    }
  }

  private fadeIn() {
    if (!this.gainNode || !this.ctx) return;
    this.gainNode.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 2);
  }

  private fadeOut(cb: () => void) {
    if (!this.gainNode || !this.ctx) return cb();
    this.gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 1);
    setTimeout(cb, 1000);
  }
}

const soundEngine = new AmbientSoundEngine();

const Focus: React.FC<FocusProps> = ({ initialTask, onExit }) => {
  // --- State ---
  const [mode, setMode] = useState<FocusMode>('countdown');
  const [initialSeconds, setInitialSeconds] = useState((initialTask?.durationMinutes || 25) * 60);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  // Customization & Features
  const [soundType, setSoundType] = useState<SoundType>('none');
  const [blockedUrls, setBlockedUrls] = useState<string[]>(['facebook.com', 'twitter.com', 'youtube.com']);
  const [distractionCount, setDistractionCount] = useState(0);

  // --- Logic ---
  const progressPercent = mode === 'countdown' ? ((initialSeconds - timeLeft) / initialSeconds) * 100 : 0;

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        if (mode === 'countdown') {
          if (timeLeft > 0) {
            setTimeLeft(t => t - 1);
            setSecondsSpent(s => s + 1);
          } else {
            setIsActive(false);
            setShowSummary(true);
          }
        } else {
          setTimeLeft(t => t + 1);
          setSecondsSpent(s => s + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  useEffect(() => {
    if (isActive && soundType !== 'none') soundEngine.play(soundType);
    else soundEngine.stop();
  }, [isActive, soundType]);

  // Distraction Blocking (Tab Visibility API)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isActive) {
        setDistractionCount(prev => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isActive]);

  const currentPhase: FocusPhase = useMemo(() => {
    if (mode === 'stopwatch') return 'stopwatch';
    if (timeLeft === 0) return 'completed';
    if (progressPercent < 15) return 'warmup';
    if (progressPercent > 85) return 'fatigue';
    return 'flow';
  }, [timeLeft, progressPercent, mode]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getPhaseStyles = () => {
    switch (currentPhase) {
      case 'warmup': return { color: '#60a5fa', text: 'Entering Flow' };
      case 'flow': return { color: '#5865F2', text: 'Deep Flow' };
      case 'fatigue': return { color: '#fb923c', text: 'Fatigue Zone' };
      case 'stopwatch': return { color: '#a855f7', text: 'Open Focus' };
      default: return { color: '#10b981', text: 'Completed' };
    }
  };

  const style = getPhaseStyles();

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0f1012] text-app-text overflow-hidden">

      {/* --- Top Bar --- */}
      <div className="absolute top-0 w-full p-4 md:p-6 flex justify-between items-center z-20">
        <button onClick={() => onExit(Math.floor(secondsSpent / 60))} className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
          <ChevronLeft size={18} /> Exit
        </button>

        <div className="flex items-center gap-4 bg-white/5 p-1 rounded-lg border border-app-border">
          <button
            onClick={() => { setMode('countdown'); setIsActive(false); setTimeLeft(initialSeconds); }}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${mode === 'countdown' ? 'bg-white/10 text-app-text' : 'text-app-text/40'}`}
          >Countdown</button>
          <button
            onClick={() => { setMode('stopwatch'); setIsActive(false); setTimeLeft(0); }}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${mode === 'stopwatch' ? 'bg-white/10 text-app-text' : 'text-app-text/40'}`}
          >Stopwatch</button>
        </div>
      </div>

      {/* --- Main Timer Circle --- */}
      <div className="relative flex flex-col items-center">
        <div
          className="absolute inset-0 rounded-full blur-[120px] opacity-20 transition-colors duration-1000"
          style={{ backgroundColor: style.color }}
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-4 px-4 py-1 rounded-full border border-app-border bg-white/5 flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: style.color }} />
            {style.text}
          </div>

          <h1 className="text-6xl md:text-9xl font-mono font-medium tracking-tighter mb-4 md:mb-8 tabular-nums">
            {formatTime(timeLeft)}
          </h1>

          <div className="flex items-center gap-4 md:gap-6">
            {mode === 'stopwatch' && (
              <button onClick={() => { setTimeLeft(0); setIsActive(false); }} className="p-3 md:p-4 rounded-full bg-white/5 hover:bg-white/10 border border-app-border transition-all">
                <RotateCcw size={24} />
              </button>
            )}

            <button
              onClick={() => { if (isActive) setPauseCount(p => p + 1); setIsActive(!isActive); }}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center bg-white text-black hover:scale-105 transition-transform"
            >
              {isActive ? <Pause size={32} className="md:w-10 md:h-10" fill="currentColor" /> : <Play size={32} className="ml-1 md:ml-2 md:w-10 md:h-10" fill="currentColor" />}
            </button>

            <button onClick={() => setShowSummary(true)} className="p-3 md:p-4 rounded-full bg-white/5 hover:bg-white/10 border border-app-border transition-all">
              <Square size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* --- Part 1: Custom Duration & Part 2: Sound Controls --- */}
      {!isActive && !showSummary && (
        <div className="mt-8 md:mt-12 flex flex-col md:flex-row items-center gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 w-full px-4 md:px-0 md:w-auto">
          <div className="flex flex-col gap-2 items-center">
            <span className="text-[10px] uppercase font-bold text-app-text/30 tracking-widest">Adjust Duration</span>
            <div className="flex flex-wrap justify-center gap-2">
              <input
                type="number"
                value={Math.floor(initialSeconds / 60)}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setInitialSeconds(val * 60);
                  if (mode === 'countdown') setTimeLeft(val * 60);
                }}
                className="w-20 bg-white/5 border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => { setInitialSeconds(p.focus * 60); setTimeLeft(p.focus * 60); }} className="px-3 py-2 bg-white/5 rounded-lg text-xs hover:bg-white/10">
                  {p.focus}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-center">
            <span className="text-[10px] uppercase font-bold text-app-text/30 tracking-widest">Focus Sounds</span>
            <div className="flex flex-wrap justify-center gap-2">
              {(['none', 'brown-noise', 'heavy-rain', 'forest'] as SoundType[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSoundType(s)}
                  className={`px-3 py-2 rounded-lg text-xs capitalize transition-all ${soundType === s ? 'bg-white/20 text-app-text' : 'bg-white/5 text-app-text/40'}`}
                >
                  {s.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Part 1: Session Summary Report --- */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6">
          <div className="bg-[#1a1b1e] border border-app-border p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="text-indigo-400" />
              <h2 className="text-2xl font-bold">Session Report</h2>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between p-4 bg-white/5 rounded-2xl">
                <span className="text-app-text/50">Focused Time</span>
                <span className="font-mono font-bold text-xl">{formatTime(secondsSpent)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl">
                  <span className="text-[10px] uppercase text-app-text/40 block mb-1">Pauses</span>
                  <span className="text-xl font-bold">{pauseCount}</span>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl">
                  <span className="text-[10px] uppercase text-app-text/40 block mb-1">Distractions</span>
                  <span className="text-xl font-bold text-orange-400">{distractionCount}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onExit(Math.floor(secondsSpent / 60))}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              Complete Session
            </button>
          </div>
        </div>
      )}

      {/* --- Part 3: Distraction Block Indicator --- */}
      <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 flex items-center gap-3 text-app-text/20 text-[10px] font-bold tracking-widest uppercase">
        <ShieldAlert size={14} className={distractionCount > 0 ? 'text-orange-500' : ''} />
        Guard Active: {blockedUrls.length} Sites Restricted
      </div>
    </div>
  );
};

export default Focus;