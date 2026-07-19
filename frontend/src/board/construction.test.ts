import { describe, expect, it } from "vitest";
import { axesPlotBox } from "./axesGeometry";
import { decodeLesson } from "./decode";
import { layoutSteps, type LaidOutOp } from "./layout";
import { RoughSvgBoardRenderer } from "./renderer";

function baseCanvasOps() {
  return [
    {
      op: "diagram" as const,
      id: "canvas",
      region: "left" as const,
      primitives: [
        { kind: "text" as const, at: [0.5, 0.1] as [number, number], content: "shared construction" },
      ],
    },
    {
      op: "line" as const,
      id: "base",
      canvas_id: "canvas",
      from: [0.2, 0.5] as [number, number],
      to: [0.8, 0.5] as [number, number],
      stroke: "solid" as const,
    },
    {
      op: "point" as const,
      id: "center",
      canvas_id: "canvas",
      at: [0.5, 0.5] as [number, number],
    },
  ];
}

function decodeSteps(steps: unknown[]): ReturnType<typeof decodeLesson>["lesson"] {
  const decoded = decodeLesson({ schema_version: "1.4", title: "Constructions", steps });
  expect(decoded.warnings, JSON.stringify(decoded.warnings)).toEqual([]);
  expect(decoded.lesson).toBeDefined();
  return decoded.lesson;
}

function constructionItem(items: readonly LaidOutOp[], id: string): LaidOutOp {
  const item = items.find(({ op }) => op.id === id);
  expect(item, `missing ${id}`).toBeDefined();
  expect(item!.construction, `missing resolved construction ${id}`).toBeDefined();
  return item!;
}

