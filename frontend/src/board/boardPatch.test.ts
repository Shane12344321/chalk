import { describe, expect, it } from "vitest";
import type { BoardGeometry } from "./geometry";
import { applyBoardPatch, createBoardPatch, reverseBoardPatch } from "./boardPatch";

describe("renderer-neutral board patches", () => {
  it("records exact additions, changes and removals and reverses them", () => {
    const before = [geometry("keep", 10), geometry("change", 20), geometry("remove", 30)];
    const after = [geometry("keep", 10), geometry("change", 24), geometry("add", 40)];
    const patch = createBoardPatch("req-1", "s2", before, after);

    expect(patch.added.map(({ id }) => id)).toEqual(["add"]);
    expect(patch.removed.map(({ id }) => id)).toEqual(["remove"]);
    expect(patch.updated.map(({ before, after }) => [before.id, before.box.x, after.box.x]))
      .toEqual([["change", 20, 24]]);
    expect(applyBoardPatch(before, patch)).toEqual(after);
    expect(applyBoardPatch(after, reverseBoardPatch(patch))).toEqual(before);
  });

  it("does not duplicate an already present addition", () => {
    const item = geometry("same", 10);
    const patch = createBoardPatch("req-2", "s1", [], [item]);
    expect(applyBoardPatch([item], patch)).toEqual([item]);
  });
});

function geometry(id: string, x: number): BoardGeometry {
  return {
    id,
    kind: "line",
    box: { x, y: 10, width: 20, height: 20 },
    paths: [],
    labels: [],
    manifestSummary: id,
    stepIndex: 0,
    opIndex: 0,
  };
}
