import { axesPlotBox } from "./axesGeometry";
import { sampleVisibleCurveSegments } from "./expression";
import type {
  GeometryPointReference,
  LineConstructionOp,
  LessonOp,
  PointConstructionOp,
} from "./lesson.generated";
import type { LaidOutOp, LayoutBox } from "./layout";

export type ConstructionFailureCode =
  | "unknown_reference"
  | "unsupported_geometry"
  | "coordinate_space_mismatch"
  | "ambiguous_geometry"
  | "parallel_geometry"
  | "no_intersection"
  | "degenerate_geometry"
  | "off_board";

export type ConstructionOp = LineConstructionOp | PointConstructionOp;
export type BoardPoint = readonly [number, number];

interface ConstructionBase {
  canvas: LayoutBox;
  spaceId: string;
  summary: string;
}

export interface ResolvedPointConstruction extends ConstructionBase {
  kind: "point";
  point: BoardPoint;
}

export interface ResolvedLineConstruction extends ConstructionBase {
  kind: "line";
  from: BoardPoint;
  to: BoardPoint;
}

export type ResolvedConstruction =
  | ResolvedPointConstruction
  | ResolvedLineConstruction;

interface SourceGeometry {
  id: string;
  canvas: LayoutBox;
  spaceId: string;
  polylines: BoardPoint[][];
  point?: BoardPoint;
}

const EPSILON = 1e-7;
const TANGENT_MIN_DIRECTION_ALIGNMENT = Math.cos(Math.PI / 4);

export class ConstructionResolutionError extends Error {
  constructor(
    readonly code: ConstructionFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "ConstructionResolutionError";
  }
}

export function isConstructionOp(op: LessonOp): op is ConstructionOp {
  return (op.op === "line" || op.op === "point") && "construct" in op;
}

/**
 * Resolve a schema-1.4 relation from already laid-out renderer truth. The
 * caller deliberately passes only earlier accepted items: constructors never
 * guess a coordinate and never read a future operation.
 */
export function resolveConstruction(
  op: ConstructionOp,
  earlier: readonly LaidOutOp[],
): ResolvedConstruction {
  const byId = new Map(earlier.map((item) => [item.op.id, item]));
  if (op.op === "line") return resolveLineConstruction(op, byId);

  const relation = op.construct;
  if (relation.kind === "along") {
    const source = requiredSource(relation.element_id, byId);
    if (source.polylines.length !== 1) {
      throw failure("ambiguous_geometry", "along requires one contiguous line or curve");
    }
    const point = pointAlongPolyline(source.polylines[0], relation.t);
    assertInsideCanvas(point, source.canvas);
    return {
      kind: "point",
      point,
      canvas: source.canvas,
      spaceId: source.spaceId,
      summary: `point along ${relation.element_id} at t=${formatNumber(relation.t)}`,
    };
  }

  if (relation.kind === "midpoint_of") {
    const a = resolvePointReference(relation.a, byId);
    const b = resolvePointReference(relation.b, byId);
    assertSameSpace(a, b);
    const point: BoardPoint = [(a.point[0] + b.point[0]) / 2, (a.point[1] + b.point[1]) / 2];
    assertInsideCanvas(point, a.canvas);
    return {
      kind: "point",
      point,
      canvas: a.canvas,
      spaceId: a.spaceId,
      summary: `midpoint of ${describePointReference(relation.a)} and ${describePointReference(relation.b)}`,
    };
  }

  if (relation.kind === "intersection_of") {
    if (relation.a === relation.b) {
      throw failure("ambiguous_geometry", "intersection requires two distinct elements");
    }
    const a = requiredSource(relation.a, byId);
    const b = requiredSource(relation.b, byId);
    assertSameSpace(a, b);
    const point = uniqueIntersection(a, b);
    assertInsideCanvas(point, a.canvas);
    return {
      kind: "point",
      point,
      canvas: a.canvas,
      spaceId: a.spaceId,
      summary: `intersection of ${relation.a} and ${relation.b}`,
    };
  }

  const source = requiredSource(relation.element_id, byId);
  const bounds = geometryBounds(source);
  const horizontalGap = relation.gap * source.canvas.width;
  const verticalGap = relation.gap * source.canvas.height;
  const point: BoardPoint = relation.side === "above"
    ? [bounds.x + bounds.width / 2, bounds.y - verticalGap]
    : relation.side === "below"
      ? [bounds.x + bounds.width / 2, bounds.y + bounds.height + verticalGap]
      : relation.side === "left"
        ? [bounds.x - horizontalGap, bounds.y + bounds.height / 2]
        : [bounds.x + bounds.width + horizontalGap, bounds.y + bounds.height / 2];
  assertInsideCanvas(point, source.canvas);
  return {
    kind: "point",
    point,
    canvas: source.canvas,
    spaceId: source.spaceId,
    summary: `${relation.side} offset from ${relation.element_id} by ${formatNumber(relation.gap)}`,
  };
}

