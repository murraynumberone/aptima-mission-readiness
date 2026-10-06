import { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { metricDefinitions } from "../../data/definitions";
import type { Run } from "../../data/types";
import { useClock, useClockActions } from "../../lib/clock-react";
import { formatClock, formatScore } from "../../lib/format";
import { sampleIndexAt } from "../../lib/metrics";
import { EventIcon } from "../timeline/EventIcon";

const HEIGHT = 220;
const MARGIN = { top: 26, right: 12, bottom: 26, left: 40 };
const Y_TICKS = [40, 60, 80, 100];
const FALLBACK_WIDTH = 600; // before the first measurement, and in tests (no layout)

// The two series differ in line style and marker shape, so they can be told apart without color.
const SERIES = {
  readiness: {
    label: metricDefinitions.readiness.label,
    stroke: "var(--surface-foreground)",
    dash: undefined,
    marker: "circle",
  },
  exerciseScore: {
    label: metricDefinitions.exerciseScore.label,
    stroke: "var(--accent)",
    dash: "7 4",
    marker: "square",
  },
} as const;

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width: width || FALLBACK_WIDTH };
}

export function PerformanceChart({ run }: { run: Run }) {
  const clock = useClockActions();
  const { ref, width } = useWidth();
  // The lines change only when a new sample arrives; the cursor follows time separately.
  const edgeIndex = useClock((s) => sampleIndexAt(run, s.edge));
  const innerW = Math.max(40, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = useMemo(() => scaleLinear({ domain: [0, run.durationSec], range: [0, innerW] }), [run.durationSec, innerW]);
  const y = useMemo(() => scaleLinear({ domain: [40, 100], range: [innerH, 0] }), [innerH]);
  const points = useMemo(
    () => run.teamSamples.slice(0, edgeIndex + 1).map((s, i) => ({ t: i * run.sampleIntervalSec, ...s })),
    [run, edgeIndex],
  );
  const edgeSec = edgeIndex * run.sampleIntervalSec;
  const events = run.events.filter((e) => e.t <= edgeSec);
  const xTickStep = innerW < 360 ? 600 : 300; // fewer labels on a narrow screen
  const xTicks = Array.from({ length: Math.floor(run.durationSec / xTickStep) + 1 }, (_, i) => i * xTickStep);

  // Press to jump, drag to scrub. Playback pauses under the pointer and resumes after, like the timeline, which is
  // the keyboard route.
  const scrub = useRef<{ wasPlaying: boolean } | null>(null);
  const seekFromPointer = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    clock.seek(x.invert(e.clientX - box.left));
  };
  const startScrub = (e: React.PointerEvent<SVGRectElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId); // keep following when the pointer leaves the chart
    scrub.current = { wasPlaying: clock.getState().playing };
    clock.pause();
    seekFromPointer(e);
  };
  const moveScrub = (e: React.PointerEvent<SVGRectElement>) => {
    if (scrub.current) seekFromPointer(e);
  };
  const endScrub = () => {
    if (scrub.current?.wasPlaying) clock.play();
    scrub.current = null;
  };

  return (
    <section aria-labelledby="chart-heading" className="mt-5">
      <h2 id="chart-heading" className="label mb-2">
        Performance over time
      </h2>
      <div className="panel p-4">
        <Readout run={run} />

        <div ref={ref} className="mt-3">
          <svg
            role="img"
            aria-labelledby="chart-title chart-desc"
            width={width}
            height={HEIGHT}
            className="block max-w-full font-mono"
          >
            <title id="chart-title">Readiness and Exercise Score over time</title>
            <desc id="chart-desc">
              Two lines across the {formatClock(run.durationSec)} exercise, drawn up to the latest moment. Exact values
              are in the table below the chart.
            </desc>
            <defs>
              <pattern id="chart-future" width="6" height="6" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--line)" strokeWidth="1" />
              </pattern>
            </defs>

            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {Y_TICKS.map((v) => (
                <g key={v}>
                  <line x1={0} x2={innerW} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
                  <text x={-8} y={y(v)} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--muted-foreground)">
                    {v}%
                  </text>
                </g>
              ))}
              {xTicks.map((t) => (
                <text
                  key={t}
                  x={x(t)}
                  y={innerH + 18}
                  textAnchor={t === 0 ? "start" : t === run.durationSec ? "end" : "middle"}
                  fontSize={12}
                  fill="var(--muted-foreground)"
                >
                  {formatClock(t)}
                </text>
              ))}

              {/* time that hasn't happened yet */}
              <rect
                aria-hidden
                x={x(edgeSec)}
                y={0}
                width={Math.max(0, innerW - x(edgeSec))}
                height={innerH}
                fill="url(#chart-future)"
              />

              {/* event markers along the top, same shapes as the scrubber */}
              {events.map((e) => (
                <g key={e.id} aria-hidden transform={`translate(${x(e.t) - 6},-20)`} color="var(--muted-foreground)">
                  <EventIcon kind={e.kind} size={12} />
                  <line
                    x1={6}
                    x2={6}
                    y1={14}
                    y2={20 + innerH}
                    stroke="var(--line)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                </g>
              ))}

              <g className="draw-in">
                <LinePath
                  data={points}
                  x={(d) => x(d.t)}
                  y={(d) => y(d.readiness)}
                  stroke={SERIES.readiness.stroke}
                  strokeWidth={2}
                  data-testid="line-readiness"
                />
                <LinePath
                  data={points}
                  x={(d) => x(d.t)}
                  y={(d) => y(d.exerciseScore)}
                  stroke={SERIES.exerciseScore.stroke}
                  strokeWidth={2}
                  strokeDasharray={SERIES.exerciseScore.dash}
                  data-testid="line-score"
                />
              </g>

              <Cursor run={run} x={x} y={y} innerH={innerH} />

              {/* A pointer shortcut only. The keyboard (and screen reader) route to the same thing is the scrubber. */}
              <rect
                aria-hidden
                data-testid="chart-hit-area"
                x={0}
                y={0}
                width={innerW}
                height={innerH}
                fill="transparent"
                className="cursor-ew-resize touch-pan-y"
                onPointerDown={startScrub}
                onPointerMove={moveScrub}
                onPointerUp={endScrub}
                onPointerCancel={endScrub}
              />
            </g>
          </svg>
        </div>

        <DataTable run={run} />
      </div>
    </section>
  );
}

