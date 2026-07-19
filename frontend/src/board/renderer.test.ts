import { describe, expect, it } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { decodeLesson } from "./decode";
import { RoughSvgBoardRenderer } from "./renderer";

const lesson = decodeLesson(projectileLesson).lesson!;

describe("rough SVG renderer boundary", () => {
  it("preserves prepared geometry and manifest truth", () => {
    const renderer = new RoughSvgBoardRenderer();
    const prepared = renderer.prepareLesson(lesson);
    const hidden = renderer.visibleSnapshot(prepared, 0, 0);
    const complete = renderer.visibleSnapshot(
      prepared,
      lesson.steps.length - 1,
      1,
    );

    expect(renderer.kind).toBe("rough-svg");
    expect(prepared.build.warnings).toEqual([]);
    expect(hidden.elements).toEqual([]);
    expect(complete.elements.length).toBeGreaterThan(0);
    expect(complete.manifest).toContain(lesson.title);
  });

  it("keeps partial progress stable across repeated preparation", () => {
    const renderer = new RoughSvgBoardRenderer();
    const first = renderer.prepareLesson(lesson);
    const second = renderer.prepareLesson(lesson);
    expect(second.build.geometries).toEqual(first.build.geometries);
    expect(
      renderer.geometryProgress(first, first.build.geometries[0], 0, 0.5),
    ).toBe(
      renderer.geometryProgress(second, second.build.geometries[0], 0, 0.5),
    );
  });
});
