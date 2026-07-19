import { describe, expect, it } from "vitest";
import type { NormalizedStep } from "./decode";
import { PrecommitMeasurementCache } from "./precommitMeasurement";
import { measurableRootsForSteps, premeasureLessonRoots } from "./premeasureLesson";

const STEP: NormalizedStep = {
  id: "s1",
  script: "Compare these forms.",
  ops: [
    { op: "text", id: "t1", region: "A1", content: "Slope" },
    { op: "equation", id: "eq1", anchor: { el: "t1", side: "below" }, latex: "m=\\frac{dy}{dx}" },
    { op: "line", id: "l1", region: "right", from: [0.1, 0.8], to: [0.9, 0.2], stroke: "solid" },
  ],
  checkpoint: null,
};

describe("lesson premeasurement", () => {
  it("extracts only root text and equations with bounded final widths", () => {
    expect(measurableRootsForSteps([STEP])).toEqual([
      { id: "t1", kind: "text", content: "Slope", maxWidth: expect.any(Number) },
      { id: "eq1", kind: "equation", content: "m=\\frac{dy}{dx}", maxWidth: 700 },
    ]);
    expect(measurableRootsForSteps([STEP])[0].maxWidth).toBeLessThan(400);
  });

  it("warms the injected cache before commitment", () => {
    const cache = new PrecommitMeasurementCache({
      now: () => 0,
      handwritingFontReady: () => true,
      measureHandwriting: () => ({ width: 210, height: 64 }),
      measureEquation: () => ({ width: 330, height: 88 }),
    });
    const batch = premeasureLessonRoots(cache, [STEP]);

    expect(batch.unavailableIds).toEqual([]);
    expect(batch.measurements.get("t1")?.evidence).toBe("measured");
    expect(batch.measurements.get("eq1")?.width).toBe(330);
  });
});
