import React, { useState, useEffect, useMemo } from "react";
import { RoutineTask } from "../types";
import { Play, Pause, Square, ChevronLeft, BarChart3 } from "lucide-react";

interface FocusProps {
  initialTask?: RoutineTask;
  onExit: (minutesSpent: number) => void;
}

type SoundType = "brown-noise" | "heavy-rain" | "forest" | "none";

const PRESETS = [
  { label: "Pomodoro", minutes: 25 },
  { label: "Extended Focus", minutes: 50 },
  { label: "Deep Work", minutes: 90 },
];
const SOUND_LIBRARY: Record<SoundType, string | null> = {
  "brown-noise": null,
  "heavy-rain": "/sounds/rain.mp3",
  forest: "/sounds/forest.mp3",
  none: null,
};

/* ---------------- SOUND ENGINE ---------------- */

class SoundEngine {
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private brownSource: AudioBufferSourceNode | null = null;

  play(type: SoundType) {
    this.stop();

    if (type === "brown-noise") {
      this.playBrownNoise();
      return;
    }

    if (SOUND_LIBRARY[type]) {
      this.audio = new Audio(SOUND_LIBRARY[type]!);
      this.audio.loop = true;
      this.audio.volume = 0.4;
      this.audio.play().catch(() => {});
    }
  }

  private playBrownNoise() {
    this.ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(
      1,
      bufferSize,
      this.ctx.sampleRate
    );
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      output[i] = lastOut * 3.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.15;

    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(0);

    this.brownSource = source;
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }

    if (this.brownSource) {
      this.brownSource.stop();
      this.brownSource.disconnect();
      this.brownSource = null;
    }

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

const soundEngine = new SoundEngine();

/* ---------------- COMPONENT ---------------- */

const Focus: React.FC<FocusProps> = ({ initialTask, onExit }) => {
  const defaultMinutes = initialTask?.durationMinutes || 25;

  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [seconds, setSeconds] = useState(0);

  const [initialSeconds, setInitialSeconds] = useState(defaultMinutes * 60);
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60);

