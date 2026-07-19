import { describe, expect, it } from "vitest";
import { decodeLesson } from "./decode";
import { PrecommitMeasurementCache } from "./precommitMeasurement";
import { premeasureLessonRoots } from "./premeasureLesson";
import { RoughSvgBoardRenderer } from "./renderer";

function lesson() {
  return decodeLesson({
    schema_version: "1.0",
    title: "Measured placement",
    steps: [
      {
        id: "s1",
        script: "Start with the claim.",
        ops: [{ op: "text", id: "t1", region: "left", content: "A measured explanation" }],
        checkpoint: null,
      },
      {
        id: "s2",
        script: "Place the equation below it.",
        ops: [{
          op: "equation",
          id: "eq1",
          anchor: { el: "t1", side: "below", gap: 0.05 },
          latex: "f'(x)=2x",
        }],
        checkpoint: null,
      },
    ],
  }).lesson!;
}

describe("measured-first renderer placement", () => {
  it("uses precommitted production measurements as resolver dimensions", () => {
    const cache = new PrecommitMeasurementCache({
      now: () => 0,
      handwritingFontReady: () => true,
      measureHandwriting: () => ({ width: 520, height: 96 }),
      measureEquation: () => ({ width: 410, height: 82 }),
    });
    const source = lesson();
    premeasureLessonRoots(cache, source.steps);
    const prepared = new RoughSvgBoardRenderer(cache).prepareLesson(source);

    expect(prepared.build.geometries.find(({ id }) => id === "t1")?.box)
      .toMatchObject({ width: 520, height: 96 });
    expect(prepared.build.geometries.find(({ id }) => id === "eq1")?.box)
      .toMatchObject({ width: 410, height: 82 });
    expect(prepared.layoutIssues.some(({ code }) => code === "measurement_unavailable"))
      .toBe(false);
  });

  it("falls back without a blank board and emits only a closed finding", () => {
    const cache = new PrecommitMeasurementCache({
      now: () => 0,
      handwritingFontReady: () => false,
      measureHandwriting: () => undefined,
      measureEquation: () => undefined,
    });
    const source = lesson();
    premeasureLessonRoots(cache, source.steps);
    const prepared = new RoughSvgBoardRenderer(cache).prepareLesson(source);

    expect(prepared.build.geometries.map(({ id }) => id)).toEqual(["t1", "eq1"]);
    expect(prepared.layoutIssues.filter(({ code }) => code === "measurement_unavailable"))
      .toEqual([
        { code: "measurement_unavailable", elementIds: ["eq1"] },
        { code: "measurement_unavailable", elementIds: ["t1"] },
      ]);
  });

  it("keeps the measured prefix bitwise stable as a later step arrives", () => {
    const cache = new PrecommitMeasurementCache({
      now: () => 0,
      handwritingFontReady: () => true,
      measureHandwriting: () => ({ width: 500, height: 90 }),
      measureEquation: () => ({ width: 380, height: 80 }),
    });
    const source = lesson();
    premeasureLessonRoots(cache, source.steps);
    const renderer = new RoughSvgBoardRenderer(cache);
    const prefix = renderer.prepareLesson({ ...source, steps: source.steps.slice(0, 1) });
    const full = renderer.prepareLesson(source);

    expect(full.build.geometries[0].box).toEqual(prefix.build.geometries[0].box);
  });
});
