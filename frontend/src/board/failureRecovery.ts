import type { LessonWarning, NormalizedLesson, NormalizedStep } from "./decode";
import type { LessonOp } from "./lesson.generated";
import type { PreparedBoard } from "./renderer";
import type {
  RecoveryFinding,
  ResolvedBoardScene,
} from "./resolvedScene.generated";

const ELEMENT_ID = /^[a-z][a-z0-9_-]{0,15}$/u;
const MAX_PENDING_FINDINGS = 4;
const MAX_TRACKED_FINDINGS = 8;

export type RecoveryFailureCode = RecoveryFinding["code"];
export type RecoveryIntent = RecoveryFinding["intent"];
export type RecoveryDisposition = "recovered" | "abandoned";

/**
 * Browser-only, already-redacted evidence. It deliberately cannot carry an
 * exception, model content, SVG, markup, or arbitrary renderer records.
 */
export interface RecoveryEvidence {
  requestId: string;
  findingId: string;
  code: RecoveryFailureCode;
  intent: RecoveryIntent;
  affectedElementIds: string[];
  affectedOpIndexes: number[];
  sourceStepId?: string;
  zone?: RecoveryFinding["neighborhood"]["zone"];
  relatedElementIds: string[];
}

export interface RecoveryOutcome {
  findingId: string;
  disposition: RecoveryDisposition;
}

/**
 * Keeps recovery append-only and bounded. A finding gets at most one recovery
 * attempt: after that attempt renders, it is either recovered or explicitly
 * abandoned. Stale request IDs cannot add or settle evidence.
 */
export class RecoveryLedger {
  private readonly pendingById = new Map<string, RecoveryEvidence>();
  private readonly outcomesById = new Map<
    string,
    { evidence: RecoveryEvidence; disposition: RecoveryDisposition }
  >();

  constructor(readonly requestId: string, initial: readonly RecoveryEvidence[] = []) {
    this.add(requestId, initial);
  }

  add(requestId: string, evidence: readonly RecoveryEvidence[]): boolean {
    if (requestId !== this.requestId) return false;
    for (const item of evidence) {
      if (
        item.requestId !== requestId ||
        this.pendingById.has(item.findingId) ||
        this.outcomesById.has(item.findingId) ||
        this.pendingById.size >= MAX_PENDING_FINDINGS ||
        this.pendingById.size + this.outcomesById.size >= MAX_TRACKED_FINDINGS
      ) {
        continue;
      }
      this.pendingById.set(item.findingId, detachedEvidence(item));
    }
    return true;
  }

  pending(sceneElements: ResolvedBoardScene["elements"]): RecoveryFinding[] {
    return this.findings(sceneElements).filter((finding) => finding.status === "pending");
  }

  findings(sceneElements: ResolvedBoardScene["elements"]): RecoveryFinding[] {
    const visibleIds = new Set(sceneElements.map((element) => element.id));
    const entries = [
      ...[...this.pendingById.values()].map((evidence) => ({
        evidence,
        status: "pending" as const,
      })),
      ...[...this.outcomesById.values()].map((outcome) => ({
        evidence: outcome.evidence,
        status: outcome.disposition,
      })),
    ];
    return entries.map(({ evidence: item, status }) => ({
      finding_id: item.findingId,
      code: item.code,
      intent: item.intent,
      status,
      affected_element_ids: [...item.affectedElementIds],
      affected_op_indexes: [...item.affectedOpIndexes],
      ...(item.sourceStepId ? { source_step_id: item.sourceStepId } : {}),
      neighborhood: {
        nearby_element_ids: item.relatedElementIds
          .filter((id) => visibleIds.has(id))
          .slice(0, 4),
        ...(item.zone ? { zone: item.zone } : {}),
      },
    }) as RecoveryFinding);
  }

