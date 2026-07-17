import rough from "roughjs/bin/rough";
import type { PathInfo } from "roughjs/bin/core";
import { sampleVisibleCurveSegments } from "./expression";
import { renderSafeLatex } from "./latex";
import type { AxesOp, LessonOp } from "./lesson.generated";
import type { LaidOutOp, LayoutBox } from "./layout";

export interface BoardPath {
  d: string;
  stroke: string;
  strokeWidth: number;
  fill: string;
  revealGroup?: number;
  revealWeight?: number;
}

export interface BoardLabel {
  text: string;
  x: number;
  y: number;
  anchor?: "start" | "middle" | "end";
}

export interface BoardGeometry {
  id: string;
  kind: LessonOp["op"];
  box: LayoutBox;
  paths: BoardPath[];
  labels: BoardLabel[];
  text?: string;
  equationHtml?: string;
  equationFontSize?: number;
  manifestSummary: string;
  stepIndex: number;
  opIndex: number;
}

export interface GeometryBuildResult {
  geometries: BoardGeometry[];
  warnings: Array<{ id: string; detail: string }>;
}

interface CacheEntry {
  signature: string;
  geometry: BoardGeometry;
}

export class BoardGeometryStore {
  private readonly cache = new Map<string, CacheEntry>();

  build(laidOutOps: readonly LaidOutOp[]): GeometryBuildResult {
    const geometries: BoardGeometry[] = [];
    const warnings: Array<{ id: string; detail: string }> = [];
    const axes = new Map<string, { op: AxesOp; box: LayoutBox }>();
    const liveIds = new Set(laidOutOps.map(({ op }) => op.id));

    for (const item of laidOutOps) {
      if (item.op.op === "axes") axes.set(item.op.id, { op: item.op, box: item.box });
      const signature = JSON.stringify([item.op, item.box, item.stepIndex, item.opIndex]);
      const cached = this.cache.get(item.op.id);
      if (cached?.signature === signature) {
        geometries.push(cached.geometry);
        continue;
      }
      try {
        const geometry = createGeometry(item, axes);
        this.cache.set(item.op.id, { signature, geometry });
        geometries.push(geometry);
      } catch (error) {
        this.cache.delete(item.op.id);
        warnings.push({
          id: item.op.id,
          detail: error instanceof Error ? error.message : "Geometry generation failed.",
        });
      }
    }
    for (const id of this.cache.keys()) {
      if (!liveIds.has(id)) this.cache.delete(id);
    }
    return { geometries, warnings };
  }
}

