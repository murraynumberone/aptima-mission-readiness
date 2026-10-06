export type SkillArea = "communication" | "coordination" | "awareness" | "response";

export interface Operator {
  id: string;
  name: string;
  role: string;
}

export type EventKind = "milestone" | "handoff" | "missed-alert" | "autonomy-flag";

export interface ExerciseEvent {
  id: string;
  /** Seconds from exercise start. */
  t: number;
  kind: EventKind;
  source: "operator" | "autonomy" | "exercise";
  /** The operator involved or expected to respond. */
  operatorId?: string;
  title: string;
  detail: string;
  /** Autonomy flags only: whether the human acted. */
  response?: "acted" | "not-acted";
}

export interface TeamSample {
  readiness: number;
  exerciseScore: number;
}

export type OperatorSample = Record<SkillArea, number>;

export interface Run {
  id: string;
  /** e.g. "24-B" */
  number: string;
  name: string;
  scenario: string;
  team: { name: string; operators: Operator[] };
  durationSec: number;
  sampleIntervalSec: number;
  /** Seconds of data available at load. Equal to durationSec for a completed run. */
  initialEdgeSec: number;
  events: ExerciseEvent[];
  /** One entry per sample interval, index 0 at t=0. */
  teamSamples: TeamSample[];
  operatorSamples: Record<string, OperatorSample[]>;
}

export interface Annotation {
  id: string;
  runId: string;
  /** Seconds from exercise start. */
  t: number;
  text: string;
  /** Set when the note is attached to an event, absent for a plain moment note. */
  eventId?: string;
  createdAt: string;
  updatedAt: string;
}
