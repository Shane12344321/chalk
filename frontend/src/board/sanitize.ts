export type SanitizationCode =
  | "trimmed_outer_whitespace"
  | "normalized_power_operator"
  | "clamped_anchor_gap"
  | "clamped_normalized_point";

export interface SanitizationResult {
  value: unknown;
  corrections: SanitizationCode[];
  correctionCount: number;
}

export const SANITIZER_CLAMP_TOLERANCE = 0.05;
export const MAX_RECORDED_SANITIZER_CORRECTIONS = 64;

const STRING_FIELDS = new Set([
  "op",
  "id",
  "script",
  "content",
  "latex",
  "expr",
  "label",
  "axes_id",
  "canvas_id",
  "region",
  "stroke",
  "side",
  "el",
  "question",
  "expected_gist",
]);

class Recorder {
  readonly corrections: SanitizationCode[] = [];
  count = 0;

  add(code: SanitizationCode): void {
    this.count = Math.min(MAX_RECORDED_SANITIZER_CORRECTIONS, this.count + 1);
    if (!this.corrections.includes(code)) this.corrections.push(code);
  }
}

export function sanitizeStep(value: unknown): SanitizationResult {
  const sanitized = cloneJson(value);
  const recorder = new Recorder();
  if (!isRecord(sanitized)) {
    return { value: sanitized, corrections: [], correctionCount: 0 };
  }

  trimMappingStrings(sanitized, recorder);
  if (isRecord(sanitized.checkpoint)) trimMappingStrings(sanitized.checkpoint, recorder);

  if (Array.isArray(sanitized.ops)) {
    for (const op of sanitized.ops) {
      if (!isRecord(op)) continue;
      trimMappingStrings(op, recorder);
      if (isRecord(op.anchor)) {
        trimMappingStrings(op.anchor, recorder);
        if ("gap" in op.anchor) {
          op.anchor.gap = clampNearUnitInterval(op.anchor.gap, "clamped_anchor_gap", recorder);
        }
      }
      for (const axisName of ["x", "y"] as const) {
        if (isRecord(op[axisName])) trimMappingStrings(op[axisName], recorder);
      }
      if (typeof op.expr === "string" && op.expr.includes("**")) {
        op.expr = op.expr.replaceAll("**", "^");
        recorder.add("normalized_power_operator");
      }
      sanitizeNormalizedPoints(op, recorder);
    }
  }

  return {
    value: sanitized,
    corrections: recorder.corrections,
    correctionCount: recorder.count,
  };
}

function trimMappingStrings(value: Record<string, unknown>, recorder: Recorder): void {
  for (const [key, current] of Object.entries(value)) {
    if (!STRING_FIELDS.has(key) || typeof current !== "string") continue;
    const trimmed = current.trim();
    if (trimmed !== current) {
      value[key] = trimmed;
      recorder.add("trimmed_outer_whitespace");
    }
  }
}

function sanitizeNormalizedPoints(op: Record<string, unknown>, recorder: Recorder): void {
  for (const key of ["from", "to", "at", "center"] as const) {
    if (Array.isArray(op[key])) sanitizePoint(op[key], recorder);
  }
  if (!Array.isArray(op.strokes)) return;
  for (const stroke of op.strokes) {
    if (!Array.isArray(stroke)) continue;
    for (const point of stroke) {
      if (Array.isArray(point)) sanitizePoint(point, recorder);
    }
  }
}

function sanitizePoint(point: unknown[], recorder: Recorder): void {
  for (let index = 0; index < point.length; index += 1) {
    point[index] = clampNearUnitInterval(point[index], "clamped_normalized_point", recorder);
  }
}

function clampNearUnitInterval(
  value: unknown,
  code: "clamped_anchor_gap" | "clamped_normalized_point",
  recorder: Recorder,
): unknown {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  if (value >= -SANITIZER_CLAMP_TOLERANCE && value < 0) {
    recorder.add(code);
    return 0;
  }
  if (value > 1 && value <= 1 + SANITIZER_CLAMP_TOLERANCE) {
    recorder.add(code);
    return 1;
  }
  return value;
}

function cloneJson(value: unknown): unknown {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