export function constructionBounds(
  construction: ResolvedConstruction,
  padding = 18,
): LayoutBox {
  const points = construction.kind === "point"
    ? [construction.point]
    : [construction.from, construction.to];
  const left = Math.min(...points.map(([x]) => x));
  const top = Math.min(...points.map(([, y]) => y));
  const right = Math.max(...points.map(([x]) => x));
  const bottom = Math.max(...points.map(([, y]) => y));
  return {
    x: left - padding,
    y: top - padding,
    width: right - left + padding * 2,
    height: bottom - top + padding * 2,
  };
}

function resolveLineConstruction(
  op: LineConstructionOp,
  byId: ReadonlyMap<string, LaidOutOp>,
): ResolvedLineConstruction {
  const relation = op.construct;
  if (relation.kind === "tangent_at") return resolveTangent(op, byId);
  const line = requiredSource(relation.line, byId);
  if (line.polylines.length !== 1 || line.polylines[0].length !== 2) {
    throw failure("unsupported_geometry", "perpendicular_through requires one straight line");
  }
  const point = resolvePointReference(relation.point, byId);
  assertSameSpace(line, point);
  const [start, end] = line.polylines[0];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const magnitude = Math.hypot(dx, dy);
  if (magnitude <= EPSILON) {
    throw failure("degenerate_geometry", "perpendicular source line has no direction");
  }
  const halfLength = (relation.length * Math.min(line.canvas.width, line.canvas.height)) / 2;
  const normalX = -dy / magnitude;
  const normalY = dx / magnitude;
  const from: BoardPoint = [
    point.point[0] - normalX * halfLength,
    point.point[1] - normalY * halfLength,
  ];
  const to: BoardPoint = [
    point.point[0] + normalX * halfLength,
    point.point[1] + normalY * halfLength,
  ];
  assertInsideCanvas(from, line.canvas);
  assertInsideCanvas(to, line.canvas);
  return {
    kind: "line",
    from,
    to,
    canvas: line.canvas,
    spaceId: line.spaceId,
    summary: op.meaning ?? `perpendicular to ${relation.line} through ${describePointReference(relation.point)}`,
  };
}

/**
 * Construct a tangent from the same finite sampled polyline that the renderer
 * displays. This intentionally does not claim an analytical derivative: it
 * rejects endpoint, discontinuity, and corner-like cases rather than drawing
 * a plausible but unsupported line.
 */
