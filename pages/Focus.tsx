import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RoutineTask } from '../types';
import { Play, Pause, Square, Coffee, BrainCircuit, ChevronLeft, Volume2, VolumeX, Activity, Settings2, Sparkles, Zap, Wind } from 'lucide-react';

interface FocusProps {
  initialTask?: RoutineTask;
  onExit: (minutesSpent: number) => void;
}


type FocusPhase = 'warmup' | 'flow' | 'fatigue' | 'completed' | 'break';
type FocusQuality = 'excellent' | 'good' | 'scattered';
type SoundType = 'brown-noise' | 'rain' | 'none';

const PRESETS = [
  { label: 'Pomodoro', focus: 25, break: 5 },
  { label: 'Deep Work', focus: 50, break: 10 },
  { label: 'Extended', focus: 90, break: 20 },
];


class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private isPlaying = false;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
      this.gainNode.gain.value = 0;
    }
  }

  playBrownNoise() {
    this.init();
    if (!this.ctx || !this.gainNode || this.isPlaying) return;


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

    this.isPlaying = true;
    this.fadeIn();
  }

  stop() {
    if (this.isPlaying) {
      this.fadeOut(() => {
        if (this.ctx) this.ctx.suspend();
        this.isPlaying = false;
      });
    }
  }

  toggle(shouldPlay: boolean) {
    if (shouldPlay && !this.isPlaying) {
      if (this.ctx?.state === 'suspended') this.ctx.resume();
      else this.playBrownNoise();
    } else if (!shouldPlay && this.isPlaying) {
      this.stop();
    }
  }

  private fadeIn() {
    if (!this.gainNode || !this.ctx) return;
    this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
    this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 2); // Low volume
  }

  private fadeOut(callback?: () => void) {
    if (!this.gainNode || !this.ctx) return;
    this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
    setTimeout(() => callback && callback(), 1500);
  }
}

const soundEngine = new AmbientSoundEngine();

