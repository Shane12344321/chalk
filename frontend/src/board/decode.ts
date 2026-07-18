import { sampleVisibleCurveSegments } from "./expression";
import { renderSafeLatex } from "./latex";
import type { Checkpoint, LessonOp } from "./lesson.generated";
import {
  ELEMENT_ID_PATTERN,
  LESSON_SCRIPT_MAX_LENGTH,
  isLessonOp,
  lessonOpSchemaErrors,
} from "./schema";
import { sanitizeStep } from "./sanitize";

export interface NormalizedStep {
  id: string;
  script: string;
  ops: LessonOp[];
  checkpoint: Checkpoint | null;
}

export interface NormalizedLesson {
  schemaVersion: "1.0" | "1.1";
  title: string;
  steps: NormalizedStep[];
}

export interface LessonWarning {
  code:
    | "invalid_lesson"
    | "invalid_step"
    | "invalid_op"
    | "duplicate_id"
    | "unknown_reference"
    | "invalid_expression"
    | "invalid_equation"
    | "invalid_axes"
    | "sanitized_step";
  stepId?: string;
  opId?: string;
  detail: string;
}

export interface DecodeResult {
  lesson?: NormalizedLesson;
  warnings: LessonWarning[];
}

export interface DecodeContext {
  acceptedIds: Map<string, LessonOp>;
  acceptedStepIds: Set<string>;
}

export interface DecodeStepResult {
  step?: NormalizedStep;
  warnings: LessonWarning[];
}

export function createDecodeContext(): DecodeContext {
  return { acceptedIds: new Map(), acceptedStepIds: new Set() };
}

export function decodeStep(rawStep: unknown, context: DecodeContext): DecodeStepResult {
  const warnings: LessonWarning[] = [];
  const sanitization = sanitizeStep(rawStep);
  rawStep = sanitization.value;
  if (sanitization.correctionCount > 0) {
    warnings.push(
      warning(
        "sanitized_step",
        `Applied ${sanitization.correctionCount} safe correction(s): ${sanitization.corrections.join(", ")}.`,
        isRecord(rawStep) && typeof rawStep.id === "string" ? rawStep.id : undefined,
      ),
    );
  }
  if (!isRecord(rawStep)) {
    warnings.push(warning("invalid_step", "Step must be an object."));
    return { warnings };
  }
  const stepId = typeof rawStep.id === "string" ? rawStep.id : undefined;
  if (
    !stepId ||
    !ELEMENT_ID_PATTERN.test(stepId) ||
    context.acceptedStepIds.has(stepId) ||
    typeof rawStep.script !== "string" ||
    rawStep.script.length > LESSON_SCRIPT_MAX_LENGTH ||
    countWords(rawStep.script) > 30 ||
    countWords(rawStep.script) === 0 ||
    !Array.isArray(rawStep.ops) ||
    rawStep.ops.length === 0 ||
    rawStep.ops.length > 4 ||
    !isCheckpoint(rawStep.checkpoint)
  ) {
    warnings.push(
      warning("invalid_step", "Step shape, ID, script, or op budget is invalid.", stepId),
    );
    return { warnings };
  }

  const ops: LessonOp[] = [];
  for (const rawOp of rawStep.ops) {
    if (!isLessonOp(rawOp)) {
      warnings.push(
        warning(
          "invalid_op",
          lessonOpSchemaErrors().join("; ") || "Operation does not match the shared schema.",
          stepId,
          opIdOf(rawOp),
        ),
      );
      continue;
    }
    const issue = validateSemanticOp(rawOp, context.acceptedIds);
    if (issue) {
      warnings.push(warning(issue.code, issue.detail, stepId, rawOp.id));
      continue;
    }
    context.acceptedIds.set(rawOp.id, rawOp);
    ops.push(rawOp);
  }

  if (ops.length === 0) {
    warnings.push(warning("invalid_step", "No valid operations remain in this step.", stepId));
    return { warnings };
  }
  context.acceptedStepIds.add(stepId);
  return {
    step: {
      id: stepId,
      script: rawStep.script,
      ops,
      checkpoint: rawStep.checkpoint,
    },
    warnings,
  };
}

