import { describe, expect, it } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { decodeLesson } from "./decode";
import { BOARD_HEIGHT, BOARD_WIDTH, layoutSteps, regionBox } from "./layout";

const lesson = decodeLesson(projectileLesson).lesson!;

describe("normalized board layout", () => {
  it("maps the named grid and broad regions inside the logical board", () => {
    expect(regionBox("A1")).toMatchObject({ x: 48, y: 48 });
    expect(regionBox("D3").x + regionBox("D3").width).toBe(BOARD_WIDTH - 48);
    expect(regionBox("D3").y + regionBox("D3").height).toBe(BOARD_HEIGHT - 48);
    expect(regionBox("left").width).toBe(regionBox("right").width);
    expect(regionBox("full")).toEqual({ x: 48, y: 48, width: 1504, height: 804 });
  });

  it("resolves anchors from accepted element boxes deterministically", () => {
    const first = layoutSteps(lesson.steps);
    const second = layoutSteps(lesson.steps);
    expect(second).toEqual(first);
    const equation = first.find(({ op }) => op.id === "formula")!;
    const anchored = first.find(({ op }) => op.id === "doubleangle")!;
    expect(anchored.box.y).toBeGreaterThanOrEqual(equation.box.y + equation.box.height);
    expect(anchored.box.x).toBeGreaterThanOrEqual(48);
    expect(anchored.box.x + anchored.box.width).toBeLessThanOrEqual(BOARD_WIDTH - 48);
  });

  it("keeps repeated region content bounded and non-overlapping", () => {
    const dense = decodeLesson({
      schema_version: "1.0",
      title: "Dense",
      steps: [0, 1].map((step) => ({
        id: `s${step + 1}`,
        script: "Place four short labels safely.",
        ops: [0, 1, 2, 3].map((op) => ({
          op: "text",
          id: `t${step}${op}`,
          region: "A1",
          content: `Label ${step}-${op}`,
        })),
        checkpoint: null,
      })),
    }).lesson!;
    const boxes = layoutSteps(dense.steps).map((item) => item.box);
    const region = regionBox("A1");
    boxes.forEach((box) => {
      expect(box.y).toBeGreaterThanOrEqual(region.y);
      expect(box.y + box.height).toBeLessThanOrEqual(region.y + region.height);
    });
    for (let index = 1; index < boxes.length; index += 1) {
      expect(boxes[index].y).toBeGreaterThanOrEqual(boxes[index - 1].y + boxes[index - 1].height);
    }
  });
});
