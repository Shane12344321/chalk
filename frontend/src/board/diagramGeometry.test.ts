import { describe, expect, it } from "vitest";
import {
  arrowHeadPoints,
  diagramArcPoints,
  diagramPrimitiveBounds,
  sampleCubicSegments,
  smoothThroughPoints,
} from "./diagramGeometry";
import type { DiagramPrimitive } from "./lesson.generated";

const canvas = { x: 100, y: 50, width: 800, height: 400 };

describe("diagram geometry", () => {
  it("builds a smooth path that passes through every authored point", () => {
    const authored: [number, number][] = [[100, 100], [300, 40], [500, 240], [700, 180]];
    const segments = smoothThroughPoints(authored, 0.55);
    expect(segments).toHaveLength(authored.length - 1);
    expect(segments.map(({ from }) => from)).toEqual(authored.slice(0, -1));
    expect(segments.map(({ to }) => to)).toEqual(authored.slice(1));
  });

  it("uses exact cubic extrema rather than only the authored control points", () => {
    const primitive: Extract<DiagramPrimitive, { kind: "smooth" }> = {
      kind: "smooth" as const,
      points: [[0.05, 0.5], [0.35, 0.05], [0.65, 0.95], [0.95, 0.5]],
      stroke: "solid" as const,
    };
    const bounds = diagramPrimitiveBounds(primitive, canvas, 1);
    const samples = sampleCubicSegments(
      smoothThroughPoints(primitive.points.map(([x, y]) => [canvas.x + x * canvas.width, canvas.y + y * canvas.height]), 1),
      100,
    );
    for (const [x, y] of samples) {
      expect(x).toBeGreaterThanOrEqual(bounds.x - 0.001);
      expect(x).toBeLessThanOrEqual(bounds.x + bounds.width + 0.001);
      expect(y).toBeGreaterThanOrEqual(bounds.y - 0.001);
      expect(y).toBeLessThanOrEqual(bounds.y + bounds.height + 0.001);
    }
  });

  it("bounds only the visible arc sweep and includes its arrowhead", () => {
    const base = {
      kind: "arc" as const,
      center: [0.5, 0.5] as [number, number],
      radius: [0.3, 0.3] as [number, number],
      start_deg: 0,
      end_deg: 90,
      stroke: "solid" as const,
    };
    const arc = diagramArcPoints(base, canvas);
    expect(arc[0]).toEqual([740, 250]);
    expect(arc.at(-1)![0]).toBeCloseTo(500);
    expect(arc.at(-1)![1]).toBeCloseTo(370);
    const withoutArrow = diagramPrimitiveBounds(base, canvas);
    const withArrow = diagramPrimitiveBounds({ ...base, arrow: true }, canvas);
    expect(withoutArrow.width).toBeCloseTo(240);
    expect(withoutArrow.height).toBeCloseTo(120);
    expect(withArrow.width * withArrow.height).toBeGreaterThanOrEqual(withoutArrow.width * withoutArrow.height);
  });

  it("constructs symmetric arrowhead wings from the final tangent", () => {
    const [, left, right] = arrowHeadPoints([100, 100], [50, 100]);
    expect(left[0]).toBeCloseTo(right[0]);
    expect(left[1] - 100).toBeCloseTo(-(right[1] - 100));
  });

  it("bounds positioned text using its alignment and size", () => {
    const centered: Extract<DiagramPrimitive, { kind: "text" }> = {
      kind: "text",
      at: [0.5, 0.5],
      content: "x = 4",
      align: "center",
      size: "large",
    };
    const bounds = diagramPrimitiveBounds(centered, canvas);
    expect(bounds.x + bounds.width / 2).toBeCloseTo(500);
    expect(bounds.y).toBeCloseTo(210);
    expect(bounds.height).toBeCloseTo(50);
  });
});