function resolveTangent(
  op: LineConstructionOp,
  byId: ReadonlyMap<string, LaidOutOp>,
): ResolvedLineConstruction {
  const relation = op.construct;
  if (relation.kind !== "tangent_at") {
    throw failure("unsupported_geometry", "expected tangent_at construction");
  }
  const curveItem = byId.get(relation.curve);
  if (!curveItem) throw failure("unknown_reference", `geometry ${relation.curve} is not resolved`);
  if (curveItem.op.op !== "curve") {
    throw failure("unsupported_geometry", "tangent_at requires one accepted curve");
  }
  const axesItem = byId.get(curveItem.op.axes_id);
  if (!axesItem || axesItem.op.op !== "axes") {
    throw failure("unknown_reference", "tangent curve axes are not resolved");
  }

  const segments = sampleVisibleCurveSegments(curveItem.op, axesItem.op);
  if (segments.length !== 1) {
    throw failure("ambiguous_geometry", "tangent_at requires one contiguous visible curve segment");
  }
  const dataPoints = segments[0];
  if (dataPoints.length < 5) {
    throw failure("degenerate_geometry", "curve has too few visible samples for a tangent");
  }
  const firstX = dataPoints[0][0];
  const lastX = dataPoints.at(-1)![0];
  const sampleWidth = Math.abs(lastX - firstX) / (dataPoints.length - 1);
  if (relation.x < firstX - EPSILON || relation.x > lastX + EPSILON) {
    throw failure("off_board", "tangent point is outside the visible curve segment");
  }
  const distanceToEdge = Math.min(relation.x - firstX, lastX - relation.x);
  if (!Number.isFinite(sampleWidth) || sampleWidth <= EPSILON || distanceToEdge <= sampleWidth * 1.5) {
    throw failure("unsupported_geometry", "tangent_at must be strictly inside a visible curve segment");
  }

  const window = Math.min(
    distanceToEdge / 2,
    Math.max(sampleWidth, Math.abs(lastX - firstX) * 0.01),
  );
  const canvas = axesPlotBox(axesItem.box);
  const center = mapCurvePoint(dataPointAtX(dataPoints, relation.x), axesItem.op, canvas);
  const before = mapCurvePoint(
    dataPointAtX(dataPoints, relation.x - window),
    axesItem.op,
    canvas,
  );
  const after = mapCurvePoint(
    dataPointAtX(dataPoints, relation.x + window),
    axesItem.op,
    canvas,
  );
  const incoming = unitVector([center[0] - before[0], center[1] - before[1]]);
  const outgoing = unitVector([after[0] - center[0], after[1] - center[1]]);
  if (!incoming || !outgoing) {
    throw failure("degenerate_geometry", "curve has no stable local direction at the tangent");
  }
  const alignment = incoming[0] * outgoing[0] + incoming[1] * outgoing[1];
  if (alignment < TANGENT_MIN_DIRECTION_ALIGNMENT) {
    throw failure("ambiguous_geometry", "curve changes direction too sharply for a local tangent");
  }
  const direction = unitVector([incoming[0] + outgoing[0], incoming[1] + outgoing[1]]);
  if (!direction) {
    throw failure("degenerate_geometry", "curve has no unambiguous tangent direction");
  }

  const halfLength = (relation.length * Math.min(canvas.width, canvas.height)) / 2;
  const from: BoardPoint = [
    center[0] - direction[0] * halfLength,
    center[1] - direction[1] * halfLength,
  ];
  const to: BoardPoint = [
    center[0] + direction[0] * halfLength,
    center[1] + direction[1] * halfLength,
  ];
  assertInsideCanvas(from, canvas);
  assertInsideCanvas(to, canvas);
  return {
    kind: "line",
    from,
    to,
    canvas,
    spaceId: curveItem.op.axes_id,
    summary: op.meaning ?? `local tangent to ${relation.curve} at x=${formatNumber(relation.x)}`,
  };
}

interface ResolvedPointReference extends ConstructionBase {
  point: BoardPoint;
}

function resolvePointReference(
  reference: GeometryPointReference,
  byId: ReadonlyMap<string, LaidOutOp>,
): ResolvedPointReference {
  const source = requiredSource(reference.element_id, byId);
  if (reference.kind === "point") {
    if (!source.point) {
      throw failure("unsupported_geometry", `${reference.element_id} is not a point`);
    }
    return { point: source.point, canvas: source.canvas, spaceId: source.spaceId, summary: reference.element_id };
  }
  if (source.polylines.length !== 1 || source.polylines[0].length < 2) {
    throw failure("unsupported_geometry", `${reference.element_id} has no unambiguous endpoints`);
  }
  const polyline = source.polylines[0];
  const point = reference.endpoint === "start" ? polyline[0] : polyline.at(-1)!;
  return { point, canvas: source.canvas, spaceId: source.spaceId, summary: reference.element_id };
}

function requiredSource(
  id: string,
  byId: ReadonlyMap<string, LaidOutOp>,
): SourceGeometry {
  const item = byId.get(id);
  if (!item) throw failure("unknown_reference", `geometry ${id} is not resolved`);
  const source = sourceGeometry(item, byId);
  if (!source) throw failure("unsupported_geometry", `geometry ${id} is not constructable`);
  return source;
}

