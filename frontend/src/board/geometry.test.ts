import { describe, expect, it } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { decodeLesson } from "./decode";
import { BoardGeometryStore, stableSeed } from "./geometry";
import { layoutSteps } from "./layout";
import { physicsDiagramLesson } from "./physicsTestFixture";

const lesson = decodeLesson(projectileLesson).lesson!;
const laidOut = layoutSteps(lesson.steps);

describe("seeded rough geometry", () => {
  it("derives stable non-zero seeds from element IDs", () => {
    expect(stableSeed("rangecurve")).toBe(stableSeed("rangecurve"));
    expect(stableSeed("rangecurve")).not.toBe(stableSeed("cannon"));
    expect(stableSeed("rangecurve")).toBeGreaterThan(0);
  });

  it("returns the same cached geometry objects on rerender", () => {
    const store = new BoardGeometryStore();
    const first = store.build(laidOut);
    const second = store.build(laidOut.map((item) => ({ ...item, box: { ...item.box } })));
    expect(first.warnings).toEqual([]);
    expect(second.warnings).toEqual([]);
    expect(second.geometries).toHaveLength(first.geometries.length);
    first.geometries.forEach((geometry, index) => {
      expect(second.geometries[index]).toBe(geometry);
    });
  });

  it("produces identical rough paths in independent stores", () => {
    const first = new BoardGeometryStore().build(laidOut);
    const second = new BoardGeometryStore().build(laidOut);
    expect(second.geometries.map((item) => item.paths)).toEqual(
      first.geometries.map((item) => item.paths),
    );
  });

  it("renders dashed constructions, arrowheads, points, and angle marks", () => {
    const physics = decodeLesson(physicsDiagramLesson()).lesson!;
    const result = new BoardGeometryStore().build(layoutSteps(physics.steps));
    expect(result.warnings).toEqual([]);
    const normal = result.geometries.find(({ id }) => id === "normal")!;
    const incident = result.geometries.find(({ id }) => id === "incident")!;
    const hit = result.geometries.find(({ id }) => id === "hit")!;
    const theta = result.geometries.find(({ id }) => id === "theta")!;
    expect(normal.paths.length).toBeGreaterThan(4);
    expect(new Set(normal.paths.map((path) => path.revealGroup)).size).toBeGreaterThan(2);
    expect(incident.paths.length).toBeGreaterThan(2);
    expect(hit.paths.length).toBeGreaterThan(0);
    expect(theta.paths.length).toBeGreaterThan(0);
    expect(theta.labels[0].text).toBe("theta");
  });
});
