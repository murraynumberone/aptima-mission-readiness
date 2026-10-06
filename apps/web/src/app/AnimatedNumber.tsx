import { useLayoutEffect, useRef } from "react";
import { animate } from "motion";
import { prefersReducedMotion } from "../lib/motion";

const DURATION_SEC = 0.35;

/**
 * Counts to its new value so a change made while scrubbing is easy to follow. The moving digits are hidden
 * from assistive technology; the final value is plain text beside them. No animation on first render or for
 * reduced motion.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const digits = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  // The digits are written straight to the DOM, so React doesn't re-render (or fight the animation) every frame.
  useLayoutEffect(() => {
    const el = digits.current;
    if (!el) return;
    if (shown.current === value || prefersReducedMotion()) {
      shown.current = value;
      el.textContent = format(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration: DURATION_SEC,
      ease: "easeOut",
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = format(v);
      },
      onComplete: () => {
        shown.current = value;
        el.textContent = format(value);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- format is a pure function of its argument
  }, [value]);

  return (
    <span className={className}>
      <span ref={digits} aria-hidden />
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
