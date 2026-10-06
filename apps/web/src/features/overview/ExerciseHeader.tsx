import { useEffect, useState } from "react";
import type { Run } from "../../data/types";
import { useClock } from "../../lib/clock-react";

/** The page title and the exercise it's about. The banner landmark itself lives in App. */
export function ExerciseHeader({ run }: { run: Run }) {
  const complete = useClock((s) => s.edge >= s.duration);
  const items = [
    ["Exercise", `${run.name} (Exercise ${run.number})`],
    ["Team", run.team.name],
    ["Status", complete ? "Complete" : "In Progress"],
  ];
  return (
    <div className="border-b border-line pb-3">
      <h1 className="text-xl tracking-tight">Mission Readiness</h1>
      <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-0.5 font-mono text-xs">
        {items.map(([k, v]) => (
          <div key={k} className="flex gap-1.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">
              {v}
              {k === "Status" && !complete && <Cursor />}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const BLINK_FOR_MS = 5000; // blinking content must stop within 5 s (WCAG 2.2.2)

function Cursor() {
  const [blinking, setBlinking] = useState(true);
  useEffect(() => {
    const stop = () => setBlinking(false);
    const timer = window.setTimeout(stop, BLINK_FOR_MS);
    window.addEventListener("pointerdown", stop, { once: true });
    window.addEventListener("keydown", stop, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);
  return (
    <span
      aria-hidden
      data-testid="status-cursor"
      className={`ml-1.5 inline-block h-[1em] w-[0.55em] translate-y-[0.14em] bg-current ${blinking ? "blink" : ""}`}
    />
  );
}
