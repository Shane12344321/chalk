import type { BoardGeometry, BoardLabel } from "./geometry";
import { BOARD_HEIGHT, BOARD_WIDTH, type LayoutBox } from "./layout";
import { fitBoardText } from "./textLayout";

export type LayoutLintCode =
  | "label_overlap"
  | "label_out_of_bounds"
  | "text_overflow";

export interface LayoutLintIssue {
  code: LayoutLintCode;
  elementIds: string[];
}

const LABEL_FONT_SIZE = 24;
const LABEL_CHARACTER_WIDTH = LABEL_FONT_SIZE * 0.6;
const LABEL_HEIGHT = LABEL_FONT_SIZE * 1.2;
const MATERIAL_OVERLAP_RATIO = 0.15;
const BOUNDARY_TOLERANCE = 4;

export function lintBoardGeometry(
  geometries: readonly BoardGeometry[],
): LayoutLintIssue[] {
  const issues: LayoutLintIssue[] = [];
  const labels = geometries.flatMap((geometry) =>
    geometry.labels.map((label) => ({
      elementId: geometry.id,
      box: labelBox(label),
      boundary: geometry.canvasBox ?? boardBoundary(),
    })),
  );

  for (let left = 0; left < labels.length; left += 1) {
    const label = labels[left];
    if (!containsWithTolerance(label.boundary, label.box)) {
      issues.push({ code: "label_out_of_bounds", elementIds: [label.elementId] });
    }
    for (let right = left + 1; right < labels.length; right += 1) {
      const other = labels[right];
      if (overlapRatio(label.box, other.box) > MATERIAL_OVERLAP_RATIO) {
        issues.push({
          code: "label_overlap",
          elementIds: [label.elementId, other.elementId],
        });
      }
    }
  }

  for (const geometry of geometries) {
    if (geometry.text && !fitBoardText(geometry.text, geometry.box).fits) {
      issues.push({ code: "text_overflow", elementIds: [geometry.id] });
    }
  }

  return issues;
}

function labelBox(label: BoardLabel): LayoutBox {
  const width = Math.max(LABEL_CHARACTER_WIDTH, label.text.length * LABEL_CHARACTER_WIDTH);
  const x = label.anchor === "middle"
    ? label.x - width / 2
    : label.anchor === "end"
      ? label.x - width
      : label.x;
  return {
    x,
    y: label.y - LABEL_FONT_SIZE,
    width,
    height: LABEL_HEIGHT,
  };
}

function boardBoundary(): LayoutBox {
  return { x: 0, y: 0, width: BOARD_WIDTH, height: BOARD_HEIGHT };
}

function containsWithTolerance(boundary: LayoutBox, box: LayoutBox): boolean {
  return (
    box.x >= boundary.x - BOUNDARY_TOLERANCE &&
    box.y >= boundary.y - BOUNDARY_TOLERANCE &&
    box.x + box.width <= boundary.x + boundary.width + BOUNDARY_TOLERANCE &&
    box.y + box.height <= boundary.y + boundary.height + BOUNDARY_TOLERANCE
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
