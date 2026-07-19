import { describe, expect, it } from "vitest";
import type { LessonOp } from "./lesson.generated";
import { decodeLesson } from "./decode";
import {
  analyzeBoardOccupancy,
  boundedPlacementCandidates,
  findReadingOrderConflicts,
  layoutHardFindingVector,
  layoutSteps,
  type LaidOutOp,
  type LayoutBox,
} from "./layout";

describe("bounded board occupancy", () => {
  it("deduplicates non-curve elements and uses ink bounds rather than diagram canvases", () => {
    const small = item(
      { op: "line", id: "ray", region: "right", from: [0.1, 0.5], to: [0.9, 0.5], stroke: "solid" },
      { x: 900, y: 430, width: 260, height: 28 },
      { x: 800, y: 100, width: 700, height: 700 },
    );
    const duplicate = { ...small, box: { ...small.box } };
    const curve = item(
      { op: "curve", id: "plot", axes_id: "axes", expr: "x" },
      { x: 0, y: 0, width: 1600, height: 900 },
    );
    const analysis = analyzeBoardOccupancy([small, duplicate, curve]);

    expect(analysis.elementCount).toBe(1);
    expect(analysis.occupancyRatio).toBeLessThan(0.03);
    expect(analysis.components).toHaveLength(1);
    expect(analysis.emptyRectangles.length).toBeGreaterThan(0);
    expect(analysis.emptyRectangles.length).toBeLessThanOrEqual(8);
  });

  it("keeps sparse and imbalance findings dormant without explicit expectations", () => {
    const left = item(
      { op: "text", id: "leftnote", region: "left", content: "A substantial note" },
      { x: 48, y: 48, width: 690, height: 700 },
    );
    expect(analyzeBoardOccupancy([left]).findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "region_sparse" }),
        expect.objectContaining({ code: "board_imbalanced" }),
      ]),
    );

    const contextual = analyzeBoardOccupancy([left], {
      expectedZones: ["right"],
      balance: "horizontal",
    });
    expect(contextual.findings).toContainEqual({
      code: "region_sparse",
      elementIds: [],
      zone: "right",
    });
    expect(contextual.findings).toContainEqual(expect.objectContaining({
      code: "board_imbalanced",
      zone: "left",
    }));
  });

  it("reports crowding only when multiple independent roots densely share a zone", () => {
    const first = item(
      { op: "text", id: "first", region: "A1", content: "First" },
      { x: 48, y: 48, width: 180, height: 240 },
    );
    const second = item(
      { op: "text", id: "second", region: "A1", content: "Second" },
      { x: 220, y: 48, width: 185, height: 240 },
    );
    expect(analyzeBoardOccupancy([first, second]).findings).toContainEqual(
      expect.objectContaining({ code: "region_crowded", zone: "A1" }),
    );

    const related = {
      ...second,
      op: {
        op: "text" as const,
        id: "second",
        anchor: { el: "first", side: "right" as const },
        content: "Second",
      },
    };
    expect(analyzeBoardOccupancy([first, related]).findings).not.toContainEqual(
      expect.objectContaining({ code: "region_crowded" }),
    );
  });
});