  settle(
    requestId: string,
    findingIds: readonly string[],
    disposition: RecoveryDisposition,
  ): boolean {
    if (requestId !== this.requestId) return false;
    for (const findingId of findingIds) {
      const evidence = this.pendingById.get(findingId);
      if (!evidence) continue;
      this.pendingById.delete(findingId);
      this.outcomesById.set(findingId, { evidence, disposition });
    }
    return true;
  }

  abandonAll(requestId: string): boolean {
    return this.settle(requestId, [...this.pendingById.keys()], "abandoned");
  }

  pendingIds(): string[] {
    return [...this.pendingById.keys()];
  }

  outcomes(): RecoveryOutcome[] {
    return [...this.outcomesById.entries()].map(([findingId, outcome]) => ({
      findingId,
      disposition: outcome.disposition,
    }));
  }
}

export function recoveryEvidenceFromDecode(
  requestId: string,
  rawStep: unknown,
  warnings: readonly LessonWarning[],
): RecoveryEvidence[] {
  const record = isRecord(rawStep) ? rawStep : undefined;
  const sourceStepId = safeId(record?.id);
  const rawOps = Array.isArray(record?.ops) ? record.ops : [];
  const opsById = new Map<string, Record<string, unknown>>();
  for (const candidate of rawOps) {
    if (!isRecord(candidate)) continue;
    const id = safeId(candidate.id);
    if (id) opsById.set(id, candidate);
  }

  const evidence = warnings.flatMap((warning, warningIndex) => {
    const code = decodeFailureCode(warning.code);
    if (!code) return [];
    const op = warning.opId ? opsById.get(warning.opId) : undefined;
    const affectedOpIndexes = warning.opId
      ? rawOps.flatMap((candidate, index) =>
        isRecord(candidate) && candidate.id === warning.opId ? [index] : [])
      : rawOps.map((_candidate, index) => index).slice(0, 4);
    const affectedElementIds = code === "browser_duplicate_id"
      ? []
      : warning.opId && ELEMENT_ID.test(warning.opId)
        ? [warning.opId]
        : rawOps.flatMap((candidate) => {
        const id = isRecord(candidate) ? safeId(candidate.id) : undefined;
        return id ? [id] : [];
      }).slice(0, 4);
    const intent = intentOf(op);
    const neighborhood = neighborhoodOf(op);
    const identity = [
      requestId,
      sourceStepId ?? "step",
      warningIndex,
      code,
      intent,
      ...affectedElementIds,
    ].join(":");
    return [{
      requestId,
      findingId: `rf_${stableHex(identity)}`,
      code,
      intent,
      affectedElementIds,
      affectedOpIndexes,
      ...(sourceStepId ? { sourceStepId } : {}),
      ...neighborhood,
    }];
  });
  const hasSpecificOpFailure = evidence.some((item) => item.code !== "browser_invalid_step");
  return evidence
    .filter((item) => !hasSpecificOpFailure || item.code !== "browser_invalid_step")
    .slice(0, MAX_PENDING_FINDINGS);
}

export function recoveryEvidenceFromRenderer(
  requestId: string,
  lesson: NormalizedLesson,
  prepared: PreparedBoard,
): RecoveryEvidence[] {
  const opIndex = indexOps(lesson.steps);
  return prepared.build.warnings.flatMap((warning) => {
    if (!ELEMENT_ID.test(warning.id)) return [];
    const found = opIndex.get(warning.id);
    if (!found) return [];
    const neighborhood = neighborhoodOf(found.op as unknown as Record<string, unknown>);
    return [{
      requestId,
      findingId: `rf_${stableHex(`${requestId}:${found.stepId}:${warning.id}:renderer`)}`,
      code: "renderer_geometry_failed" as const,
      intent: intentOf(found.op as unknown as Record<string, unknown>),
      affectedElementIds: [warning.id],
      affectedOpIndexes: [found.opIndex],
      sourceStepId: found.stepId,
      ...neighborhood,
    }];
  }).slice(0, MAX_PENDING_FINDINGS);
}