function sourceGeometry(
  item: LaidOutOp,
  byId: ReadonlyMap<string, LaidOutOp>,
): SourceGeometry | undefined {
  if (item.construction) {
    if (item.construction.kind === "point") {
      return {
        id: item.op.id,
        canvas: item.construction.canvas,
        spaceId: item.construction.spaceId,
        polylines: [],
        point: item.construction.point,
      };
    }
    return {
      id: item.op.id,
      canvas: item.construction.canvas,
      spaceId: item.construction.spaceId,
      polylines: [[item.construction.from, item.construction.to]],
    };
  }
  const op = item.op;
  if (op.op === "point" && "at" in op && item.canvasBox) {
    return {
      id: op.id,
      canvas: item.canvasBox,
      spaceId: sourceSpaceId(item, byId),
      polylines: [],
      point: mapPoint(op.at, item.canvasBox),
    };
  }
  if ((op.op === "line" || op.op === "arrow") && "from" in op && item.canvasBox) {
    return {
      id: op.id,
      canvas: item.canvasBox,
      spaceId: sourceSpaceId(item, byId),
      polylines: [[mapPoint(op.from, item.canvasBox), mapPoint(op.to, item.canvasBox)]],
    };
  }
  if (op.op === "curve") {
    const axesItem = byId.get(op.axes_id);
    if (!axesItem || axesItem.op.op !== "axes") return undefined;
    const axesOp = axesItem.op;
    const canvas = axesPlotBox(axesItem.box);
    const segments = sampleVisibleCurveSegments(op, axesOp).map((segment) =>
      segment.map(([x, y]) => [
        canvas.x + ((x - axesOp.x.min) / (axesOp.x.max - axesOp.x.min)) * canvas.width,
        canvas.y + canvas.height - ((y - axesOp.y.min) / (axesOp.y.max - axesOp.y.min)) * canvas.height,
      ] as BoardPoint),
    );
    return { id: op.id, canvas, spaceId: op.axes_id, polylines: segments };
  }
  return undefined;
}

function dataPointAtX(
  points: readonly [number, number][],
  x: number,
): [number, number] {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    if (x < previous[0] - EPSILON || x > next[0] + EPSILON) continue;
    const span = next[0] - previous[0];
    if (Math.abs(span) <= EPSILON) {
      throw failure("degenerate_geometry", "curve sample has no horizontal extent");
    }
    const t = Math.min(1, Math.max(0, (x - previous[0]) / span));
    return [
      previous[0] + (next[0] - previous[0]) * t,
      previous[1] + (next[1] - previous[1]) * t,
    ];
  }
  throw failure("off_board", "tangent point is outside the visible curve segment");
}

function mapCurvePoint(
  point: readonly [number, number],
  axes: Extract<LaidOutOp["op"], { op: "axes" }>,
  canvas: LayoutBox,
): BoardPoint {
  return [
    canvas.x + ((point[0] - axes.x.min) / (axes.x.max - axes.x.min)) * canvas.width,
    canvas.y + canvas.height - ((point[1] - axes.y.min) / (axes.y.max - axes.y.min)) * canvas.height,
  ];
}

function unitVector(vector: BoardPoint): BoardPoint | undefined {
  const magnitude = Math.hypot(vector[0], vector[1]);
  if (!Number.isFinite(magnitude) || magnitude <= EPSILON) return undefined;
  return [vector[0] / magnitude, vector[1] / magnitude];
}

function sourceSpaceId(
  item: LaidOutOp,
  byId: ReadonlyMap<string, LaidOutOp>,
  visiting = new Set<string>(),
): string {
  if (item.construction) return item.construction.spaceId;
  if (!("canvas_id" in item.op)) return item.op.id;
  if (visiting.has(item.op.id)) {
    throw failure("ambiguous_geometry", "coordinate-space chain contains a cycle");
  }
  visiting.add(item.op.id);
  const parent = byId.get(item.op.canvas_id);
  return parent ? sourceSpaceId(parent, byId, visiting) : item.op.canvas_id;
}

function pointAlongPolyline(points: readonly BoardPoint[], t: number): BoardPoint {
  if (points.length < 2) throw failure("degenerate_geometry", "path has fewer than two points");
  const lengths = points.slice(1).map((point, index) =>
    Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total <= EPSILON) throw failure("degenerate_geometry", "path has no length");
  if (t <= 0) return points[0];
  if (t >= 1) return points.at(-1)!;
  const target = t * total;
  let traversed = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    if (lengths[index] <= EPSILON) continue;
    const next = traversed + lengths[index];
    if (target <= next + EPSILON) {
      const local = (target - traversed) / lengths[index];
      return [
        points[index][0] + (points[index + 1][0] - points[index][0]) * local,
        points[index][1] + (points[index + 1][1] - points[index][1]) * local,
      ];
    }
    traversed = next;
  }
  return points.at(-1)!;
}

