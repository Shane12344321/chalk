import type { LessonOp, Region } from "./lesson.generated";
import type { NormalizedStep } from "./decode";

export const BOARD_WIDTH = 1600;
export const BOARD_HEIGHT = 900;
const PADDING = 48;
const GAP = 24;
const COLUMN_WIDTH = (BOARD_WIDTH - PADDING * 2 - GAP * 3) / 4;
const ROW_HEIGHT = (BOARD_HEIGHT - PADDING * 2 - GAP * 2) / 3;

export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LaidOutOp {
  op: LessonOp;
  box: LayoutBox;
  canvasBox?: LayoutBox;
  stepIndex: number;
  opIndex: number;
}

export function regionBox(region: Region): LayoutBox {
  if (region === "full") {
    return { x: PADDING, y: PADDING, width: BOARD_WIDTH - PADDING * 2, height: BOARD_HEIGHT - PADDING * 2 };
  }
  if (region === "left" || region === "right") {
    const x = region === "left" ? PADDING : PADDING + (COLUMN_WIDTH + GAP) * 2;
    return { x, y: PADDING, width: COLUMN_WIDTH * 2 + GAP, height: BOARD_HEIGHT - PADDING * 2 };
  }
  const column = region.charCodeAt(0) - "A".charCodeAt(0);
  const row = Number(region[1]) - 1;
  return {
    x: PADDING + column * (COLUMN_WIDTH + GAP),
    y: PADDING + row * (ROW_HEIGHT + GAP),
    width: COLUMN_WIDTH,
    height: ROW_HEIGHT,
  };
}

export function layoutSteps(steps: readonly NormalizedStep[]): LaidOutOp[] {
  // Placement may depend only on earlier ops so that streaming in a later
  // step can never move ink that is already on the board (prefix stability).
  const result: LaidOutOp[] = [];
  const boxes = new Map<string, LayoutBox>();
  const coordinateSpaces = new Map<string, LayoutBox>();
  const regionCursors = new Map<Region, number>();

  steps.forEach((step, stepIndex) => {
    step.ops.forEach((op, opIndex) => {
      let box: LayoutBox;
      let canvasBox: LayoutBox | undefined;
      if (op.op === "curve") {
        const axesBox = boxes.get(op.axes_id);
        if (!axesBox) throw new Error(`Missing axes layout for ${op.id}.`);
        box = axesBox;
      } else if (isDiagramOp(op)) {
        if ("canvas_id" in op) {
          canvasBox = coordinateSpaces.get(op.canvas_id);
          if (!canvasBox) throw new Error(`Missing diagram canvas for ${op.id}.`);
        } else {
          canvasBox = allocateRegionBox(op.region, intrinsicSize(op), regionCursors);
          canvasBox = resolveCollision(canvasBox, op, result, boxes);
        }
        box = diagramElementBounds(op, canvasBox);
      } else if ("anchor" in op) {
        const target = boxes.get(op.anchor.el);
        if (!target) throw new Error(`Missing anchor layout for ${op.id}.`);
        box = anchorBox(target, op.anchor.side, op.anchor.gap ?? 0.08, intrinsicSize(op));
      } else {
        box = allocateRegionBox(op.region, intrinsicSize(op), regionCursors);
      }
      if (op.op !== "curve" && !isDiagramOp(op)) {
        box = resolveCollision(box, op, result, boxes);
      }
      boxes.set(op.id, box);
      if (canvasBox) coordinateSpaces.set(op.id, canvasBox);
      result.push({ op, box, ...(canvasBox ? { canvasBox } : {}), stepIndex, opIndex });
    });
  });
  return result;
}

function allocateRegionBox(
  region: Region,
  size: { width: number; height: number },
  regionCursors: Map<Region, number>,
): LayoutBox {
  const boundary = regionBox(region);
  const availableHeight = boundary.height - 36;
  const cursor = regionCursors.get(region) ?? 0;
  const remaining = Math.max(0, availableHeight - cursor);
  // The first occupant may take its full intrinsic height; later occupants
  // take at most half the remaining room, preserving streamed prefixes.
  const height =
    cursor === 0 ? Math.min(size.height, remaining) : Math.min(size.height, remaining / 2);
  const gap = Math.min(16, Math.max(0, (remaining - height) / 2));
  regionCursors.set(region, cursor + height + gap);
  return {
    x: boundary.x + 20,
    y: boundary.y + 18 + cursor,
    width: Math.min(size.width, boundary.width - 40),
    height,
  };
}

function resolveCollision(
  preferred: LayoutBox,
  op: Exclude<LessonOp, { op: "curve" }>,
  laidOut: readonly LaidOutOp[],
  boxes: ReadonlyMap<string, LayoutBox>,
): LayoutBox {
  const occupied = laidOut.filter(({ op: candidate }) => candidate.op !== "curve");
  if (!hasMaterialOverlap(preferred, occupied)) return preferred;

  const candidates = "anchor" in op
    ? anchorCandidates(op, boxes, preferred)
    : "region" in op
      ? regionCandidates(preferred, regionBox(op.region))
      : [preferred];
  return (
    candidates
      .filter((candidate) => !hasMaterialOverlap(candidate, occupied))
      .sort((left, right) => boxDistance(left, preferred) - boxDistance(right, preferred))[0] ??
    preferred
  );
}

