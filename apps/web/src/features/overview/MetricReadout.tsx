import { useMemo } from "react";
import { AnimatedNumber } from "../../app/AnimatedNumber";
import { metricDefinitions } from "../../data/definitions";
import type { Run } from "../../data/types";
import { useClock } from "../../lib/clock-react";
import { ACTIVE_ALERT_WINDOW_SEC, activeAlertsAt, alertCountAt, momentFrom, sampleIndexAt } from "../../lib/metrics";

export function MetricReadout({ run }: { run: Run }) {
  // Primitive selectors: re-render only when the sample index or alert count changes.
  const index = useClock((s) => sampleIndexAt(run, s.time));
  const alerts = useClock((s) => alertCountAt(run, s.time));
  const moment = useMemo(() => momentFrom(run, index, alerts), [run, index, alerts]);

  const active = useClock((s) => activeAlertsAt(run, s.time));

  const metrics = [
    { ...metricDefinitions.readiness, value: moment.readiness, unit: "%" },
    { ...metricDefinitions.exerciseScore, value: moment.exerciseScore, unit: "%" },
    { ...metricDefinitions.alerts, value: moment.alerts, unit: "" },
  ];

  return (
    <section aria-labelledby="metrics-heading" className="mt-5">
      <h2 id="metrics-heading" className="sr-only">
        Team metrics
      </h2>
      <dl className="grid gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="panel p-4">
            <dt className="label">{m.label}</dt>
            <dd className="mt-1 font-mono text-[1.75rem] leading-tight font-medium tabular-nums">
              <AnimatedNumber value={m.value} />
              <span className="text-base text-muted-foreground">{m.unit}</span>
            </dd>
            <dd className="mt-1.5 text-xs text-muted-foreground">{m.definition}</dd>
            {m.label === metricDefinitions.alerts.label && (
              // Always rendered, and always two lines tall, so the card never changes height. The dot and the words carry the state; the pulse only reinforces it.
              <dd className="mt-2 flex min-h-[2.8em] items-start gap-2 font-mono text-xs">
                <span
                  key={active /* a new alert remounts the dot, so its two pulses play again */}
                  aria-hidden
                  className={`mt-[0.35em] size-2 shrink-0 rounded-full ${active ? "pulse-slow bg-status-critical" : "border border-current"}`}
                />
                {/* The no-break space keeps "90 s" together, so the unit is never stranded on its own line. */}
                {active
                  ? `Active now: ${active} in the last ${ACTIVE_ALERT_WINDOW_SEC}\u00a0s`
                  : `None in the last ${ACTIVE_ALERT_WINDOW_SEC}\u00a0s`}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