const Focus: React.FC<FocusProps> = ({ initialTask, onExit }) => {
  const isBreakType = initialTask?.type === 'break' || initialTask?.type === 'procastify';
  const defaultSeconds = (initialTask?.durationMinutes || 25) * 60;

  const [initialSeconds, setInitialSeconds] = useState(defaultSeconds);
  const [timeLeft, setTimeLeft] = useState(defaultSeconds);
  const [isActive, setIsActive] = useState(false);
  const [taskTitle, setTaskTitle] = useState(initialTask?.title || (isBreakType ? 'Break Time' : 'Deep Work Session'));
  const [secondsSpent, setSecondsSpent] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [pauseCount, setPauseCount] = useState(0);

  const progressPercent = ((initialSeconds - timeLeft) / initialSeconds) * 100;

  const currentPhase: FocusPhase = useMemo(() => {
    if (timeLeft === 0) return 'completed';
    if (isBreakType) return 'break';
    if (progressPercent < 15) return 'warmup';
    if (progressPercent > 85) return 'fatigue';
    return 'flow';
  }, [timeLeft, isBreakType, progressPercent]);

  const focusQuality: FocusQuality = useMemo(() => {
    if (pauseCount === 0) return 'excellent';
    if (pauseCount < 3) return 'good';
    return 'scattered';
  }, [pauseCount]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
        setSecondsSpent(s => s + 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);

    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    soundEngine.toggle(soundEnabled && isActive);
    return () => soundEngine.stop();
  }, [soundEnabled, isActive]);



  const toggleTimer = () => {
    if (isActive) {
      setPauseCount(c => c + 1);
    }
    setIsActive(!isActive);
  };

  const handleExit = () => {
    soundEngine.stop();
    onExit(Math.floor(secondsSpent / 60));
  };

  const applyPreset = (focusMin: number) => {
    if (isActive) return;
    setInitialSeconds(focusMin * 60);
    setTimeLeft(focusMin * 60);
    setShowPresets(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };


  const getPhaseStyles = () => {
    switch (currentPhase) {
      case 'warmup': return { color: '#60a5fa', glow: 'shadow-[0_0_30px_rgba(96,165,250,0.2)]', text: 'Entering Flow' };
      case 'flow': return { color: '#5865F2', glow: 'shadow-[0_0_50px_rgba(88,101,242,0.4)]', text: 'Deep Flow' };
      case 'fatigue': return { color: '#fb923c', glow: 'shadow-[0_0_30px_rgba(251,146,60,0.2)]', text: 'Fatigue Zone' };
      case 'break': return { color: '#23a559', glow: 'shadow-[0_0_30px_rgba(35,165,89,0.2)]', text: 'Recharge' };
      case 'completed': return { color: '#10b981', glow: 'shadow-[0_0_60px_rgba(16,185,129,0.6)]', text: 'Completed' };
    }
  };

  const phaseStyle = getPhaseStyles();
  const breathingSpeed = currentPhase === 'flow' ? 'duration-[4000ms]' : 'duration-[2000ms]';

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0f1012] relative overflow-hidden transition-colors duration-1000">


      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] opacity-10 transition-all duration-1000 ${isActive ? 'scale-110' : 'scale-100'}`}
          style={{ backgroundColor: phaseStyle.color }}
        ></div>

        {isActive && (
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] opacity-5 animate-pulse ${breathingSpeed}`}
            style={{ backgroundColor: phaseStyle.color }}
          ></div>
        )}
      </div>


      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <button onClick={handleExit} className="text-white/40 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium group px-4 py-2 rounded-lg hover:bg-white/5">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Exit Focus
        </button>

        <div className="flex items-center gap-4">

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-full border transition-all ${soundEnabled ? 'bg-white/10 text-white border-white/20' : 'text-white/20 border-transparent hover:text-white/50'}`}
            title="Ambient Sound (Brown Noise)"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>


      <div className="z-10 flex flex-col items-center justify-center w-full max-w-4xl px-6 py-12 h-full gap-8">


        <div className="text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight min-h-[4rem] flex items-center justify-center">
            {taskTitle}
          </h1>
        </div>


        <div className="relative group cursor-pointer flex-none" onClick={toggleTimer}>

          <svg width="340" height="340" viewBox="0 0 340 340" className="transform -rotate-90 drop-shadow-2xl overflow-visible">
            <circle
              cx="170" cy="170" r="160"
              stroke="currentColor" strokeWidth="3" fill="none"
              className="text-white/5"
            />

            <circle
              cx="170" cy="170" r="160"
              stroke={phaseStyle.color} strokeWidth="6" fill="none"
              strokeDasharray={1005}
              strokeDashoffset={1005 - (1005 * progressPercent) / 100}
              strokeLinecap="round"
              className={`transition-all duration-1000 ease-linear ${phaseStyle.glow} ${!isActive ? 'opacity-50 grayscale-[0.5]' : ''}`}
              style={{
                filter: isActive && currentPhase === 'flow' ? 'drop-shadow(0 0 8px currentColor)' : 'none'
              }}
            />
          </svg>


          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">

            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 text-white/90 text-xs font-bold uppercase tracking-widest backdrop-blur-sm transition-all duration-1000`}
              style={{ backgroundColor: `${phaseStyle.color}20`, borderColor: `${phaseStyle.color}40` }}
            >
              {isBreakType ? <Coffee size={12} /> : currentPhase === 'flow' ? <Sparkles size={12} /> : <BrainCircuit size={12} />}
              <span>{phaseStyle.text}</span>
            </div>


            <span className={`text-8xl font-mono font-medium text-white tracking-tighter tabular-nums drop-shadow-lg transition-all duration-300 ${isActive ? 'scale-105' : 'scale-100 opacity-90'}`}>
              {formatTime(timeLeft)}
            </span>


            <span className="text-white/30 text-xs font-bold tracking-[0.2em] uppercase transition-opacity duration-300">
              {isActive ? (
                <span className="flex items-center gap-2 animate-pulse"><Zap size={10} /> Focus Active</span>
              ) : 'Paused'}
            </span>
          </div>
        </div>


        <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 w-full min-h-[120px] justify-start">
          <div className="flex items-center gap-6 justify-center">
            <button
              onClick={toggleTimer}
              className={`w-20 h-20 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-xl ${isActive ? 'bg-white text-black' : 'bg-discord-accent text-white'}`}
            >
              {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
          </div>


          {!isActive && !initialTask && (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs text-white/30 hover:text-white flex items-center gap-1 transition-colors uppercase tracking-widest font-bold"
              >
                <Settings2 size={12} /> Adjust Timer
              </button>

              {showPresets && (
                <div className="flex gap-2 p-1.5 bg-white/5 rounded-xl border border-white/5 animate-in slide-in-from-bottom-2">
                  {PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p.focus)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${initialSeconds === p.focus * 60 ? 'bg-white/20 text-white' : 'text-white/50 hover:bg-white/10'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}


          {soundEnabled && isActive && (
            <div className="flex items-center gap-2 text-white/30 text-xs animate-pulse font-medium">
              <Wind size={12} /> Ambient Audio Active
            </div>
          )}
        </div>

      </div>


      <div className="absolute bottom-6 right-6 text-white/10 text-xs font-mono font-medium">
        ETA: {new Date(Date.now() + timeLeft * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};

export default Focus;