  const [isActive, setIsActive] = useState(false);
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [distractionCount, setDistractionCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [soundType, setSoundType] = useState<SoundType>("none");

  /* -------- Sync Manual Time -------- */

  useEffect(() => {
    const total = hours * 3600 + minutes * 60 + seconds;
    setInitialSeconds(total);
    if (!isActive) setTimeLeft(total);
  }, [hours, minutes, seconds]);

  /* -------- Timer -------- */

  useEffect(() => {
    let interval: any;

    if (isActive) {
      interval = setInterval(() => {
        if (timeLeft > 0) {
          setTimeLeft((t) => t - 1);
          setSecondsSpent((s) => s + 1);
        } else {
          setIsActive(false);
          setShowSummary(true);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  /* -------- Sound -------- */

  useEffect(() => {
    if (isActive) soundEngine.play(soundType);
    else soundEngine.stop();
  }, [isActive, soundType]);

  /* -------- Distraction Tracking -------- */

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isActive) {
        setDistractionCount((d) => d + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [isActive]);

  /* -------- Progress -------- */

  const progressPercent =
    initialSeconds > 0
      ? ((initialSeconds - timeLeft) / initialSeconds) * 100
      : 0;

  const completionPercent =
    initialSeconds > 0
      ? (secondsSpent / initialSeconds) * 100
      : 0;

  const ambientColor = useMemo(() => {
    if (!isActive) return "rgba(99,102,241,0.15)";
    if (progressPercent < 50) return "rgba(59,130,246,0.18)";
    if (progressPercent < 90) return "rgba(99,102,241,0.20)";
    return "rgba(251,146,60,0.22)";
  }, [progressPercent, isActive]);

  const sessionInsight = useMemo(() => {
    if (completionPercent >= 100 && distractionCount === 0)
      return "Outstanding discipline. You maintained deep focus throughout.";
    if (completionPercent >= 75)
      return "Strong effort. Your focus consistency is improving.";
    if (completionPercent >= 40)
      return "Solid progress. Try reducing pauses next time.";
    if (completionPercent > 0)
      return "Session ended early. Consider smaller goals for momentum.";
    return "Session not completed.";
  }, [completionPercent, distractionCount]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleEndEarly = () => {
  if (secondsSpent === 0) return;

  soundEngine.stop();
  setIsActive(false);

  // Add to routine
  onExit(Math.floor(secondsSpent / 60));

  setShowSummary(true);
};

  const radius = 140;
  const circumference = 2 * Math.PI * radius;

  /* ================= UI ================= */

  return (
    <div className="relative min-h-screen bg-[#0f1012] text-white flex flex-col overflow-hidden">

      {/* Ambient Background */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at center,
            ${ambientColor},
            #0f1012 65%)`,
        }}
      />

      {/* Header */}
      <div className="relative z-10 px-6 py-4 flex justify-between items-center border-b border-white/10">
        <button
          onClick={() => onExit(Math.floor(secondsSpent / 60))}
          className="flex items-center gap-2 text-white/60 hover:text-white transition"
        >
          <ChevronLeft size={18} /> Exit
        </button>

        <div className="text-xs uppercase tracking-widest text-white/40">
          Focus Mode
        </div>

        <div />
      </div>

      {/* Timer Core */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8">

        <div className="relative flex items-center justify-center">

          <svg className="absolute w-[320px] h-[320px] -rotate-90">
            <circle
              cx="160"
              cy="160"
              r={radius}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="160"
              cy="160"
              r={radius}
              stroke="#6366f1"
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              style={{
                strokeDashoffset:
                  circumference -
                  (circumference * progressPercent) / 100,
                transition: "stroke-dashoffset 0.5s ease-out",
              }}
              strokeLinecap="round"
            />
          </svg>

          <h1 className="text-6xl md:text-9xl font-mono tracking-tight z-10">
            {formatTime(timeLeft)}
          </h1>
        </div>

        <div className="flex items-center gap-8">
          <button
            onClick={() => {
              if (isActive) {
                setPauseCount((p) => p + 1);
                soundEngine.stop();
                setIsActive(false);
              } else {
                setIsActive(true);
              }
            }}
            className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center
                       transition-all duration-300 hover:scale-110 active:scale-95
                       hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
          >
            {isActive ? <Pause size={28} /> : <Play size={28} />}
          </button>

          <button
            onClick={handleEndEarly}
            className="p-4 rounded-full bg-red-500/20 border border-red-400/40
           hover:bg-red-500/30 transition"
          >
            <div className="flex items-center gap-2">
  <Square size={18} />
  <span className="text-xs font-medium">Add</span>
</div>
          </button>
        </div>

        {isActive && (
          <div className="text-xs text-white/30 tracking-widest">
            Stay present. Stay intentional.
          </div>
        )}
      </div>

      {/* Config Panel */}
      {!isActive && !showSummary && (
        <div className="relative z-10 border-t border-white/10 bg-[#0c0d10] px-6 py-12">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">

            <div>
              <h3 className="text-xs uppercase text-white/40 tracking-widest mb-6">
                Session Duration
              </h3>

              <div className="flex gap-4 flex-wrap mb-6">
  {PRESETS.map((p) => (
    <button
      key={p.label}
      onClick={() => {
        const totalSeconds = p.minutes * 60;

        setHours(0);
        setMinutes(p.minutes);
        setSeconds(0);

        setInitialSeconds(totalSeconds);
        setTimeLeft(totalSeconds);
        setSecondsSpent(0);
      }}
      className="px-6 py-4 bg-white/5 border border-white/10 rounded-xl
                 hover:bg-white/10 transition-all duration-300"
    >
      <div className="font-semibold text-base">
        {p.minutes} min
      </div>

      <div className="text-xs text-white/40 mt-1 tracking-wide">
        {p.label}
      </div>
    </button>
  ))}
</div>

              <div className="flex gap-4">
                <TimeInput label="HH" value={hours} setValue={setHours} max={23} />
                <TimeInput label="MM" value={minutes} setValue={setMinutes} max={59} />
                <TimeInput label="SS" value={seconds} setValue={setSeconds} max={59} />
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase text-white/40 tracking-widest mb-6">
                Focus Sounds
              </h3>

              <div className="flex gap-4 flex-wrap">
                {(["none","brown-noise","heavy-rain","forest"] as SoundType[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSoundType(s)}
                    className={`px-6 py-3 rounded-xl transition-all ${
                      soundType === s
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {s.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Summary */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-[#1a1b1e] border border-white/10 rounded-3xl p-8 w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="text-indigo-400" />
              <h2 className="text-xl font-bold">Session Report</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <StatCard label="Focused Time" value={formatTime(secondsSpent)} />
              <StatCard label="Completion" value={`${completionPercent.toFixed(0)}%`} />
              <StatCard label="Pauses" value={pauseCount} />
              <StatCard label="Distractions" value={distractionCount} />
            </div>

            <div className="text-sm text-white/60 mb-6">
              {sessionInsight}
            </div>

            <button
              onClick={() => onExit(Math.floor(secondsSpent / 60))}
              className="w-full py-3 bg-indigo-600 rounded-2xl font-bold hover:bg-indigo-500 transition"
            >
              Complete Session
            </button>
            <button
  onClick={handleEndEarly}
  className="px-6 py-3 bg-indigo-600 rounded-xl font-semibold hover:bg-indigo-500"
>
  Complete & Add to Routine
</button>
          </div>
        </div>
      )}
    </div>
  );
};

const TimeInput = ({ label, value, setValue, max }) => (
  <div className="flex flex-col items-center">
    <input
      type="number"
      value={value}
      min={0}
      max={max}
      onChange={(e) => {
        let num = parseInt(e.target.value) || 0;
        if (num > max) num = max;
        if (num < 0) num = 0;
        setValue(num);
      }}
      className="w-20 h-14 bg-[#15171c] border border-white/10 rounded-xl text-center text-lg font-mono focus:outline-none focus:border-indigo-500"
    />
    <span className="text-xs text-white/40 mt-2 uppercase tracking-widest">
      {label}
    </span>
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition">
    <div className="text-xs text-white/40 uppercase tracking-widest mb-2">
      {label}
    </div>
    <div className="text-lg font-bold">{value}</div>
  </div>
);

export default Focus;