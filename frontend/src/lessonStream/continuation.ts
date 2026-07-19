import type { NormalizedStep } from "../board/decode";
import type { ResolvedBoardScene } from "../board/resolvedScene.generated";
import type { LessonPlan } from "./lessonPlan.generated";
import { decodeStep, createDecodeContext } from "../board/decode";
import type { TerminalReason } from "./continuation.generated";
import type { LessonStep } from "./stream.generated";
import {
  isLessonContinuationRequest,
  isLessonContinuationResponse,
  lessonContinuationSchemaErrors,
} from "./continuationSchema";
import {
  recoveryEvidenceFromDecode,
  stepUsesUnavailableRecoveryId,
  type RecoveryEvidence,
} from "../board/failureRecovery";

export interface ContinueLessonRequest {
  requestId: string;
  clientId: string;
  topic: string;
  studentContext: string;
  acceptedPrefix: NormalizedStep[];
  receiptPrefix: Array<LessonStep | NormalizedStep>;
  plan: LessonPlan;
  resolvedScene: ResolvedBoardScene;
  repairsUsed: number;
  continuationReceipt: string;
}

interface ContinuationMetadata {
  boardModel: string;
  boardReasoningEffort: "none" | "low";
  boardPromptSha256: string;
  repairPromptSha256: string;
  continuationPromptSha256: string;
  configurationSha256: string;
}

export type ContinueLessonResult =
  | ({ done: true; reason: TerminalReason; repairs: number } & ContinuationMetadata)
  | ({
    done: false;
    browserDropped: false;
    step: NormalizedStep;
    receiptStep: LessonStep;
    recoveryEvidence: RecoveryEvidence[];
    repairs: number;
    sanitizedFields: number;
    continuationReceipt: string;
  } & ContinuationMetadata)
  | ({
    done: false;
    browserDropped: true;
    receiptStep: LessonStep;
    recoveryEvidence: RecoveryEvidence[];
    repairs: number;
    sanitizedFields: number;
    continuationReceipt: string;
  } & ContinuationMetadata);

/**
 * Advance the authenticated server prefix without rebuilding any earlier step
 * from the browser-filtered accepted prefix. Earlier raw steps are part of the
 * receipt's HMAC state even when the browser accepted only a safe projection.
 */
export class LessonContinuationClient {
  private controller?: AbortController;
  private requestToken = 0;

  constructor(
    private readonly apiBaseUrl: string,
    private readonly clientId: string,
    private readonly fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}

  async next(
    request: Omit<ContinueLessonRequest, "clientId">,
  ): Promise<ContinueLessonResult> {
    this.controller?.abort();
    const controller = new AbortController();
    const requestToken = ++this.requestToken;
    this.controller = controller;
    const wireRequest: unknown = {
      request_id: request.requestId,
      client_id: this.clientId,
      topic: request.topic,
      student_context: request.studentContext,
      prefix_version: request.acceptedPrefix.length,
      accepted_prefix: request.acceptedPrefix,
      receipt_prefix: request.receiptPrefix,
      plan: request.plan,
      resolved_scene: request.resolvedScene,
      repairs_used: request.repairsUsed,
      continuation_receipt: request.continuationReceipt,
    };
    if (!isLessonContinuationRequest(wireRequest)) {
      throw new Error(
        `Lesson continuation request failed its shared contract: ${lessonContinuationSchemaErrors("request").join("; ")}`,
      );
    }
    const response = await this.fetchImpl(
      `${this.apiBaseUrl.replace(/\/$/u, "")}/lesson/continue`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify(wireRequest),
      },
    );
    this.assertCurrent(requestToken, controller);
    if (!response.ok) throw new Error("Lesson continuation request failed.");
    const value: unknown = await response.json();
    this.assertCurrent(requestToken, controller);
    if (!isLessonContinuationResponse(value)) {
      throw new Error(
        `Lesson continuation response failed its shared contract: ${lessonContinuationSchemaErrors("response").join("; ")}`,
      );
    }
    if (
      value.request_id !== request.requestId ||
      value.prefix_version !== request.acceptedPrefix.length ||
      value.repairs < request.repairsUsed
    ) {
      throw new Error("Lesson continuation response identity or budget does not match its request.");
    }
    const metadata = {
      boardModel: value.board_model,
      boardReasoningEffort: value.board_reasoning_effort,
      boardPromptSha256: value.board_prompt_sha256,
      repairPromptSha256: value.repair_prompt_sha256,
      continuationPromptSha256: value.continuation_prompt_sha256,
      configurationSha256: value.configuration_sha256,
    };
    if (value.done) {
      this.assertCurrent(requestToken, controller);
      return { done: true, reason: value.reason, repairs: value.repairs, ...metadata };
    }
    const context = createDecodeContext();
    for (const step of request.acceptedPrefix) {
      if (!decodeStep(step, context).step) throw new Error("Accepted prefix replay failed.");
    }
    const decoded = decodeStep(value.step, context);
    const recoveryEvidence = recoveryEvidenceFromDecode(
      request.requestId,
      value.step,
      decoded.warnings,
    );
    if (!decoded.step) {
      if (recoveryEvidence.length === 0) {
        throw new Error("Continued step failed browser validation without closed evidence.");
      }
      this.assertCurrent(requestToken, controller);
      return {
        done: false,
        browserDropped: true,
        receiptStep: value.step,
        recoveryEvidence,
        repairs: value.repairs,
        sanitizedFields: value.sanitized_fields,
        continuationReceipt: value.continuation_receipt,
        ...metadata,
      };
    }
    if (
      stepUsesUnavailableRecoveryId(
        decoded.step,
        request.resolvedScene.recovery_findings ?? [],
      )
    ) {
      throw new Error("Continued step reused or referenced unavailable visual output.");
    }
    this.assertCurrent(requestToken, controller);
    return {
      done: false,
      browserDropped: false,
      step: decoded.step,
      receiptStep: value.step,
      recoveryEvidence,
      repairs: value.repairs,
      sanitizedFields: value.sanitized_fields,
      continuationReceipt: value.continuation_receipt,
      ...metadata,
    };
  }

  cancel(): void {
    this.controller?.abort();
    this.requestToken += 1;
    this.controller = undefined;
  }

  private assertCurrent(requestToken: number, controller: AbortController): void {
    if (
      requestToken !== this.requestToken ||
      controller !== this.controller ||
      controller.signal.aborted
    ) {
      throw new DOMException("Lesson continuation was superseded.", "AbortError");
    }
  }
}
