import { describe, expect, it } from "vitest";

import { isLessonStreamEnvelope } from "./schema";

const REQUEST_ID = "783c6081-75a4-4ed2-8be7-4e0f32680a2b";

function planEnvelope(plan: Record<string, unknown>) {
  return { type: "lesson.plan", request_id: REQUEST_ID, plan };
}

function basePlan(): Record<string, unknown> {
  return {
    kind: "lesson_plan",
    visual_structure: "One coherent visual argument",
    progression: ["introduce", "develop", "conclude"],
    checkpoint_step: 2,
  };
}

describe("lesson plan schema", () => {
  it("keeps plans without an archetype backward compatible", () => {
    expect(isLessonStreamEnvelope(planEnvelope(basePlan()))).toBe(true);
  });

  it.each([
    "single_large_figure",
    "derivation_plus_diagram",
    "worked_example_column",
    "comparison_pair",
    "graph_with_summary",
  ])("accepts the closed composition archetype %s", (compositionArchetype) => {
    expect(isLessonStreamEnvelope(planEnvelope({
      ...basePlan(),
      composition_archetype: compositionArchetype,
    }))).toBe(true);
  });

  it("rejects arbitrary composition zones and rectangles", () => {
    expect(isLessonStreamEnvelope(planEnvelope({
      ...basePlan(),
      composition_archetype: "comparison_pair",
      composition_zones: [{ bounds: [0, 0, 0.5, 1] }],
    }))).toBe(false);
    expect(isLessonStreamEnvelope(planEnvelope({
      ...basePlan(),
      composition_archetype: { name: "comparison_pair", bounds: [0, 0, 1, 1] },
    }))).toBe(false);
  });
});
