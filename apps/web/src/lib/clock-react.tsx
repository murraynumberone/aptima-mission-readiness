import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import type { Clock, ClockState } from "./clock";

const ClockContext = createContext<Clock | null>(null);

/** Longest step the driver will apply, so a throttled background tab doesn't jump ahead. */
const MAX_FRAME_SEC = 0.25;

export function ClockProvider({
  clock,
  drive = true,
  children,
}: {
  clock: Clock;
  /** Tick from requestAnimationFrame. Tests turn this off and call `clock.tick` directly. */
  drive?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!drive) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function loop(now) {
      clock.tick(Math.min((now - last) / 1000, MAX_FRAME_SEC));
      last = now;
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, [clock, drive]);

  return <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>;
}

export function useClockActions(): Clock {
  const clock = useContext(ClockContext);
  if (!clock) throw new Error("useClockActions must be used inside <ClockProvider>");
  return clock;
}

/**
 * Subscribe to a slice of the clock. Return a primitive so a component re-renders only when that value
 * changes.
 */
export function useClock<T extends string | number | boolean | undefined>(selector: (state: ClockState) => T): T {
  const clock = useClockActions();
  return useSyncExternalStore(clock.subscribe, () => selector(clock.getState()));
}