function createGeometry(
  item: LaidOutOp,
  axes: ReadonlyMap<string, { op: AxesOp; box: LayoutBox }>,
): BoardGeometry {
  const { op, box, stepIndex, opIndex } = item;
  const base: BoardGeometry = {
    id: op.id,
    kind: op.op,
    box,
    paths: [],
    labels: [],
    manifestSummary: op.op,
    stepIndex,
    opIndex,
  };

  if (op.op === "text") {
    return { ...base, text: op.content, manifestSummary: `text: ${op.content}` };
  }
  if (op.op === "equation") {
    return {
      ...base,
      equationHtml: renderSafeLatex(op.latex),
      equationFontSize: equationFontSize(op.latex, box.width),
      manifestSummary: `equation: ${op.latex}`,
    };
  }

  const generator = rough.generator({
    options: {
      roughness: 1.25,
      bowing: 1.1,
      stroke: "#f5efd8",
      strokeWidth: 4,
      disableMultiStroke: false,
    },
  });

  if (op.op === "sketch") {
    const paths = op.strokes.flatMap((stroke, index) => {
      const points = stroke.map(([x, y]) => [
        box.x + x * box.width,
        box.y + y * box.height,
      ] as [number, number]);
      return normalizePaths(
        generator.toPaths(
          generator.linearPath(points, { seed: stableSeed(`${op.id}:${index}`) }),
        ),
        index,
        polylineLength(points),
      );
    });
    return { ...base, paths, manifestSummary: `sketch with ${op.strokes.length} strokes` };
  }

  if (op.op === "axes") {
    const left = box.x + 58;
    const right = box.x + box.width - 24;
    const top = box.y + 24;
    const bottom = box.y + box.height - 52;
    const paths = [
      ...generator.toPaths(generator.line(left, bottom, right, bottom, { seed: stableSeed(`${op.id}:x`) })),
      ...generator.toPaths(generator.line(left, bottom, left, top, { seed: stableSeed(`${op.id}:y`) })),
    ];
    return {
      ...base,
      paths: normalizePaths(paths),
      manifestSummary: `axes: ${op.x.label} ${op.x.min} to ${op.x.max}; ${op.y.label} ${op.y.min} to ${op.y.max}`,
      labels: [
        { text: op.x.label, x: (left + right) / 2, y: bottom + 42, anchor: "middle" },
        { text: op.y.label, x: left + 8, y: top + 4 },
        { text: String(op.x.min), x: left, y: bottom + 30, anchor: "middle" },
        { text: String(op.x.max), x: right, y: bottom + 30, anchor: "middle" },
        { text: String(op.y.max), x: left - 14, y: top + 8, anchor: "end" },
      ],
    };
  }

  const target = axes.get(op.axes_id);
  if (!target) throw new Error(`Curve ${op.id} has no laid-out axes.`);
  const plot = plotBox(target.box);
  const sampledSegments = sampleVisibleCurveSegments(op, target.op);
  const visibleSegments = sampledSegments.map((segment) =>
    segment.map(([x, y]) => [
      plot.x + ((x - target.op.x.min) / (target.op.x.max - target.op.x.min)) * plot.width,
      plot.y + plot.height - ((y - target.op.y.min) / (target.op.y.max - target.op.y.min)) * plot.height,
    ] as [number, number]),
  );
  if (visibleSegments.length === 0) throw new Error(`Curve ${op.id} has fewer than two visible samples.`);
  const peak = sampledSegments
    .flat()
    .reduce((highest, point) => (point[1] > highest[1] ? point : highest));
  return {
    ...base,
    paths: normalizePaths(
      visibleSegments.flatMap((visible, index) =>
        generator.toPaths(generator.curve(visible, {
          seed: stableSeed(`${op.id}:${index}`),
          stroke: "#efc76a",
          strokeWidth: 5,
          roughness: 0.75,
        })),
      ),
    ),
    manifestSummary: `curve on ${op.axes_id}; visible peak near x=${formatNumber(peak[0])}, y=${formatNumber(peak[1])}`,
  };
}

function equationFontSize(latex: string, width: number): number {
  const visibleLength = latex
    .replace(/\\(?:frac|over|bigg|quad|qquad|mathrm|text|sin|cos|ln|sqrt|cdot|theta|omega|lambda|pi|Delta|sum|approx|Rightarrow|circ|vec)/g, "x")
    .replace(/[{}\\_^|]/g, "")
    .length;
  return Math.max(10, Math.min(31, width / Math.max(10, visibleLength * 0.9)));
}

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function plotBox(box: LayoutBox): LayoutBox {
  return {
    x: box.x + 58,
    y: box.y + 24,
    width: box.width - 82,
    height: box.height - 76,
  };
}

function normalizePaths(
  paths: PathInfo[],
  revealGroup?: number,
  revealWeight?: number,
): BoardPath[] {
  return paths.map((path) => ({
    d: path.d,
    stroke: path.stroke || "#f5efd8",
    strokeWidth: path.strokeWidth || 4,
    fill: path.fill && path.fill !== "none" ? path.fill : "none",
    ...(revealGroup === undefined ? {} : { revealGroup }),
    ...(revealWeight === undefined ? {} : { revealWeight }),
  }));
}

function polylineLength(points: readonly [number, number][]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const [previousX, previousY] = points[index - 1];
    const [x, y] = points[index];
    length += Math.hypot(x - previousX, y - previousY);
  }
  return Math.max(1, length);
}

export function stableSeed(id: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) || 1;
}