function anchorCandidates(
  op: Extract<LessonOp, { anchor: unknown }>,
  boxes: ReadonlyMap<string, LayoutBox>,
  preferred: LayoutBox,
): LayoutBox[] {
  const target = boxes.get(op.anchor.el);
  if (!target) return [preferred];
  const size = intrinsicSize(op);
  const sides = [op.anchor.side, "below", "right", "above", "left"] as const;
  return [...new Set(sides)].map((side) =>
    anchorBox(target, side, op.anchor.gap ?? 0.08, size),
  );
}

function regionCandidates(preferred: LayoutBox, boundary: LayoutBox): LayoutBox[] {
  const candidates = [preferred];
  const maxX = boundary.x + boundary.width - preferred.width;
  const maxY = boundary.y + boundary.height - preferred.height;
  const step = 24;
  for (let y = boundary.y + 18; y <= maxY; y += step) {
    for (let x = boundary.x + 20; x <= maxX; x += step) {
      candidates.push({ ...preferred, x, y });
    }
  }
  candidates.push({ ...preferred, x: maxX, y: maxY });
  return candidates;
}

function hasMaterialOverlap(
  box: LayoutBox,
  occupied: readonly LaidOutOp[],
): boolean {
  return occupied.some(
    ({ box: candidate, canvasBox }) => overlapRatio(box, canvasBox ?? candidate) > 0.15,
  );
}

function overlapRatio(left: LayoutBox, right: LayoutBox): number {
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x),
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y),
  );
  const smallerArea = Math.min(left.width * left.height, right.width * right.height);
  return smallerArea === 0 ? 0 : (width * height) / smallerArea;
}

function boxDistance(left: LayoutBox, right: LayoutBox): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function intrinsicSize(op: LessonOp): { width: number; height: number } {
  switch (op.op) {
    case "axes":
      return { width: 700, height: 430 };
    case "sketch":
      return { width: 318, height: 190 };
    case "equation":
      return {
        width: Math.min(700, Math.max(310, 160 + visibleLatexLength(op.latex) * 12)),
        height: 92,
      };
    case "text":
      return { width: 310, height: 64 };
    case "curve":
      return { width: 0, height: 0 };
    case "line":
    case "arrow":
    case "point":
    case "angle_arc":
      return { width: 700, height: 430 };
  }
}

function isDiagramOp(
  op: LessonOp,
): op is Extract<LessonOp, { op: "line" | "arrow" | "point" | "angle_arc" }> {
  return ["line", "arrow", "point", "angle_arc"].includes(op.op);
}

function diagramElementBounds(
  op: Extract<LessonOp, { op: "line" | "arrow" | "point" | "angle_arc" }>,
  canvas: LayoutBox,
): LayoutBox {
  const padding = 18;
  if (op.op === "point") {
    const [x, y] = canvasPoint(op.at, canvas);
    return { x: x - padding, y: y - padding, width: padding * 2, height: padding * 2 };
  }
  if (op.op === "angle_arc") {
    const [x, y] = canvasPoint(op.center, canvas);
    const radius = op.radius * Math.min(canvas.width, canvas.height);
    return {
      x: x - radius - padding,
      y: y - radius - padding,
      width: (radius + padding) * 2,
      height: (radius + padding) * 2,
    };
  }
  const [fromX, fromY] = canvasPoint(op.from, canvas);
  const [toX, toY] = canvasPoint(op.to, canvas);
  return {
    x: Math.min(fromX, toX) - padding,
    y: Math.min(fromY, toY) - padding,
    width: Math.abs(toX - fromX) + padding * 2,
    height: Math.abs(toY - fromY) + padding * 2,
  };
}

function canvasPoint(point: readonly [number, number], canvas: LayoutBox): [number, number] {
  return [canvas.x + point[0] * canvas.width, canvas.y + point[1] * canvas.height];
}

function visibleLatexLength(latex: string): number {
  return latex
    .replace(/\\[a-zA-Z]+/g, "x")
    .replace(/[{}\\_^|]/g, "")
    .length;
}

function anchorBox(
  target: LayoutBox,
  side: "above" | "below" | "left" | "right",
  normalizedGap: number,
  size: { width: number; height: number },
): LayoutBox {
  const gap = normalizedGap * (side === "above" || side === "below" ? target.height : target.width);
  const centeredX = target.x + (target.width - size.width) / 2;
  const centeredY = target.y + (target.height - size.height) / 2;
  const candidate =
    side === "above"
      ? { x: centeredX, y: target.y - size.height - gap }
      : side === "below"
        ? { x: centeredX, y: target.y + target.height + gap }
        : side === "left"
          ? { x: target.x - size.width - gap, y: centeredY }
          : { x: target.x + target.width + gap, y: centeredY };
  return {
    x: clamp(candidate.x, PADDING, BOARD_WIDTH - PADDING - size.width),
    y: clamp(candidate.y, PADDING, BOARD_HEIGHT - PADDING - size.height),
    width: size.width,
    height: size.height,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