describe("schema-1.4 universal geometric constructions", () => {
  it("constructs an exact midpoint and perpendicular in one shared renderer coordinate space", () => {
    const lesson = decodeSteps([
      { id: "s1", script: "Establish a baseline and its center point.", ops: baseCanvasOps(), checkpoint: null },
      {
        id: "s2",
        script: "The renderer constructs the exact perpendicular through that point.",
        ops: [
          {
            op: "point",
            id: "mid",
            construct: {
              kind: "midpoint_of",
              a: { kind: "endpoint", element_id: "base", endpoint: "start" },
              b: { kind: "endpoint", element_id: "base", endpoint: "end" },
            },
            label: "M",
          },
        ],
        checkpoint: null,
      },
      {
        id: "s3",
        script: "Now use that constructed midpoint without guessing coordinates.",
        ops: [
          {
            op: "line",
            id: "normal",
            construct: {
              kind: "perpendicular_through",
              line: "base",
              point: { kind: "point", element_id: "mid" },
              length: 0.4,
            },
            stroke: "dashed",
            label: "normal",
          },
        ],
        checkpoint: null,
      },
    ])!;
    const items = layoutSteps(lesson.steps);
    const base = items.find(({ op }) => op.id === "base")!;
    const midpoint = constructionItem(items, "mid").construction!;
    const normal = constructionItem(items, "normal").construction!;
    expect(midpoint.kind).toBe("point");
    expect(normal.kind).toBe("line");
    if (midpoint.kind !== "point" || normal.kind !== "line") return;
    expect(midpoint.point[0]).toBeCloseTo(base.canvasBox!.x + base.canvasBox!.width / 2, 8);
    expect(midpoint.point[1]).toBeCloseTo(base.canvasBox!.y + base.canvasBox!.height / 2, 8);
    expect(normal.from[0]).toBeCloseTo(midpoint.point[0], 8);
    expect(normal.to[0]).toBeCloseTo(midpoint.point[0], 8);
    expect(normal.from[1] + normal.to[1]).toBeCloseTo(midpoint.point[1] * 2, 8);
  });

  it("uses arc-length along a sampled curve and preserves exact t boundaries", () => {
    const lesson = decodeSteps([
      {
        id: "s1",
        script: "Plot a straight curve in data space.",
        ops: [
          { op: "axes", id: "axes", region: "right", x: { min: -1, max: 1, label: "x" }, y: { min: -1, max: 1, label: "y" } },
          { op: "curve", id: "curve", axes_id: "axes", expr: "x", domain: [-1, 1] },
        ],
        checkpoint: null,
      },
      {
        id: "s2",
        script: "Place exact points at the curve start, middle, and end.",
        ops: [
          { op: "point", id: "start", construct: { kind: "along", element_id: "curve", t: 0 } },
          { op: "point", id: "middle", construct: { kind: "along", element_id: "curve", t: 0.5 } },
          { op: "point", id: "end", construct: { kind: "along", element_id: "curve", t: 1 } },
        ],
        checkpoint: null,
      },
    ])!;
    const items = layoutSteps(lesson.steps);
    const axes = items.find(({ op }) => op.id === "axes")!;
    const start = constructionItem(items, "start").construction!;
    const middle = constructionItem(items, "middle").construction!;
    const end = constructionItem(items, "end").construction!;
    if (start.kind !== "point" || middle.kind !== "point" || end.kind !== "point") return;
    expect(start.canvas).toEqual(axesPlotBox(axes.box));
    expect(middle.point[0]).toBeCloseTo((start.point[0] + end.point[0]) / 2, 6);
    expect(middle.point[1]).toBeCloseTo((start.point[1] + end.point[1]) / 2, 6);
  });

  it("finds one bounded line intersection exactly", () => {
    const lesson = decodeSteps([
      {
        id: "s1",
        script: "Draw two diagonals on the same canvas.",
        ops: [
          ...baseCanvasOps().slice(0, 1),
          { op: "line", id: "diagone", canvas_id: "canvas", from: [0.2, 0.2], to: [0.8, 0.8], stroke: "solid" },
          { op: "line", id: "diagtwo", canvas_id: "canvas", from: [0.2, 0.8], to: [0.8, 0.2], stroke: "solid" },
        ],
        checkpoint: null,
      },
      {
        id: "s2",
        script: "Mark their renderer-computed intersection.",
        ops: [
          { op: "point", id: "crossing", construct: { kind: "intersection_of", a: "diagone", b: "diagtwo" }, label: "P" },
        ],
        checkpoint: null,
      },
    ])!;
    const items = layoutSteps(lesson.steps);
    const canvas = items.find(({ op }) => op.id === "canvas")!.canvasBox!;
    const crossing = constructionItem(items, "crossing").construction!;
    if (crossing.kind !== "point") return;
    expect(crossing.point[0]).toBeCloseTo(canvas.x + canvas.width / 2, 8);
    expect(crossing.point[1]).toBeCloseTo(canvas.y + canvas.height / 2, 8);
  });

  it("resolves a geometric offset and reports relation semantics", () => {
    const lesson = decodeSteps([
      { id: "s1", script: "Establish a line for a nearby callout.", ops: baseCanvasOps(), checkpoint: null },
      {
        id: "s2",
        script: "Place a callout point above the existing geometry.",
        ops: [
          { op: "point", id: "callout", construct: { kind: "offset_from", element_id: "base", side: "above", gap: 0.1 } },
        ],
        checkpoint: null,
      },
    ])!;
    const items = layoutSteps(lesson.steps);
    const callout = constructionItem(items, "callout").construction!;
    if (callout.kind !== "point") return;
    expect(callout.summary).toBe("above offset from base by 0.1");
    expect(callout.point[1]).toBeLessThan(items.find(({ op }) => op.id === "base")!.box.y);
  });

  it("publishes concise construction semantics from committed renderer truth", () => {
    const lesson = decodeSteps([
      { id: "s1", script: "Establish a baseline for an exact point.", ops: baseCanvasOps(), checkpoint: null },
      {
        id: "s2",
        script: "Mark the midpoint as renderer-owned geometry.",
        ops: [
          {
            op: "point",
            id: "mid",
            construct: {
              kind: "midpoint_of",
              a: { kind: "endpoint", element_id: "base", endpoint: "start" },
              b: { kind: "endpoint", element_id: "base", endpoint: "end" },
            },
            label: "M",
          },
        ],
        checkpoint: null,
      },
    ])!;
    const prepared = new RoughSvgBoardRenderer().prepareLesson(lesson);
    const geometry = prepared.build.geometries.find(({ id }) => id === "mid");
    expect(geometry?.manifestSummary).toBe("midpoint of start of base and end of base; label M");
    expect(prepared.build.warnings).toEqual([]);
  });

  it("keeps committed constructed geometry bitwise prefix-stable", () => {
    const lesson = decodeSteps([
      { id: "s1", script: "Establish a baseline and its center point.", ops: baseCanvasOps(), checkpoint: null },
      {
        id: "s2",
        script: "Construct a permanent exact normal.",
        ops: [
          { op: "line", id: "normal", construct: { kind: "perpendicular_through", line: "base", point: { kind: "point", element_id: "center" }, length: 0.4 }, stroke: "dashed" },
        ],
        checkpoint: null,
      },
      {
        id: "s3",
        script: "Append an unrelated explanation later.",
        ops: [{ op: "text", id: "later", region: "right", content: "later explanation" }],
        checkpoint: null,
      },
    ])!;
    const prefix = layoutSteps(lesson.steps.slice(0, 2));
    const complete = layoutSteps(lesson.steps);
    expect(complete.slice(0, prefix.length)).toEqual(prefix);
  });

  it("derives an interior tangent from the rendered curve and keeps it prefix-stable", () => {
    const lesson = decodeSteps([
      {
        id: "s1",
        script: "Plot a smooth curve before asking the renderer for a local tangent.",
        ops: [
          { op: "axes", id: "axes", region: "right", x: { min: -1, max: 1, label: "x" }, y: { min: -1, max: 1, label: "y" } },
          { op: "curve", id: "parabola", axes_id: "axes", expr: "x^2", domain: [-1, 1] },
        ],
        checkpoint: null,
      },
      {
        id: "s2",
        script: "At the vertex, the tangent is determined by the same sampled path that is visible.",
        ops: [{ op: "line", id: "tangent", construct: { kind: "tangent_at", curve: "parabola", x: 0, length: 0.3 }, stroke: "solid", label: "tangent" }],
        checkpoint: null,
      },
      {
        id: "s3",
        script: "A later explanation cannot reposition accepted geometry.",
        ops: [{ op: "text", id: "later", region: "left", content: "local slope" }],
        checkpoint: null,
      },
    ])!;
    const prefix = layoutSteps(lesson.steps.slice(0, 2));
    const complete = layoutSteps(lesson.steps);
    const tangent = constructionItem(prefix, "tangent").construction;
    expect(tangent).toMatchObject({ kind: "line", summary: "local tangent to parabola at x=0" });
    expect(complete.slice(0, prefix.length)).toEqual(prefix);
  });

  it("canonicalizes chained canvas IDs to their shared renderer coordinate space", () => {
    const lesson = decodeSteps([
      { id: "s1", script: "Establish a shared canvas and baseline.", ops: baseCanvasOps().slice(0, 2), checkpoint: null },
      {
        id: "s2",
        script: "Add another segment through the accepted canvas chain.",
        ops: [{ op: "line", id: "child", canvas_id: "base", from: [0.2, 0.2], to: [0.8, 0.2], stroke: "solid" }],
        checkpoint: null,
      },
      {
        id: "s3",
        script: "Use endpoints from both descendants without a false mismatch.",
        ops: [{
          op: "point",
          id: "sharedmid",
          construct: {
            kind: "midpoint_of",
            a: { kind: "endpoint", element_id: "base", endpoint: "start" },
            b: { kind: "endpoint", element_id: "child", endpoint: "start" },
          },
        }],
        checkpoint: null,
      },
    ])!;
    const warnings: string[] = [];
    const items = layoutSteps(lesson.steps, { onWarning: ({ code }) => warnings.push(code) });
    expect(constructionItem(items, "sharedmid").construction?.spaceId).toBe("canvas");
    expect(warnings).toEqual([]);
  });

  it("drops only invalid geometric constructions and keeps unrelated ink", () => {
    const warnings: Array<{ id: string; code: string }> = [];
    const lesson = decodeSteps([
      {
        id: "s1",
        script: "Draw two parallel bounded lines.",
        ops: [
          ...baseCanvasOps().slice(0, 1),
          { op: "line", id: "parallelone", canvas_id: "canvas", from: [0.2, 0.3], to: [0.8, 0.3], stroke: "solid" },
          { op: "line", id: "paralleltwo", canvas_id: "canvas", from: [0.2, 0.7], to: [0.8, 0.7], stroke: "solid" },
        ],
        checkpoint: null,
      },
      {
        id: "s2",
        script: "Reject the impossible crossing but retain the explanation.",
        ops: [
          { op: "point", id: "badcross", construct: { kind: "intersection_of", a: "parallelone", b: "paralleltwo" } },
          { op: "text", id: "survives", region: "A3", content: "parallel lines never meet" },
        ],
        checkpoint: null,
      },
    ])!;
    const items = layoutSteps(lesson.steps, {
      onWarning: ({ id, code }) => warnings.push({ id, code }),
    });
    expect(items.some(({ op }) => op.id === "badcross")).toBe(false);
    expect(items.some(({ op }) => op.id === "survives")).toBe(true);
    expect(warnings).toEqual([{ id: "badcross", code: "parallel_geometry" }]);

    const prepared = new RoughSvgBoardRenderer().prepareLesson(lesson);
    expect(prepared.build.geometries.some(({ id }) => id === "badcross")).toBe(false);
    expect(prepared.build.geometries.some(({ id }) => id === "survives")).toBe(true);
    expect(prepared.build.warnings).toContainEqual({
      id: "badcross",
      detail: "construction:parallel_geometry",
    });
  });

  it("rejects forward/cyclic references before they enter accepted browser state", () => {
    const decoded = decodeLesson({
      schema_version: "1.3",
      title: "Forward",
      steps: [
        {
          id: "s1",
          script: "A future line cannot define an accepted point.",
          ops: [
            ...baseCanvasOps().slice(0, 1),
            { op: "point", id: "futurepoint", construct: { kind: "along", element_id: "futureline", t: 0.5 } },
            { op: "line", id: "futureline", canvas_id: "canvas", from: [0.2, 0.5], to: [0.8, 0.5], stroke: "solid" },
          ],
          checkpoint: null,
        },
      ],
    });
    expect(decoded.lesson?.steps[0].ops.map(({ id }) => id)).toEqual(["canvas", "futureline"]);
    expect(decoded.warnings.some(({ code, opId }) => code === "unknown_reference" && opId === "futurepoint")).toBe(true);
  });

  it("enforces prior-step construction sources even if a caller bypasses decode", () => {
    const warnings: string[] = [];
    const unsafeSteps = [{
      id: "s1",
      script: "A current-step source must not become construction authority.",
      ops: [
        { op: "line", id: "base", region: "left", from: [0.2, 0.5], to: [0.8, 0.5], stroke: "solid" },
        { op: "point", id: "same", construct: { kind: "along", element_id: "base", t: 0.5 } },
      ],
      checkpoint: null,
    }] as unknown as Parameters<typeof layoutSteps>[0];

    const items = layoutSteps(unsafeSteps, { onWarning: ({ code }) => warnings.push(code) });
    expect(items.map(({ op }) => op.id)).toEqual(["base"]);
    expect(warnings).toEqual(["unknown_reference"]);
  });

  it("rejects coordinate-space mismatch and off-canvas results without throwing", () => {
    const warnings: string[] = [];
    const lesson = decodeSteps([
      {
        id: "s1",
        script: "Create geometry in two independent coordinate spaces.",
        ops: [
          { op: "line", id: "leftline", region: "A2", from: [0.2, 0.2], to: [0.8, 0.8], stroke: "solid" },
          { op: "line", id: "rightline", region: "D2", from: [0.2, 0.8], to: [0.8, 0.2], stroke: "solid" },
          { op: "point", id: "edgepoint", region: "A1", at: [0.5, 0.01] },
        ],
        checkpoint: null,
      },
      {
        id: "s2",
        script: "Unsafe constructions are isolated from valid later marks.",
        ops: [
          { op: "point", id: "wrongspace", construct: { kind: "intersection_of", a: "leftline", b: "rightline" } },
          { op: "point", id: "offcanvas", construct: { kind: "offset_from", element_id: "edgepoint", side: "above", gap: 0.25 } },
        ],
        checkpoint: null,
      },
    ])!;
    const items = layoutSteps(lesson.steps, { onWarning: ({ code }) => warnings.push(code) });
    expect(items.some(({ op }) => op.id === "wrongspace" || op.id === "offcanvas")).toBe(false);
    expect(warnings).toEqual(["coordinate_space_mismatch", "off_board"]);
  });
});