describe("bounded deterministic candidate surface", () => {
  it("returns at most three candidates with a stable ID-derived tie break", () => {
    const preferred = { x: 100, y: 100, width: 100, height: 60 };
    const probes = [
      { ...preferred, x: 50 },
      { ...preferred, x: 150 },
      { ...preferred, y: 50 },
      { ...preferred, y: 150 },
      { ...preferred, x: 150, y: 150 },
    ];
    const first = boundedPlacementCandidates(preferred, probes, "label");
    const second = boundedPlacementCandidates(preferred, [...probes].reverse(), "label");
    expect(first.candidates).toHaveLength(3);
    expect(second).toEqual(first);
    expect(first.candidates[0]).toEqual(preferred);
  });

  it("uses composition density only for a strict soft improvement with no hard regression", () => {
    const lesson = decodeLesson({
      schema_version: "1.0",
      title: "Balanced comparison",
      steps: [
        axesStep("s1", "leftaxes"),
        axesStep("s2", "rightaxes"),
      ],
    }).lesson!;
    const occupancyExpectations = {
      expectedZones: ["left", "right"] as const,
      balance: "horizontal" as const,
    };
    const preferred = layoutSteps(lesson.steps, {
      occupancyExpectations,
      candidatePlacement: "preferred-only",
    });
    const resolved = layoutSteps(lesson.steps, { occupancyExpectations });
    const preferredHard = layoutHardFindingVector(preferred, lesson.steps);
    const resolvedHard = layoutHardFindingVector(resolved, lesson.steps);

    resolvedHard.forEach((value, index) => expect(value).toBeLessThanOrEqual(preferredHard[index]));
    expect(analyzeBoardOccupancy(preferred, occupancyExpectations).zones.right.rootIds)
      .not.toContain("rightaxes");
    expect(analyzeBoardOccupancy(resolved, occupancyExpectations).zones.left.rootIds)
      .toHaveLength(1);
    expect(analyzeBoardOccupancy(resolved, occupancyExpectations).zones.right.rootIds)
      .toHaveLength(1);
    expect(analyzeBoardOccupancy(resolved, occupancyExpectations).findings.length)
      .toBeLessThan(analyzeBoardOccupancy(preferred, occupancyExpectations).findings.length);

    const prefix = layoutSteps(lesson.steps.slice(0, 1), { occupancyExpectations });
    expect(resolved.slice(0, prefix.length)).toEqual(prefix);
  });
});

describe("explicit-reference reading order", () => {
  const geometry = item(
    { op: "line", id: "ray", region: "right", from: [0, 0], to: [1, 1], stroke: "solid" },
    { x: 600, y: 350, width: 300, height: 180 },
  );

  it("finds a temporal/spatial inversion for an anchored explanation", () => {
    const explanation = item(
      { op: "text", id: "note", anchor: { el: "ray", side: "above" }, content: "Explanation" },
      { x: 600, y: 180, width: 300, height: 70 },
      undefined,
      0,
      1,
    );
    expect(findReadingOrderConflicts([geometry, explanation], [{
      id: "s1", script: "Explain the diagram.", ops: [geometry.op, explanation.op], checkpoint: null,
    }])).toEqual([{
      code: "reading_order_conflict",
      elementIds: ["note", "ray"],
    }]);
  });

  it("does not infer references from content or flag movement inside tolerance", () => {
    const unreferenced = item(
      { op: "text", id: "note", region: "A1", content: "This describes ray" },
      { x: 600, y: 180, width: 300, height: 70 },
      undefined,
      0,
      1,
    );
    const close = item(
      { op: "equation", id: "eq", anchor: { el: "ray", side: "left" }, latex: "x=1" },
      { x: 576, y: 350, width: 300, height: 180 },
      undefined,
      0,
      1,
    );
    const step = { id: "s1", script: "Explain the diagram.", ops: [geometry.op, unreferenced.op], checkpoint: null };
    expect(findReadingOrderConflicts([geometry, unreferenced], [step])).toEqual([]);
    expect(findReadingOrderConflicts([geometry, close], [{ ...step, ops: [geometry.op, close.op] }])).toEqual([]);
  });

  it("recognizes only an explicit current-step place relation", () => {
    const explanation = item(
      { op: "text", id: "note", region: "A1", content: "Explanation" },
      { x: 200, y: 350, width: 260, height: 100 },
      undefined,
      0,
      1,
    );
    const step = {
      id: "s1",
      script: "Explain the diagram.",
      ops: [geometry.op, explanation.op],
      layout: [{
        kind: "place" as const, id: "note", relative_to: "ray",
        side: "left" as const, align: "center" as const, gap: 0.02,
      }],
      checkpoint: null,
    };
    expect(findReadingOrderConflicts([geometry, explanation], [step])).toEqual([{
      code: "reading_order_conflict",
      elementIds: ["note", "ray"],
    }]);
  });
});

function item(
  op: LessonOp,
  box: LayoutBox,
  canvasBox?: LayoutBox,
  stepIndex = 0,
  opIndex = 0,
): LaidOutOp {
  return { op, box, ...(canvasBox ? { canvasBox } : {}), stepIndex, opIndex };
}

function axesStep(stepId: string, axesId: string) {
  return {
    id: stepId,
    script: "Add one side of the comparison.",
    ops: [{
      op: "axes" as const,
      id: axesId,
      region: "left" as const,
      x: { min: 0, max: 10, label: "x" },
      y: { min: 0, max: 10, label: "y" },
    }],
    checkpoint: null,
  };
}
