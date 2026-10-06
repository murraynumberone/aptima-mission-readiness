export interface ClockState {
  /** The moment every panel shows, in seconds. Never beyond `edge`. */
  time: number;
  /** How much of the exercise has happened so far. Never beyond `duration`. */
  edge: number;
  duration: number;
  playing: boolean;
  /** Counts user-initiated moves (seek, step, go live), never playback ticks. */
  seeks: number;
  /** Where the last user move was aimed. Unlike `time`, it doesn't drift as playback ticks on. */
  seekedTo: number;
}

export interface ClockOptions {
  duration: number;
  edge: number;
  time?: number;
  playing?: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The single source of truth for the current moment. Framework-free; panels subscribe through selectors.
 */
export function createClock({ duration, edge, time, playing = false }: ClockOptions) {
  let state: ClockState = { duration, edge, time: time ?? edge, playing, seeks: 0, seekedTo: time ?? edge };
  const listeners = new Set<() => void>();

  const set = (next: Partial<ClockState>) => {
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };

  const play = () => {
    if (state.time >= state.duration) return;
    set({ playing: true });
  };
  const pause = () => set({ playing: false });
  const seek = (t: number) => {
    const time = clamp(t, 0, state.edge);
    set({ time, seeks: state.seeks + 1, seekedTo: time });
  };

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    play,
    pause,
    toggle: () => (state.playing ? pause() : play()),
    seek,
    step: (delta: number) => seek(state.time + delta),
    goLive: () => set({ time: state.edge, seeks: state.seeks + 1, seekedTo: state.edge }),
    /** Advance simulated time. Called by the driver; paused clocks do nothing. */
    tick(dt: number) {
      if (!state.playing) return;
      const edge = Math.min(state.duration, state.edge + dt);
      const time = Math.min(edge, state.time + dt);
      set({ edge, time, playing: time < state.duration });
    },
  };
}

export type Clock = ReturnType<typeof createClock>;
