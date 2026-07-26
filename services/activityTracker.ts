import { StorageService } from './storageService';

/**
 * Tracks time actually spent working in the app and rolls it into
 * `UserStats.dailyActivity`, which is what the dashboard analytics chart plots.
 *
 * Before this, only Focus Mode logged study time, so the chart stayed flat at
 * zero for anyone who took notes, summarised or quizzed without starting a
 * focus session.
 *
 * Time only counts while the tab is visible AND the user has interacted within
 * IDLE_TIMEOUT_MS, so leaving the app open overnight does not inflate stats.
 */

const TICK_MS = 15_000; // granularity of accumulation
const IDLE_TIMEOUT_MS = 90_000; // no input for this long => not studying
const FLUSH_INTERVAL_MS = 60_000; // persist at most once a minute

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousedown',
  'mousemove',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
];

let tickTimer: ReturnType<typeof setInterval> | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let lastInteraction = Date.now();
let accumulatedMs = 0;
let paused = false;
let onFlush: (() => void) | null = null;

const markInteraction = () => {
  lastInteraction = Date.now();
};

const tick = () => {
  if (paused) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  if (Date.now() - lastInteraction > IDLE_TIMEOUT_MS) return;
  accumulatedMs += TICK_MS;
};

const flush = async () => {
  const minutes = Math.floor(accumulatedMs / 60_000);
  if (minutes < 1) return;

  accumulatedMs -= minutes * 60_000;
  try {
    await StorageService.logStudyTime(minutes);
    onFlush?.();
  } catch (error) {
    // Put the time back so a transient write failure doesn't lose it.
    accumulatedMs += minutes * 60_000;
    console.error('[ActivityTracker] Failed to log study time:', error);
  }
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    markInteraction();
  } else {
    void flush();
  }
};

export const ActivityTracker = {
  /** Starts tracking. `onStatsChange` fires after study time is persisted. */
  start(onStatsChange?: () => void) {
    if (tickTimer) return; // already running

    onFlush = onStatsChange ?? null;
    lastInteraction = Date.now();
    paused = false;

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, markInteraction, { passive: true }),
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flush);

    tickTimer = setInterval(tick, TICK_MS);
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  },

  /** Stops tracking and persists whatever whole minutes were accumulated. */
  stop() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }

    ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markInteraction));
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', flush);

    void flush();
    onFlush = null;
  },

  /** Used while Focus Mode runs, which logs its own session time. */
  pause() {
    if (paused) return;
    paused = true;
    void flush();
  },

  resume() {
    if (!paused) return;
    paused = false;
    markInteraction();
  },

  /** Persist immediately (e.g. before showing the dashboard). */
  flushNow() {
    return flush();
  },
};
