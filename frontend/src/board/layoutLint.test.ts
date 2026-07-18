import { describe, expect, it } from "vitest";
import type { BoardGeometry } from "./geometry";
import { lintBoardGeometry } from "./layoutLint";

describe("deterministic board geometry lints", () => {
  it("reports colliding primitive labels with closed evidence", () => {
    const issues = lintBoardGeometry([
      geometry("ray1", [{ text: "incident", x: 300, y: 300, anchor: "middle" }]),
      geometry("normal", [{ text: "normal", x: 310, y: 302, anchor: "middle" }]),
    ]);
    expect(issues).toContainEqual({
      code: "label_overlap",
      elementIds: ["ray1", "normal"],
    });
  });

  it("reports a diagram label that escapes its shared canvas", () => {
    const item = geometry("ray1", [{ text: "outside", x: 90, y: 90 }]);
    item.canvasBox = { x: 100, y: 100, width: 400, height: 300 };
    expect(lintBoardGeometry([item])).toContainEqual({
      code: "label_out_of_bounds",
      elementIds: ["ray1"],
    });
  });

  it("reports text that cannot fit at the minimum board font size", () => {
    const item = geometry("text1", []);
    item.kind = "text";
    item.text = "oneunbreakablewordthatcannotfitinsideaverysmallbox";
    item.box = { x: 0, y: 0, width: 80, height: 20 };
    expect(lintBoardGeometry([item])).toContainEqual({
      code: "text_overflow",
      elementIds: ["text1"],
    });
  });
});

function geometry(
  id: string,
  labels: BoardGeometry["labels"],
): BoardGeometry {
  return {
    id,
    kind: "line",
    box: { x: 100, y: 100, width: 400, height: 300 },
    canvasBox: { x: 100, y: 100, width: 400, height: 300 },
    paths: [],
    labels,
    manifestSummary: "test geometry",
    stepIndex: 0,
    opIndex: 0,
  };
}
