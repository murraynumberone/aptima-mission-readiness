import { skillAreaLabels, skillAreas } from "../data/definitions";
import type { ExerciseEvent, Run, SkillArea } from "../data/types";
import { ATTENTION_BELOW, CRITICAL_BELOW, sampleIndexAt, statusFor, type Status } from "./metrics";

const meanOf = (s: Record<SkillArea, number>) => skillAreas.reduce((sum, a) => sum + s[a], 0) / skillAreas.length;

/** An event that moved this operator's score, with the numbers before and after. */
export interface Cause {
  event: ExerciseEvent;
  before: number;
  after: number;
  outcome: "fell" | "rose" | "little change";
  /** The skill area that moved most. */
  area: string;
}

export interface AreaScore {
  area: SkillArea;
  label: string;
  value: number;
  lowest: boolean;
}

export interface Explanation {
  name: string;
  role: string;
  score: number;
  status: Status;
  areas: AreaScore[];
  /** One plain sentence: where the operator stands and why that's flagged or not. */
  summary: string;
  /** Events involving this operator up to now, newest first. */
  causes: Cause[];
}

const CHANGE_THRESHOLD = 2;

export function explainOperator(run: Run, operatorId: string, t: number): Explanation {
  const operator = run.team.operators.find((o) => o.id === operatorId)!;
  const samples = run.operatorSamples[operatorId]!;
  const index = sampleIndexAt(run, t);
  const now = samples[index]!;
  const score = meanOf(now);
  const status = statusFor(Math.round(score));

  const lowest = skillAreas.reduce((lo, a) => (now[a] < now[lo] ? a : lo));
  const areas = skillAreas.map((area) => ({
    area,
    label: skillAreaLabels[area],
    value: now[area],
    lowest: area === lowest,
  }));

  const rounded = Math.round(score);
  const low = `${skillAreaLabels[lowest]} (${Math.round(now[lowest])}%)`;
  const summary =
    status === "nominal"
      ? `${operator.name} is at ${rounded}%. No attention flag.`
      : `${operator.name} is at ${rounded}%, below the ${status === "critical" ? CRITICAL_BELOW : ATTENTION_BELOW}% ${status} line. Lowest area: ${low}.`;

  const causes = run.events
    .filter((e) => e.operatorId === operatorId && e.t <= t)
    .map((event): Cause => {
      const i = sampleIndexAt(run, event.t);
      const prev = samples[Math.max(0, i - 1)]!;
      const next = samples[i]!;
      const before = meanOf(prev);
      const after = meanOf(next);
      const moved = skillAreas.reduce((m, a) => (Math.abs(next[a] - prev[a]) > Math.abs(next[m] - prev[m]) ? a : m));
      const delta = after - before;
      return {
        event,
        before,
        after,
        outcome: delta <= -CHANGE_THRESHOLD ? "fell" : delta >= CHANGE_THRESHOLD ? "rose" : "little change",
        area: skillAreaLabels[moved],
      };
    })
    .reverse();

  return { name: operator.name, role: operator.role, score, status, areas, summary, causes };
}