export function stepUsesUnavailableRecoveryId(
  step: NormalizedStep,
  findings: readonly RecoveryFinding[],
): boolean {
  const unavailable = new Set(findings.flatMap((finding) => finding.affected_element_ids));
  if (unavailable.size === 0) return false;
  return containsUnavailableStructuredValue(step, unavailable, undefined);
}

function containsUnavailableStructuredValue(
  value: unknown,
  unavailable: ReadonlySet<string>,
  key: string | undefined,
): boolean {
  if (typeof value === "string") {
    return !CONTENT_KEYS.has(key ?? "") && unavailable.has(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsUnavailableStructuredValue(item, unavailable, key));
  }
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([childKey, child]) =>
    containsUnavailableStructuredValue(child, unavailable, childKey),
  );
}

const CONTENT_KEYS = new Set([
  "script",
  "content",
  "latex",
  "label",
  "meaning",
  "question",
  "expected_gist",
]);

function decodeFailureCode(code: LessonWarning["code"]): RecoveryFailureCode | undefined {
  switch (code) {
    case "invalid_step": return "browser_invalid_step";
    case "invalid_op": return "browser_invalid_op";
    case "duplicate_id": return "browser_duplicate_id";
    case "unknown_reference": return "browser_unknown_reference";
    case "invalid_expression": return "browser_invalid_expression";
    case "invalid_equation": return "browser_invalid_equation";
    case "invalid_axes": return "browser_invalid_axes";
    default: return undefined;
  }
}

function intentOf(op: Record<string, unknown> | undefined): RecoveryIntent {
  const kind = op?.op;
  return isRecoveryIntent(kind) ? kind : "step";
}

function isRecoveryIntent(value: unknown): value is RecoveryIntent {
  return typeof value === "string" && RECOVERY_INTENTS.has(value as RecoveryIntent);
}

const RECOVERY_INTENTS = new Set<RecoveryIntent>([
  "step",
  "text",
  "equation",
  "sketch",
  "axes",
  "curve",
  "diagram",
  "line",
  "arrow",
  "point",
  "angle_arc",
]);

function neighborhoodOf(op: Record<string, unknown> | undefined): {
  zone?: RecoveryEvidence["zone"];
  relatedElementIds: string[];
} {
  if (!op) return { relatedElementIds: [] };
  const region = typeof op.region === "string" && isZone(op.region) ? op.region : undefined;
  const related = new Set<string>();
  for (const candidate of [
    isRecord(op.anchor) ? op.anchor.el : undefined,
    op.axes_id,
    op.canvas_id,
  ]) {
    const id = safeId(candidate);
    if (id) related.add(id);
  }
  return {
    ...(region ? { zone: region } : {}),
    relatedElementIds: [...related].slice(0, 4),
  };
}

function isZone(value: string): value is NonNullable<RecoveryEvidence["zone"]> {
  return /^(?:[A-D][1-3]|left|right|full)$/u.test(value);
}

function indexOps(
  steps: readonly NormalizedStep[],
): Map<string, { stepId: string; op: LessonOp; opIndex: number }> {
  const result = new Map<string, { stepId: string; op: LessonOp; opIndex: number }>();
  for (const step of steps) {
    for (const [opIndex, op] of step.ops.entries()) {
      result.set(op.id, { stepId: step.id, op, opIndex });
    }
  }
  return result;
}

function detachedEvidence(item: RecoveryEvidence): RecoveryEvidence {
  return {
    ...item,
    affectedElementIds: [...item.affectedElementIds].filter((id) => ELEMENT_ID.test(id)).slice(0, 4),
    affectedOpIndexes: [...new Set(item.affectedOpIndexes)]
      .filter((index) => Number.isInteger(index) && index >= 0 && index <= 3)
      .slice(0, 4),
    relatedElementIds: [...item.relatedElementIds].filter((id) => ELEMENT_ID.test(id)).slice(0, 4),
  };
}

function safeId(value: unknown): string | undefined {
  return typeof value === "string" && ELEMENT_ID.test(value) ? value : undefined;
}

function stableHex(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