/** The moment the whole app is showing, with a marker on each line. */
function Cursor({
  run,
  x,
  y,
  innerH,
}: {
  run: Run;
  x: (t: number) => number;
  y: (v: number) => number;
  innerH: number;
}) {
  const t = useClock((s) => Math.floor(s.time));
  const sample = run.teamSamples[sampleIndexAt(run, t)]!;
  return (
    <g aria-hidden pointerEvents="none">
      <line
        data-testid="chart-cursor"
        x1={x(t)}
        x2={x(t)}
        y1={0}
        y2={innerH}
        stroke="var(--surface-foreground)"
        strokeWidth={1}
      />
      <circle
        cx={x(t)}
        cy={y(sample.readiness)}
        r={4}
        fill="var(--surface)"
        stroke={SERIES.readiness.stroke}
        strokeWidth={2}
      />
      <rect
        x={x(t) - 4}
        y={y(sample.exerciseScore) - 4}
        width={8}
        height={8}
        fill="var(--surface)"
        stroke={SERIES.exerciseScore.stroke}
        strokeWidth={2}
      />
    </g>
  );
}

/** The legend, which doubles as a live readout of both values at the current moment. */
function Readout({ run }: { run: Run }) {
  const index = useClock((s) => sampleIndexAt(run, s.time));
  const sample = run.teamSamples[index]!;
  const item = (key: keyof typeof SERIES, value: number) => {
    const s = SERIES[key];
    return (
      <li key={key} className="flex items-center gap-2">
        <svg aria-hidden width={26} height={10} className="shrink-0">
          <line x1={0} x2={26} y1={5} y2={5} stroke={s.stroke} strokeWidth={2} strokeDasharray={s.dash} />
          {s.marker === "circle" ? (
            <circle cx={13} cy={5} r={3.5} fill="var(--surface)" stroke={s.stroke} strokeWidth={2} />
          ) : (
            <rect x={9.5} y={1.5} width={7} height={7} fill="var(--surface)" stroke={s.stroke} strokeWidth={2} />
          )}
        </svg>
        <span>{s.label}</span>
        <span className="font-mono font-medium tabular-nums">{formatScore(value)}%</span>
      </li>
    );
  };
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
      {item("readiness", sample.readiness)}
      {item("exerciseScore", sample.exerciseScore)}
    </ul>
  );
}

/** The same data as a table, one row a minute, for anyone who can't or would rather not read the lines. */
function DataTable({ run }: { run: Run }) {
  const edgeMinute = useClock((s) => Math.floor(s.edge / 60));
  const rows = useMemo(() => {
    const stepSamples = 60 / run.sampleIntervalSec;
    return Array.from({ length: edgeMinute + 1 }, (_, m) => {
      const i = Math.min(m * stepSamples, run.teamSamples.length - 1);
      return { t: m * 60, ...run.teamSamples[i]! };
    });
  }, [run, edgeMinute]);

  return (
    <details className="mt-3 text-sm">
      <summary className="-mx-2 min-h-6 cursor-pointer rounded-(--radius) px-2 py-0.5 font-mono text-xs select-none hover:bg-fill-subtle">
        View as a table
      </summary>
      <div className="relative mt-2 max-h-60 overflow-auto overscroll-contain border border-line">
        <table className="w-full text-left">
          <caption className="sr-only">Readiness and Exercise Score at the start of each minute so far</caption>
          <thead className="sticky top-0 bg-bg">
            <tr className="border-b border-line">
              <th scope="col" className="label px-3 py-1.5 font-normal">
                Time
              </th>
              <th scope="col" className="label px-3 py-1.5 font-normal">
                Readiness
              </th>
              <th scope="col" className="label px-3 py-1.5 font-normal">
                Exercise Score
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.t} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-3 py-1 font-mono text-xs font-normal tabular-nums">
                  {formatClock(r.t)}
                </th>
                <td className="px-3 py-1 font-mono tabular-nums">{formatScore(r.readiness)}%</td>
                <td className="px-3 py-1 font-mono tabular-nums">{formatScore(r.exerciseScore)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