export function decodeLesson(value: unknown): DecodeResult {
  const warnings: LessonWarning[] = [];
  if (
    !isRecord(value) ||
    !["1.0", "1.1"].includes(String(value.schema_version))
  ) {
    return { warnings: [warning("invalid_lesson", "Unsupported or missing schema version.")] };
  }
  if (
    typeof value.title !== "string" ||
    value.title.length === 0 ||
    value.title.length > 80 ||
    !Array.isArray(value.steps) ||
    value.steps.length === 0 ||
    value.steps.length > 8
  ) {
    return { warnings: [warning("invalid_lesson", "Lesson header or step budget is invalid.")] };
  }

  const context = createDecodeContext();
  const steps: NormalizedStep[] = [];
  for (const rawStep of value.steps) {
    const result = decodeStep(rawStep, context);
    warnings.push(...result.warnings);
    if (result.step) steps.push(result.step);
  }

  if (steps.length === 0) {
    warnings.push(warning("invalid_lesson", "No valid lesson steps remain."));
    return { warnings };
  }
  return {
    lesson: {
      schemaVersion: value.schema_version as "1.0" | "1.1",
      title: value.title,
      steps,
    },
    warnings,
  };
}

function validateSemanticOp(
  op: LessonOp,
  acceptedIds: ReadonlyMap<string, LessonOp>,
): { code: LessonWarning["code"]; detail: string } | undefined {
  if (acceptedIds.has(op.id)) {
    return { code: "duplicate_id", detail: `Element ID ${op.id} is already accepted.` };
  }
  if ("anchor" in op && !acceptedIds.has(op.anchor.el)) {
    return { code: "unknown_reference", detail: `Anchor ${op.anchor.el} is not visible.` };
  }
  if ("canvas_id" in op) {
    const canvas = acceptedIds.get(op.canvas_id);
    if (!canvas || !isDiagramOp(canvas)) {
      return {
        code: "unknown_reference",
        detail: `Diagram canvas ${op.canvas_id} is not accepted.`,
      };
    }
  }
  if ((op.op === "line" || op.op === "arrow") && pointsEqual(op.from, op.to)) {
    return { code: "invalid_op", detail: "Line endpoints must differ." };
  }
  if (op.op === "angle_arc" && Math.abs(op.end_deg - op.start_deg) < 1) {
    return { code: "invalid_op", detail: "Angle arc must span at least one degree." };
  }
  if (op.op === "axes" && (op.x.min >= op.x.max || op.y.min >= op.y.max)) {
    return { code: "invalid_axes", detail: "Axis minima must be lower than maxima." };
  }
  if (op.op === "curve") {
    const axes = acceptedIds.get(op.axes_id);
    if (axes?.op !== "axes") {
      return { code: "unknown_reference", detail: `Axes ${op.axes_id} is not accepted.` };
    }
    const domain = op.domain;
    if (domain && domain[0] >= domain[1]) {
      return { code: "invalid_expression", detail: "Curve domain must increase." };
    }
    try {
      if (sampleVisibleCurveSegments(op, axes).length === 0) {
        throw new Error("Curve has fewer than two contiguous visible samples.");
      }
    } catch (error) {
      return { code: "invalid_expression", detail: messageOf(error) };
    }
  }
  if (op.op === "equation") {
    try {
      renderSafeLatex(op.latex);
    } catch (error) {
      return { code: "invalid_equation", detail: messageOf(error) };
    }
  }
  return undefined;
}

function isDiagramOp(op: LessonOp): boolean {
  return ["line", "arrow", "point", "angle_arc"].includes(op.op);
}

function pointsEqual(left: readonly number[], right: readonly number[]): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function isCheckpoint(value: unknown): value is Checkpoint | null {
  if (value === null) return true;
  return (
    isRecord(value) &&
    typeof value.question === "string" &&
    value.question.length > 0 &&
    value.question.length <= 120 &&
    typeof value.expected_gist === "string" &&
    value.expected_gist.length > 0 &&
    value.expected_gist.length <= 80 &&
    Object.keys(value).every((key) => key === "question" || key === "expected_gist")
  );
}

function countWords(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function opIdOf(value: unknown): string | undefined {
  return isRecord(value) && typeof value.id === "string" ? value.id : undefined;
}

function warning(
  code: LessonWarning["code"],
  detail: string,
  stepId?: string,
  opId?: string,
): LessonWarning {
  return { code, detail, ...(stepId ? { stepId } : {}), ...(opId ? { opId } : {}) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Operation validation failed.";
}
