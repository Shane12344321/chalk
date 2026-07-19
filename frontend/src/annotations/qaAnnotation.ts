import type { VisibleBoardState } from "../board/manifest";
import type { QaAnnotationMark } from "../realtime/toolRouter";
import type { LessonPhase } from "../sync/reducer";
import type { AnnotationProgram, Op } from "./annotation.generated";
import { isAnnotationProgram } from "./schema";

export type QaAnnotationBuildResult =
  | { ok: true; program: AnnotationProgram }
  | { ok: false; reason: "not_in_qa" | "empty_board" | "unknown_element" | "invalid_program" };

export function buildQaAnnotationProgram(
  marks: readonly QaAnnotationMark[],
  phase: LessonPhase,
  visible: VisibleBoardState,
  requestId = crypto.randomUUID(),
): QaAnnotationBuildResult {
  if (phase !== "QA") return { ok: false, reason: "not_in_qa" };
  if (visible.version < 1 || visible.elements.length === 0) {
    return { ok: false, reason: "empty_board" };
  }
  if (marks.length < 1 || marks.length > 2) {
    return { ok: false, reason: "invalid_program" };
  }
  const allowedTargets = new Set(visible.elements.map((element) => element.id));
  if (marks.some((mark) => !allowedTargets.has(mark.target_id))) {
    return { ok: false, reason: "unknown_element" };
  }
  const ops = marks.map((mark, index): Op => {
    const id = annotationId(requestId, index);
    if (mark.kind === "circle" || mark.kind === "underline") {
      return { op: mark.kind, id, target_id: mark.target_id };
    }
    if (mark.kind === "arrow") {
      return { op: "arrow", id, target_id: mark.target_id, side: mark.side };
    }
    if (mark.kind === "text") {
      return {
        op: "text",
        id,
        target_id: mark.target_id,
        side: mark.side,
        content: mark.content.trim(),
      };
    }
    if (mark.kind === "equation") {
      return {
        op: "equation",
        id,
        target_id: mark.target_id,
        side: mark.side,
        latex: mark.latex.trim(),
      };
    }
    throw new Error("Unsupported Q&A annotation mark.");
  });
  const candidate: unknown = {
    schema_version: "1.0",
    request_id: requestId,
    manifest_version: visible.version,
    ops,
  };
  return isAnnotationProgram(candidate) && candidate.ops.length <= 2
    ? { ok: true, program: candidate }
    : { ok: false, reason: "invalid_program" };
}

function annotationId(requestId: string, index: number): string {
  const compact = requestId.replaceAll("-", "").toLowerCase();
  return `q${compact.slice(index * 6, index * 6 + 12)}`;
}
