import { skillAreaLabels, skillAreas } from "../data/definitions";
import type { ExerciseEvent, Run, SkillArea } from "../data/types";

export const ATTENTION_BELOW = 72;
export const CRITICAL_BELOW = 60;

export type Status = "nominal" | "attention" | "critical";

export const statusFor = (score: number): Status =>
  score < CRITICAL_BELOW ? "critical" : score < ATTENTION_BELOW ? "attention" : "nominal";

export const sampleIndexAt = (run: Run, t: number) =>
  Math.min(run.teamSamples.length - 1, Math.max(0, Math.floor(t / run.sampleIntervalSec)));

const countsAsAlert = (e: ExerciseEvent) =>
  e.kind === "missed-alert" || (e.kind === "autonomy-flag" && e.response === "not-acted");

/** Alerts raised up to and including moment `t` (exact, not sample-quantized). */
export const alertCountAt = (run: Run, t: number) => run.events.filter((e) => e.t <= t && countsAsAlert(e)).length;

/** An alert is "active" for this long after it happens. */
export const ACTIVE_ALERT_WINDOW_SEC = 90;

/** Alerts raised within the last ACTIVE_ALERT_WINDOW_SEC seconds, up to and including moment `t`. */
export const activeAlertsAt = (run: Run, t: number) =>
  run.events.filter((e) => e.t <= t && e.t > t - ACTIVE_ALERT_WINDOW_SEC && countsAsAlert(e)).length;

export const latestEventAt = (run: Run, t: number): ExerciseEvent | undefined => run.events.findLast((e) => e.t <= t);

export interface OperatorMoment {
  id: string;
  name: string;
  role: string;
  score: number;
  status: Status;
  strength: string;
  attentionArea: string;
}

export interface Moment {
  readiness: number;
  exerciseScore: number;
  alerts: number;
  operators: OperatorMoment[];
}

/** Derive every panel's numbers from a sample index and alert count. Pure, so it memoizes well. */
export function momentFrom(run: Run, sampleIndex: number, alerts: number): Moment {
  const team = run.teamSamples[sampleIndex]!;
  const operators = run.team.operators.map((op) => {
    const sample = run.operatorSamples[op.id]![sampleIndex]!;
    const byScore = [...skillAreas].sort((a: SkillArea, b: SkillArea) => sample[b] - sample[a]);
    const score = skillAreas.reduce((sum, a) => sum + sample[a], 0) / skillAreas.length;
    return {
      id: op.id,
      name: op.name,
      role: op.role,
      score,
      // Judge the rounded score so the label always agrees with the number on screen.
      status: statusFor(Math.round(score)),
      strength: skillAreaLabels[byScore[0]!],
      attentionArea: skillAreaLabels[byScore[byScore.length - 1]!],
    };
  });
  return { readiness: team.readiness, exerciseScore: team.exerciseScore, alerts, operators };
}

/** Operators who are not nominal, worst first, split into the few worth naming and a count of the rest. */
export function pickAttention(operators: OperatorMoment[], max = 2) {
  const flagged = operators.filter((o) => o.status !== "nominal").sort((a, b) => a.score - b.score);
  return { shown: flagged.slice(0, max), more: Math.max(0, flagged.length - max) };
}

export const momentAt = (run: Run, t: number): Moment => momentFrom(run, sampleIndexAt(run, t), alertCountAt(run, t));
