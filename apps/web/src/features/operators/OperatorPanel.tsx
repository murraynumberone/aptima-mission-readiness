import { useEffect, useRef, type KeyboardEvent } from "react";
import { Button, StatusBadge } from "@mission-readiness/ui";
import { AnimatedNumber } from "../../app/AnimatedNumber";
import { IconClose } from "../../app/icons";
import type { Run } from "../../data/types";
import { useClock, useClockActions } from "../../lib/clock-react";
import { explainOperator } from "../../lib/explain";
import { formatClock, formatScore } from "../../lib/format";

interface Props {
  run: Run;
  operatorId: string | null;
  onClose: () => void;
}

const outcomeText = { fell: "Score fell", rose: "Score rose", "little change": "Little change in score" };

/** Detail for one operator, with the reasons behind their status. Follows the playback clock. */
export function OperatorPanel({ run, operatorId, onClose }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const clock = useClockActions();
  // Whole seconds: re-derives once a second while playing, not every frame.
  const time = useClock((s) => Math.floor(s.time));

  // Move focus to the panel when an operator is chosen, so keyboard and screen reader users land on it.
  useEffect(() => {
    if (operatorId) heading.current?.focus();
  }, [operatorId]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const info = operatorId ? explainOperator(run, operatorId, time) : null;

  return (
    // Escape from anywhere inside the panel closes it; the panel is not a control.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      id="operator-panel"
      data-aside
      aria-labelledby="operator-panel-label"
      onKeyDown={onKeyDown}
      className="panel mt-5 p-4 xl:sticky xl:top-4 xl:mt-5 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain"
    >
      <h2 id="operator-panel-label" className="label">
        Operator detail
      </h2>

      {!info ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Select an operator to see why they are flagged, and the moments that moved their score.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <h3 ref={heading} tabIndex={-1} className="text-lg outline-offset-4">
                {info.name}
              </h3>
              <p className="text-xs text-muted-foreground">{info.role}</p>
            </div>
            <Button onClick={onClose}>
              <IconClose />
              Close <span className="sr-only">operator detail</span>
            </Button>
          </div>

          <p className="mt-3 flex flex-wrap items-center gap-x-3 font-mono">
            <AnimatedNumber
              value={info.score}
              format={(n) => `${Math.round(n)}%`}
              className="text-[1.75rem] leading-tight font-medium tabular-nums"
            />
            <StatusBadge status={info.status} />
          </p>

          <h4 className="label mt-5">Why</h4>
          <p className="mt-1">{info.summary}</p>

          <h4 className="label mt-5">Skill areas</h4>
          <dl className="mt-1 space-y-2.5">
            {info.areas.map((a) => (
              <div key={a.area} className="flex items-start justify-between gap-2">
                <dt className="flex-1">
                  {a.label}
                  {a.lowest && <span className="ml-2 font-mono text-xs font-semibold">Lowest</span>}
                  <div aria-hidden className="mt-1 h-1 bg-fill-subtle">
                    <div className="h-1 bg-surface-foreground" style={{ width: `${a.value}%` }} />
                  </div>
                </dt>
                <dd className="font-mono tabular-nums">{formatScore(a.value)}%</dd>
              </div>
            ))}
          </dl>

          <h4 className="label mt-5">Moments that moved the score</h4>
          {info.causes.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No events involving {info.name} yet. Drag the timeline forward or jump to the next event.
            </p>
          ) : (
            <ol className="mt-1 divide-y divide-line overflow-hidden rounded-(--radius) border border-line">
              {info.causes.map((c) => (
                <li key={c.event.id} className="px-3 py-3">
                  <button
                    type="button"
                    aria-label={`Show ${formatClock(c.event.t)} on the timeline: ${c.event.title}`}
                    onClick={() => clock.seek(c.event.t)}
                    className="flex min-h-6 items-baseline gap-2.5 text-left font-semibold hover:underline"
                  >
                    <time className="font-mono tabular-nums">{formatClock(c.event.t)}</time>
                    <span>{c.event.title}</span>
                  </button>
                  <p className="mt-1 text-sm">{c.event.detail}</p>
                  <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                    {c.event.response && (
                      <>
                        {c.event.response === "acted" ? "Human acted" : "No action taken"}
                        {" · "}
                      </>
                    )}
                    {outcomeText[c.outcome]}
                    {c.outcome !== "little change" && ` ${formatScore(c.before)} to ${formatScore(c.after)}`}
                    {" · "}Most affected: {c.area}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
