import { describe, expect, it } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { decodeLesson } from "./decode";
import { estimateNarrationDuration, opProgress, opWeight } from "./animation";

const lesson = decodeLesson(projectileLesson).lesson!;

describe("fixed weighted animation", () => {
  it("gives sketches more time while preserving cumulative completion", () => {
    const ops = lesson.steps[0].ops;
    expect(opWeight(ops[1])).toBe(3);
    expect(opProgress(ops, 0, 0.25)).toBe(1);
    expect(opProgress(ops, 1, 0.5)).toBeCloseTo(1 / 3);
  });

  it("keeps estimated narration inside configured bounds", () => {
    expect(estimateNarrationDuration("short script")).toBe(3_000);
    expect(estimateNarrationDuration(Array.from({ length: 30 }, () => "word").join(" "))).toBe(12_000);
  });
});
