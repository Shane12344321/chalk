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
  const result: LaidOutOp[] = [];
  const boxes = new Map<string, LayoutBox>();
  const regionCounts = new Map<Region, number>();
  const regionIndexes = new Map<Region, number>();
  for (const step of steps) {
    for (const op of step.ops) {
      if ("region" in op) regionCounts.set(op.region, (regionCounts.get(op.region) ?? 0) + 1);
    }
  }

  steps.forEach((step, stepIndex) => {
    step.ops.forEach((op, opIndex) => {
      let box: LayoutBox;
      if (op.op === "curve") {
        const axesBox = boxes.get(op.axes_id);
        if (!axesBox) throw new Error(`Missing axes layout for ${op.id}.`);
        box = axesBox;
      } else if ("anchor" in op) {
        const target = boxes.get(op.anchor.el);
        if (!target) throw new Error(`Missing anchor layout for ${op.id}.`);
        box = anchorBox(target, op.anchor.side, op.anchor.gap ?? 0.08, intrinsicSize(op));
      } else {
        const region = op.region;
        const boundary = regionBox(region);
        const count = regionCounts.get(region) ?? 1;
        const index = regionIndexes.get(region) ?? 0;
        const availableHeight = boundary.height - 36;
        const gap = Math.min(16, availableHeight / Math.max(1, count * 3));
        const slotHeight = (availableHeight - gap * (count - 1)) / count;
        const size = intrinsicSize(op);
        box = {
          x: boundary.x + 20,
          y: boundary.y + 18 + index * (slotHeight + gap),
          width: Math.min(size.width, boundary.width - 40),
          height: Math.min(size.height, slotHeight),
        };
        regionIndexes.set(region, index + 1);
      }
      boxes.set(op.id, box);
      result.push({ op, box, stepIndex, opIndex });
    });
  });
  return result;
}

function intrinsicSize(op: LessonOp): { width: number; height: number } {
  switch (op.op) {
    case "axes":
      return { width: 700, height: 430 };
    case "sketch":
      return { width: 318, height: 190 };
    case "equation":
      return { width: 310, height: 92 };
    case "text":
      return { width: 310, height: 64 };
    case "curve":
      return { width: 0, height: 0 };
  }
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
