import { describe, expect, it } from "vitest";
import { currentRun } from "../data/runs";
import { activeAlertsAt, alertCountAt, momentAt, pickAttention, statusFor, type OperatorMoment } from "./metrics";

describe("metrics", () => {
  // Protects against: an operator flagged at the wrong score
  it("derives status from score thresholds", () => {
    expect(statusFor(80)).toBe("nominal");
    expect(statusFor(71.9)).toBe("attention");
    expect(statusFor(59.9)).toBe("critical");
  });

  // Protects against: jumping to an alert showing the count from just before it
  it("counts alerts exactly at the event time, so jumping to an event includes it", () => {
    expect(alertCountAt(currentRun, 539)).toBe(0);
    expect(alertCountAt(currentRun, 540)).toBe(1);
  });

  // Protects against: alerts counting flags the human did act on, or missing the ones they didn't
  it("counts unactioned autonomy flags but not acted ones", () => {
    const before = alertCountAt(currentRun, 739);
    expect(alertCountAt(currentRun, 740)).toBe(before + 1); // b-04, not acted
    const beforeActed = alertCountAt(currentRun, 1199);
    expect(alertCountAt(currentRun, 1200)).toBe(beforeActed); // b-07, acted
  });

  // Protects against: the Exercise Score disagreeing with its own on-screen definition
  it("exercise score is the mean of operator scores", () => {
    const m = momentAt(currentRun, 600);
    const mean = m.operators.reduce((s, o) => s + o.score, 0) / m.operators.length;
    expect(m.exerciseScore).toBeCloseTo(mean, 5);
  });

  // Protects against: the demo losing its Attention row at load
  it("flags Operator 03 for attention at the live edge, with a named area to work on", () => {
    const op = momentAt(currentRun, currentRun.initialEdgeSec).operators.find((o) => o.id === "op-03")!;
    expect(op.status).not.toBe("nominal");
    expect(op.attentionArea).toBeTruthy();
    expect(op.attentionArea).not.toBe(op.strength);
  });

  // Protects against: an alert staying "active" long after it happened, or not counting at the moment it happens
  it("counts an alert as active for 90 seconds after it happens, and not before or after", () => {
    expect(activeAlertsAt(currentRun, 539)).toBe(0); // alert at 9:00
    expect(activeAlertsAt(currentRun, 540)).toBe(1);
    expect(activeAlertsAt(currentRun, 629)).toBe(1);
    expect(activeAlertsAt(currentRun, 630)).toBe(0); // 90 s later it is history
  });

  // Protects against: the attention banner naming the wrong people, in the wrong order, or too many to fit on one line
  it("picks who needs attention, worst first, and counts the rest", () => {
    const op = (id: string, score: number, status: OperatorMoment["status"]): OperatorMoment => ({
      id,
      name: id,
      role: "",
      score,
      status,
      strength: "",
      attentionArea: "",
    });
    const all = [
      op("a", 85, "nominal"),
      op("b", 70, "attention"),
      op("c", 55, "critical"),
      op("d", 68, "attention"),
      op("e", 71, "attention"),
    ];
    const { shown, more } = pickAttention(all);
    expect(shown.map((o) => o.id)).toEqual(["c", "d"]); // lowest scores first
    expect(more).toBe(2);
    expect(pickAttention([op("a", 90, "nominal")])).toEqual({ shown: [], more: 0 });
  });
});