function uniqueIntersection(a: SourceGeometry, b: SourceGeometry): BoardPoint {
  const intersections: BoardPoint[] = [];
  let sawParallel = false;
  let sawCollinear = false;
  for (const polylineA of a.polylines) {
    for (const polylineB of b.polylines) {
      for (let aIndex = 1; aIndex < polylineA.length; aIndex += 1) {
        for (let bIndex = 1; bIndex < polylineB.length; bIndex += 1) {
          const result = segmentIntersection(
            polylineA[aIndex - 1],
            polylineA[aIndex],
            polylineB[bIndex - 1],
            polylineB[bIndex],
          );
          if (result === "parallel") sawParallel = true;
          else if (result === "collinear") sawCollinear = true;
          else if (result && !intersections.some((point) => pointsNear(point, result))) {
            intersections.push(result);
          }
        }
      }
    }
  }
  if (sawCollinear) throw failure("ambiguous_geometry", "intersection contains overlapping geometry");
  if (intersections.length > 1) {
    throw failure("ambiguous_geometry", "intersection has more than one distinct point");
  }
  if (intersections.length === 0) {
    throw failure(
      sawParallel ? "parallel_geometry" : "no_intersection",
      sawParallel ? "parallel geometry has no intersection" : "bounded geometry does not intersect",
    );
  }
  return intersections[0];
}

function segmentIntersection(
  p: BoardPoint,
  p2: BoardPoint,
  q: BoardPoint,
  q2: BoardPoint,
): BoardPoint | "parallel" | "collinear" | undefined {
  const r: BoardPoint = [p2[0] - p[0], p2[1] - p[1]];
  const s: BoardPoint = [q2[0] - q[0], q2[1] - q[1]];
  const denominator = cross(r, s);
  const qMinusP: BoardPoint = [q[0] - p[0], q[1] - p[1]];
  if (Math.abs(denominator) <= EPSILON) {
    return Math.abs(cross(qMinusP, r)) <= EPSILON ? "collinear" : "parallel";
  }
  const t = cross(qMinusP, s) / denominator;
  const u = cross(qMinusP, r) / denominator;
  if (t < -EPSILON || t > 1 + EPSILON || u < -EPSILON || u > 1 + EPSILON) {
    return undefined;
  }
  return [p[0] + Math.min(1, Math.max(0, t)) * r[0], p[1] + Math.min(1, Math.max(0, t)) * r[1]];
}

function geometryBounds(source: SourceGeometry): LayoutBox {
  const points = source.point ? [source.point] : source.polylines.flat();
  if (points.length === 0) throw failure("degenerate_geometry", "geometry has no points");
  const left = Math.min(...points.map(([x]) => x));
  const top = Math.min(...points.map(([, y]) => y));
  const right = Math.max(...points.map(([x]) => x));
  const bottom = Math.max(...points.map(([, y]) => y));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function assertSameSpace(
  a: Pick<SourceGeometry, "spaceId" | "canvas">,
  b: Pick<SourceGeometry, "spaceId" | "canvas">,
): void {
  if (a.spaceId !== b.spaceId) {
    throw failure("coordinate_space_mismatch", "construction inputs do not share a coordinate space");
  }
}

function assertInsideCanvas(point: BoardPoint, canvas: LayoutBox): void {
  if (
    !Number.isFinite(point[0]) || !Number.isFinite(point[1]) ||
    point[0] < canvas.x - EPSILON || point[0] > canvas.x + canvas.width + EPSILON ||
    point[1] < canvas.y - EPSILON || point[1] > canvas.y + canvas.height + EPSILON
  ) {
    throw failure("off_board", "constructed geometry leaves its renderer-owned coordinate space");
  }
}

function mapPoint(point: readonly [number, number], canvas: LayoutBox): BoardPoint {
  return [canvas.x + point[0] * canvas.width, canvas.y + point[1] * canvas.height];
}

function cross(a: BoardPoint, b: BoardPoint): number {
  return a[0] * b[1] - a[1] * b[0];
}

function pointsNear(a: BoardPoint, b: BoardPoint): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) <= 1e-5;
}

function describePointReference(reference: GeometryPointReference): string {
  return reference.kind === "point"
    ? reference.element_id
    : `${reference.endpoint} of ${reference.element_id}`;
}

function formatNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function failure(code: ConstructionFailureCode, message: string): ConstructionResolutionError {
  return new ConstructionResolutionError(code, message);
}
