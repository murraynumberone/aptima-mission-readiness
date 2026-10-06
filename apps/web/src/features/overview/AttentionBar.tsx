import { useMemo } from "react";
import { StatusBadge } from "@mission-readiness/ui";
import type { Run } from "../../data/types";
import { useClock } from "../../lib/clock-react";
import { formatScore } from "../../lib/format";
import { alertCountAt, momentFrom, pickAttention, sampleIndexAt } from "../../lib/metrics";

interface Props {
  run: Run;
  /** Opens an operator's detail. `returnFocusTo` is the element focus should go back to when it closes. */
  onSelect: (operatorId: string, returnFocusTo: string) => void;
}

/** Who needs attention now, near the top. Always one line tall so nothing below it moves. */
export function AttentionBar({ run, onSelect }: Props) {
  const index = useClock((s) => sampleIndexAt(run, s.time));
  const alerts = useClock((s) => alertCountAt(run, s.time));
  const { operators } = useMemo(() => momentFrom(run, index, alerts), [run, index, alerts]);
  const { shown, more } = pickAttention(operators);
  // min-h matches a row holding a button (32px button, 16px padding, 2px border), so the empty state is not
  // shorter.

  return (
    <section aria-labelledby="attention-heading" className="mt-5">
      <h2 id="attention-heading" className="sr-only">
        Needs attention
      </h2>
      <div className="panel flex min-h-12.5 flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm">
        {shown.length === 0 ? (
          <>
            <span aria-hidden className="size-2.5 shrink-0 rounded-full border-[1.5px] border-current" />
            <span>All operators nominal at this moment.</span>
          </>
        ) : (
          <>
            <span className="label">Needs attention</span>
            {shown.map((op) => (
              <button
                key={op.id}
                id={`attention-${op.id}`}
                type="button"
                aria-controls="operator-panel"
                onClick={() => onSelect(op.id, `attention-${op.id}`)}
                className="btn gap-2"
              >
                <StatusBadge status={op.status} />
                <span className="font-medium">{op.name}</span>
                <span className="tabular-nums">{formatScore(op.score)}%</span>
              </button>
            ))}
            {more > 0 && <span className="text-muted-foreground">+{more} more in the table below</span>}
          </>
        )}
      </div>
    </section>
  );
}
