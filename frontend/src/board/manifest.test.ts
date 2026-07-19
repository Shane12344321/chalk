import { describe, expect, it } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { decodeLesson } from "./decode";
import { BoardGeometryStore } from "./geometry";
import { layoutSteps } from "./layout";
import { compositeDiagramLesson } from "./physicsTestFixture";
import { revealGroupProgress } from "./reveal";
import {
  BOARD_MANIFEST_MAX_CHARS,
  buildBoardManifest,
  buildVisibleBoardSnapshot,
  toAnnotationVisibleElements,
} from "./manifest";

const lesson = decodeLesson(projectileLesson).lesson!;
const geometry = new BoardGeometryStore().build(layoutSteps(lesson.steps)).geometries;

describe("visible board manifest", () => {
  it("includes only geometry that has fully committed", () => {
    const manifest = buildBoardManifest(
      lesson.title,
      geometry.map((item) => ({
        geometry: item,
        progress: item.id === "title" ? 1 : item.id === "cannon" ? 0.75 : 0,
      })),
    );
    expect(manifest).toContain("title");
    expect(manifest).not.toContain("cannon");
    expect(manifest).not.toContain("rangecurve");
  });

  it("derives useful curve grounding and stays bounded", () => {
    const manifest = buildBoardManifest(
      lesson.title,
      geometry.map((item) => ({ geometry: item, progress: 1 })),
    );
    expect(manifest).toContain("rangecurve");
    expect(manifest).toContain("x=45");
    expect(manifest.length).toBeLessThanOrEqual(BOARD_MANIFEST_MAX_CHARS);
  });

  it("uses the same committed geometry for manifest text and target boxes", () => {
    const snapshot = buildVisibleBoardSnapshot(
      lesson.title,
      geometry.map((item) => ({
        geometry: item,
        progress: item.id === "title" ? 1 : item.id === "cannon" ? 0.99 : 0,
      })),
    );
    expect(snapshot.elements.map((item) => item.id)).toEqual(["title"]);
    expect(snapshot.manifest).toContain("title");
    expect(snapshot.manifest).not.toContain("cannon");
    expect(snapshot.fingerprint).toContain("title");
  });

  it("normalizes exact committed boxes for annotation without changing manifest text", () => {
    const snapshot = buildVisibleBoardSnapshot(
      lesson.title,
      geometry.map((item) => ({ geometry: item, progress: 1 })),
    );
    const visible = toAnnotationVisibleElements(snapshot.elements);
    expect(visible).toHaveLength(snapshot.elements.length);
    expect(visible[0]).toMatchObject({ id: snapshot.elements[0].id, kind: snapshot.elements[0].kind });
    for (const element of visible) {
      const [x, y, width, height] = element.bounds;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(x + width).toBeLessThanOrEqual(1.001);
      expect(y + height).toBeLessThanOrEqual(1.001);
      expect(element.bounds.every((value) => String(value).split(".")[1]?.length <= 3 || Number.isInteger(value))).toBe(true);
    }
    expect(snapshot.manifest).not.toContain("bounds");
  });

  it("publishes completed diagram subparts without exposing future or partial ink", () => {
    const composite = decodeLesson(compositeDiagramLesson()).lesson!;
    const compositeGeometry = new BoardGeometryStore().build(
      layoutSteps(composite.steps),
    ).geometries[0];
    const afterFirstGroup = Array.from({ length: 1_001 }, (_, index) => index / 1_000)
      .find((progress) =>
        revealGroupProgress(compositeGeometry.paths, 0, progress) >= 0.999 &&
        revealGroupProgress(compositeGeometry.paths, 1, progress) < 0.999,
      );
    expect(afterFirstGroup).toBeDefined();
    const partial = buildVisibleBoardSnapshot(composite.title, [
      { geometry: compositeGeometry, progress: afterFirstGroup! },
    ]);
    expect(partial.manifest).toContain("support");
    expect(partial.manifest).not.toContain("mass");
    expect(partial.elements).toHaveLength(1);
    expect(partial.elements[0].id).toMatch(/^[a-z][a-z0-9_-]{0,15}$/);

    const complete = buildVisibleBoardSnapshot(composite.title, [
      { geometry: compositeGeometry, progress: 1 },
    ]);
    expect(complete.manifest).toContain("support");
    expect(complete.manifest).toContain("cord");
    expect(complete.manifest).toContain("mass");
    expect(complete.manifest).toContain("lower-right");
    expect(complete.elements).toHaveLength(5);
  });
});
