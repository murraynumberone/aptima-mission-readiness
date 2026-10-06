import { skillAreas } from "./definitions";
import type { ExerciseEvent, Operator, OperatorSample, Run, SkillArea } from "./types";

/** Small seeded PRNG so the synthetic data is identical on every load. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Score impact of an event on the operator's skill areas, decaying over time. */
const impact: Record<string, Partial<Record<SkillArea, number>>> = {
  handoff: { coordination: -16 },
  "missed-alert": { response: -45, awareness: -30 },
  "autonomy-flag:not-acted": { awareness: -55, response: -40 },
  "autonomy-flag:acted": { awareness: 20, response: 10 },
};
const DECAY_SEC = 120;

const clamp = (v: number) => Math.min(100, Math.max(0, v));

export interface RunSpec {
  id: string;
  number: string;
  name: string;
  scenario: string;
  teamName: string;
  operators: Operator[];
  seed: number;
  durationSec: number;
  sampleIntervalSec: number;
  initialEdgeSec: number;
  /** Starting skill level per operator, 0 to 100. */
  baseline: Record<string, number>;
  /** Readiness before this exercise began. */
  priorReadiness: number;
  events: ExerciseEvent[];
}

export function generateRun(spec: RunSpec): Run {
  const rand = mulberry32(spec.seed);
  const count = Math.floor(spec.durationSec / spec.sampleIntervalSec) + 1;
  const events = [...spec.events].sort((a, b) => a.t - b.t);

  const operatorSamples: Record<string, OperatorSample[]> = {};
  spec.operators.forEach((op, opIndex) => {
    const mine = events.filter((e) => e.operatorId === op.id);
    operatorSamples[op.id] = Array.from({ length: count }, (_, i) => {
      const t = i * spec.sampleIntervalSec;
      const sample = {} as OperatorSample;
      skillAreas.forEach((area, areaIndex) => {
        const drift = 3 * Math.sin(t / 240 + opIndex + areaIndex);
        const noise = (rand() - 0.5) * 4;
        let dip = 0;
        for (const e of mine) {
          if (e.t > t) break;
          const key = e.response ? `${e.kind}:${e.response}` : e.kind;
          dip += (impact[key]?.[area] ?? 0) * Math.exp(-(t - e.t) / DECAY_SEC);
        }
        sample[area] = clamp(spec.baseline[op.id]! + drift + noise + dip);
      });
      return sample;
    });
  });

  const scores = (i: number) =>
    spec.operators.map((op) => {
      const s = operatorSamples[op.id]![i]!;
      return skillAreas.reduce((sum, a) => sum + s[a], 0) / skillAreas.length;
    });

  let runningTotal = 0;
  const teamSamples = Array.from({ length: count }, (_, i) => {
    const s = scores(i);
    const exerciseScore = s.reduce((a, b) => a + b, 0) / s.length;
    runningTotal += exerciseScore;
    // Readiness moves slowly: prior history weighs about as much as this run so far.
    const readiness = 0.5 * spec.priorReadiness + 0.5 * (runningTotal / (i + 1));
    return { readiness, exerciseScore };
  });

  return {
    id: spec.id,
    number: spec.number,
    name: spec.name,
    scenario: spec.scenario,
    team: { name: spec.teamName, operators: spec.operators },
    durationSec: spec.durationSec,
    sampleIntervalSec: spec.sampleIntervalSec,
    initialEdgeSec: spec.initialEdgeSec,
    events,
    teamSamples,
    operatorSamples,
  };
}
