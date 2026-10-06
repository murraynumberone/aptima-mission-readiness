import { useMemo } from "react";
import { StatusBadge } from "@mission-readiness/ui";
import { AnimatedNumber } from "../../app/AnimatedNumber";
import { IconMore } from "../../app/icons";
import { SwapLabel } from "../../app/SwapLabel";
import type { Run } from "../../data/types";
import { useClock } from "../../lib/clock-react";
import { alertCountAt, momentFrom, sampleIndexAt } from "../../lib/metrics";

interface Props {
  run: Run;
  selectedId: string | null;
  onSelect: (id: string, returnFocusTo: string) => void;
}

const percent = (n: number) => `${Math.round(n)}%`;
const th = "label px-3 py-2.5 text-left font-normal";

export function OperatorTable({ run, selectedId, onSelect }: Props) {
  const index = useClock((s) => sampleIndexAt(run, s.time));
  const alerts = useClock((s) => alertCountAt(run, s.time));
  const { operators } = useMemo(() => momentFrom(run, index, alerts), [run, index, alerts]);

  return (
    <section aria-labelledby="team-heading" className="mt-5">
      <h2 id="team-heading" className="label mb-1.5">
        Team {run.team.name}
      </h2>
      {/* relative: keeps hidden (sr-only) spans inside the scroll area so they can't widen the page. */}
      <div className="panel relative overflow-x-auto">
        {/* Fixed layout: columns do not resize as text changes while scrubbing. The minimum width keeps the longest labels on one line. */}
        <table className="w-full min-w-212 table-fixed text-left">
          <caption className="sr-only">Operators in Team {run.team.name}, with score, status and focus area</caption>
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[8%]" />
            <col className="w-[14%]" />
            <col className="w-[21%]" />
            <col className="w-[21%]" />
            <col className="w-[21%]" />
          </colgroup>
          <thead className="bg-bg">
            <tr className="border-b border-line">
              <th scope="col" className={th}>
                Operator
              </th>
              <th scope="col" className={th}>
                Score
              </th>
              <th scope="col" className={th}>
                Status
              </th>
              <th scope="col" className={th}>
                Strength
              </th>
              <th scope="col" className={th}>
                Needs focus
              </th>
              <th scope="col" className={th}>
                <span className="sr-only">Detail</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {operators.map((op, i) => (
              <tr
                key={op.id}
                className="reveal border-b border-line last:border-b-0 hover:bg-bg"
                style={{ "--i": i } as React.CSSProperties}
              >
                <th scope="row" className="px-3 py-2.5 font-normal">
                  <span className="block leading-snug font-medium">{op.name}</span>
                  <span className="block text-xs text-muted-foreground">{op.role}</span>
                </th>
                <td className="px-3 py-2.5 font-mono tabular-nums">
                  <AnimatedNumber value={op.score} format={percent} />
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={op.status} />
                </td>
                <td className="px-3 py-2.5">{op.strength}</td>
                <td className="px-3 py-2.5">{op.attentionArea}</td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    id={`operator-${op.id}`}
                    aria-controls="operator-panel"
                    aria-current={op.id === selectedId ? "true" : undefined}
                    onClick={() => onSelect(op.id, `operator-${op.id}`)}
                    className="btn px-2.5 aria-current:bg-fill-subtle aria-current:font-bold"
                  >
                    <SwapLabel
                      show={op.status === "nominal" ? "Details" : `Why ${op.status}?`}
                      options={["Details", "Why attention?", "Why critical?"]}
                    />{" "}
                    <span className="sr-only">{op.name}</span>
                    <IconMore className="nudge-r" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
