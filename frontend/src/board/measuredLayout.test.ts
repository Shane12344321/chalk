import { describe, expect, it } from "vitest";
import { lintMeasuredBoardMarks } from "./measuredLayout";

const boundary = { x: 0, y: 0, width: 500, height: 400 };

describe("render-measured layout findings", () => {
  it("groups actual label boxes and reports ink overlap", () => {
    const issues = lintMeasuredBoardMarks([
      {
        elementId: "ray",
        role: "label",
        box: { x: 100, y: 100, width: 90, height: 30 },
        boundary,
        autoPlace: true,
      },
      {
        elementId: "normal",
        role: "label",
        box: { x: 160, y: 100, width: 90, height: 30 },
        boundary,
      },
      {
        elementId: "ray",
        role: "ink",
        box: { x: 120, y: 110, width: 100, height: 8 },
        boundary,
      },
    ]);
    expect(issues).toContainEqual({
      code: "label_overlap",
      elementIds: ["normal", "ray"],
    });
    expect(issues).toContainEqual({
      code: "label_ink_overlap",
      elementIds: ["ray"],
    });
  });

  it("uses the renderer boundary rather than the whole application", () => {
    expect(lintMeasuredBoardMarks([{
      elementId: "outside",
      role: "label",
      box: { x: 480, y: 100, width: 40, height: 20 },
      boundary,
    }])).toContainEqual({
      code: "label_out_of_bounds",
      elementIds: ["outside"],
    });
  });
});
