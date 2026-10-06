import type { SkillArea } from "./types";

export const metricDefinitions = {
  readiness: {
    label: "Readiness",
    definition: "Share of training criteria the team has met over time, across this and earlier exercises.",
  },
  exerciseScore: {
    label: "Exercise Score",
    definition: "Average operator score for this exercise only, from start to the selected moment.",
  },
  alerts: {
    label: "Alerts",
    definition: "Missed alerts and autonomy flags nobody acted on, counted up to the selected moment.",
  },
} as const;

export const skillAreaLabels: Record<SkillArea, string> = {
  communication: "Communication",
  coordination: "Coordination",
  awareness: "Situational awareness",
  response: "Response time",
};

export const skillAreas = Object.keys(skillAreaLabels) as SkillArea[];
