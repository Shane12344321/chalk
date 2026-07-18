import { describe, expect, it } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { decodeLesson } from "./decode";
import {
  estimateNarrationDuration,
  opProgress,
  opWeight,
  pacedAnimationRate,
} from "./animation";
import { physicsDiagramLesson } from "./physicsTestFixture";

const lesson = decodeLesson(projectileLesson).lesson!;

describe("fixed weighted animation", () => {
  it("gives long strokes more time while preserving cumulative completion", () => {
    const ops = lesson.steps[0].ops;
    // Weights follow drawn content: the five-stroke cannon sketch saturates
    // the weight cap while its short title label stays near the base weight.
    expect(opWeight(ops[0])).toBeCloseTo(1.0);
    expect(opWeight(ops[1])).toBe(4);
    expect(opProgress(ops, 0, 0.25)).toBe(1);
    expect(opProgress(ops, 1, 0.5)).toBeCloseTo(0.375);
    expect(opProgress(ops, 1, 1)).toBe(1);
  });

  it("keeps estimated narration inside configured bounds", () => {
    expect(estimateNarrationDuration("short script")).toBe(3_000);
    expect(estimateNarrationDuration(Array.from({ length: 30 }, () => "word").join(" "))).toBe(12_000);
  });

  it("uses transcript progress as a bounded pacing hint", () => {
    expect(pacedAnimationRate(0.6, 0.5)).toBeCloseTo(1.2);
    expect(pacedAnimationRate(1, 0)).toBe(3);
    expect(pacedAnimationRate(0, 1)).toBe(0.5);
  });

  it("budgets time for diagram ink and arrowheads", () => {
    const physics = decodeLesson(physicsDiagramLesson()).lesson!;
    const ops = physics.steps.flatMap((step) => step.ops);
    expect(opWeight(ops.find(({ id }) => id === "normal")!)).toBe(1.2);
    expect(opWeight(ops.find(({ id }) => id === "incident")!)).toBe(1.2);
    expect(opWeight(ops.find(({ id }) => id === "hit")!)).toBe(0.6);
  });
});
