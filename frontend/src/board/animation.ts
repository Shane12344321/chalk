import type { LessonOp } from "./lesson.generated";

export function opWeight(op: LessonOp): number {
  switch (op.op) {
    case "sketch":
      return 3;
    case "axes":
    case "curve":
      return 2;
    case "text":
    case "equation":
      return 1;
  }
}

export function opProgress(
  ops: readonly LessonOp[],
  opIndex: number,
  stepProgress: number,
): number {
  const weights = ops.map(opWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const before = weights.slice(0, opIndex).reduce((sum, weight) => sum + weight, 0);
  const own = weights[opIndex] ?? 1;
  return clamp((clamp(stepProgress) * total - before) / own);
}

export function estimateNarrationDuration(script: string): number {
  const words = script.trim().split(/\s+/u).filter(Boolean).length;
  return Math.min(12_000, Math.max(3_000, words * 400));
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
