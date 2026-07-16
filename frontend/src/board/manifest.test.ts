import { describe, expect, it } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { decodeLesson } from "./decode";
import { BoardGeometryStore } from "./geometry";
import { layoutSteps } from "./layout";
import { BOARD_MANIFEST_MAX_CHARS, buildBoardManifest } from "./manifest";

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
});
