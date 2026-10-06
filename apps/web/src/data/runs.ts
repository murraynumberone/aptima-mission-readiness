import { generateRun, type RunSpec } from "./generate";
import type { ExerciseEvent, Operator } from "./types";

const operators: Operator[] = [
  { id: "op-01", name: "Operator 01", role: "Watch lead" },
  { id: "op-02", name: "Operator 02", role: "Communications" },
  { id: "op-03", name: "Operator 03", role: "Sensor monitor" },
  { id: "op-04", name: "Operator 04", role: "Dispatch" },
];

const common = {
  name: "Coastal Response Simulation",
  scenario: "Coastal Response",
  teamName: "Alpha 3",
  operators,
  durationSec: 1800,
  sampleIntervalSec: 10,
};

const currentEvents: ExerciseEvent[] = [
  {
    id: "b-01",
    t: 180,
    kind: "milestone",
    source: "exercise",
    title: "Initial report received",
    detail: "Scenario phase 1 begins: a coastal incident is reported.",
  },
  {
    id: "b-02",
    t: 300,
    kind: "handoff",
    source: "operator",
    operatorId: "op-02",
    title: "Track monitoring handed to autonomy",
    detail: "Operator 02 handed vessel track monitoring to the autonomous system.",
  },
  {
    id: "b-03",
    t: 540,
    kind: "missed-alert",
    source: "operator",
    operatorId: "op-03",
    title: "Missed alert: channel congestion",
    detail: "Operator 03 did not acknowledge the channel congestion alert.",
  },
  {
    id: "b-04",
    t: 740,
    kind: "autonomy-flag",
    source: "autonomy",
    operatorId: "op-03",
    response: "not-acted",
    title: "Autonomy flagged an unusual vessel track",
    detail:
      "The autonomous system flagged a vessel drifting off its expected track. Operator 03 did not act within 45 seconds.",
  },
  {
    id: "b-05",
    t: 840,
    kind: "handoff",
    source: "autonomy",
    operatorId: "op-01",
    title: "Track monitoring returned to Operator 01",
    detail: "The autonomous system handed track monitoring back to the watch lead.",
  },
  {
    id: "b-06",
    t: 990,
    kind: "missed-alert",
    source: "operator",
    operatorId: "op-03",
    title: "Missed alert: weather update",
    detail: "Operator 03 did not acknowledge the weather update alert.",
  },
  {
    id: "b-07",
    t: 1200,
    kind: "autonomy-flag",
    source: "autonomy",
    operatorId: "op-04",
    response: "acted",
    title: "Autonomy flagged a second vessel track",
    detail: "Operator 04 confirmed the flag and dispatched within 20 seconds.",
  },
  {
    id: "b-08",
    t: 1500,
    kind: "missed-alert",
    source: "operator",
    operatorId: "op-02",
    title: "Missed alert: relay status",
    detail: "Operator 02 did not acknowledge the relay status alert.",
  },
];

const priorEvents: ExerciseEvent[] = [
  {
    id: "a-01",
    t: 200,
    kind: "milestone",
    source: "exercise",
    title: "Initial report received",
    detail: "Scenario phase 1 begins: a coastal incident is reported.",
  },
  {
    id: "a-02",
    t: 620,
    kind: "missed-alert",
    source: "operator",
    operatorId: "op-02",
    title: "Missed alert: channel congestion",
    detail: "Operator 02 did not acknowledge the channel congestion alert.",
  },
  {
    id: "a-03",
    t: 900,
    kind: "autonomy-flag",
    source: "autonomy",
    operatorId: "op-01",
    response: "acted",
    title: "Autonomy flagged an unusual vessel track",
    detail: "Operator 01 confirmed the flag and acted within 25 seconds.",
  },
  {
    id: "a-04",
    t: 1350,
    kind: "handoff",
    source: "operator",
    operatorId: "op-04",
    title: "Track monitoring handed to autonomy",
    detail: "Operator 04 handed vessel track monitoring to the autonomous system.",
  },
];

/** Exercise 24-B: In Progress at load, the live edge starts at 18:00. */
export const currentSpec: RunSpec = {
  ...common,
  id: "ex-24-b",
  number: "24-B",
  seed: 2402,
  initialEdgeSec: 1080,
  baseline: { "op-01": 84, "op-02": 80, "op-03": 79, "op-04": 78 },
  priorReadiness: 74,
  events: currentEvents,
};
export const currentRun = generateRun(currentSpec);

/** Exercise 24-A: a completed earlier run of the same scenario, for AAR and comparison. */
export const priorRun = generateRun({
  ...common,
  id: "ex-24-a",
  number: "24-A",
  seed: 2401,
  initialEdgeSec: 1800,
  baseline: { "op-01": 80, "op-02": 76, "op-03": 74, "op-04": 79 },
  priorReadiness: 68,
  events: priorEvents,
});
