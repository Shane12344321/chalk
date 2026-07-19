import type { NormalizedStep } from "./decode";
import { regionBox } from "./layout";
import {
  type MeasurableRoot,
  type MeasurementBatch,
  PrecommitMeasurementCache,
} from "./precommitMeasurement";

const REGION_INLINE_PADDING = 40;
const ANCHORED_MAX_WIDTH = 700;

export function measurableRootsForSteps(
  steps: readonly NormalizedStep[],
): MeasurableRoot[] {
  const roots: MeasurableRoot[] = [];
  for (const step of steps) {
    for (const op of step.ops) {
      if (op.op !== "text" && op.op !== "equation") continue;
      const maxWidth = "region" in op
        ? Math.max(1, regionBox(op.region).width - REGION_INLINE_PADDING)
        : ANCHORED_MAX_WIDTH;
      roots.push({
        id: op.id,
        kind: op.op,
        content: op.op === "text" ? op.content : op.latex,
        maxWidth,
      });
    }
  }
  return roots;
}

export function premeasureLessonRoots(
  cache: PrecommitMeasurementCache,
  steps: readonly NormalizedStep[],
): MeasurementBatch {
  return cache.measure(measurableRootsForSteps(steps));
}
