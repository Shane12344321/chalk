import type {
  RunIdentity,
  SentenceResponseTrial,
  SentenceSegment,
} from "./phase6SyncEvidence.generated";
import { verifySentenceResponseTrial } from "./phase6SyncEvidence";

export type Phase6SentenceMode = "single_response" | "per_sentence";
export type SentenceLifecycleStage = "activity" | "generation_done" | "playback_stopped";
export type SentenceDispatchOutcome = "completed" | "response_failed" | "interrupted";

export interface Phase6SentencePlan {
  schema: "chalk.phase6-sentence-plan.v1";
  experimentId: string;
  runId: string;
  identity: RunIdentity;
  mode: Phase6SentenceMode;
  segments: readonly string[];
  responseCallCeiling: number;
}

export interface SentenceDispatchRequest {
  /** Ephemeral cached script content. Evidence retains only identity.script_sha256. */
  script: string;
  index: number;
  signal: AbortSignal;
  onLifecycle: (stage: SentenceLifecycleStage) => boolean;
}

export type SentenceResponseDispatcher = (
  request: SentenceDispatchRequest,
) => Promise<{ outcome: SentenceDispatchOutcome }>;

export interface RunPhase6SentenceTrialOptions {
  signal: AbortSignal;
  /** A superseded run becomes stale even when an injected dispatcher ignores abort. */
  isCurrent: () => boolean;
  dispatch: SentenceResponseDispatcher;
  now?: () => number;
  hashText?: (value: string) => Promise<string>;
}

export interface PreparePhase6SentencePlanOptions {
  experimentId: string;
  runId: string;
  cachedLessonId: RunIdentity["cached_lesson_id"];
  stepId: string;
  script: string;
  model: string;
  voice: RunIdentity["voice"];
  browserLabel: string;
  mode: Phase6SentenceMode;
}

const SAFE_ID = /^[a-z][a-z0-9-]{2,47}$/u;
const STEP_ID = /^[a-z][a-z0-9_-]{0,15}$/u;
const MODEL = /^gpt-realtime-[a-z0-9.-]{1,31}$/u;
const BROWSER = /^[a-z0-9][a-z0-9._-]{2,47}$/u;
const MAX_SCRIPT_CHARACTERS = 240;
const MAX_SENTENCES = 5;

/**
 * Pins the exact normalized cached script before any dispatcher can be invoked.
 * No caller-provided hash is accepted, so evidence cannot be relabelled after a run.
 */
export async function preparePhase6SentencePlan(
  options: PreparePhase6SentencePlanOptions,
  hashText: (value: string) => Promise<string> = sha256Text,
): Promise<Phase6SentencePlan> {
  if (!SAFE_ID.test(options.experimentId) || !SAFE_ID.test(options.runId)) {
    throw new Error("Phase-6 experiment or run ID is outside its closed contract.");
  }
  if (!STEP_ID.test(options.stepId)) {
    throw new Error("Phase-6 cached step ID is outside the lesson contract.");
  }
  if (!MODEL.test(options.model) || !BROWSER.test(options.browserLabel)) {
    throw new Error("Phase-6 session identity is outside its closed contract.");
  }
  const normalized = normalizeScript(options.script);
  const sentences = splitSentences(normalized);
  if (options.mode === "per_sentence" && (sentences.length < 2 || sentences.length > MAX_SENTENCES)) {
    throw new Error("Per-sentence comparison requires two to five complete sentences.");
  }
  const scriptSha256 = await hashText(normalized);
  if (!/^[a-f0-9]{64}$/u.test(scriptSha256)) {
    throw new Error("Phase-6 script hash provider did not return SHA-256 hex.");
  }
  const segments = options.mode === "single_response" ? [normalized] : sentences;
  return {
    schema: "chalk.phase6-sentence-plan.v1",
    experimentId: options.experimentId,
    runId: options.runId,
    identity: {
      cached_lesson_id: options.cachedLessonId,
      step_id: options.stepId,
      script_sha256: scriptSha256,
      model: options.model,
      voice: options.voice,
      browser_label: options.browserLabel,
      sync_mode: "fixed",
    },
    mode: options.mode,
    segments,
    responseCallCeiling: segments.length,
  };
}

/**
 * Executes a pre-approved plan only through an injected dispatcher. There is no
 * Realtime client, fetch, credential, retry, or default dispatcher in this module.
 */
export async function runPhase6SentenceTrial(
  plan: Phase6SentencePlan,
  options: RunPhase6SentenceTrialOptions,
): Promise<SentenceResponseTrial> {
  const stablePlan = await validatePlanBeforeDispatch(plan, options.hashText ?? sha256Text);
  const now = options.now ?? (() => performance.now());
  const startedAt = checkedNow(now, undefined);
  let lastObservedAt = startedAt;
  const elapsed = (): number => {
    const observed = checkedNow(now, lastObservedAt);
    lastObservedAt = observed;
    return round(observed - startedAt);
  };
  const segments: SentenceSegment[] = [];
  let terminalReason: SentenceResponseTrial["terminal_reason"] = "completed";

  for (let index = 0; index < stablePlan.segments.length; index += 1) {
    if (options.signal.aborted) {
      terminalReason = "aborted";
      break;
    }
    if (!options.isCurrent()) {
      terminalReason = "stale";
      break;
    }

    const segment: SentenceSegment = {
      index,
      outcome: "response_failed",
      requested_at_ms: elapsed(),
      activity_at_ms: null,
      generation_done_at_ms: null,
      playback_stopped_at_ms: null,
    };
    let lifecycleInvalid = false;
    let closed = false;
    const onLifecycle = (stage: SentenceLifecycleStage): boolean => {
      if (closed || options.signal.aborted || !options.isCurrent()) return false;
      let observed: number;
      try {
        observed = elapsed();
      } catch {
        lifecycleInvalid = true;
        return false;
      }
      const key = {
        activity: "activity_at_ms",
        generation_done: "generation_done_at_ms",
        playback_stopped: "playback_stopped_at_ms",
      }[stage] as
        | "activity_at_ms"
        | "generation_done_at_ms"
        | "playback_stopped_at_ms";
      if (segment[key] !== null) {
        lifecycleInvalid = true;
        return false;
      }
      segment[key] = observed;
      return true;
    };

    let dispatched: { outcome: SentenceDispatchOutcome };
    try {
      dispatched = await raceDispatch(
        options.dispatch({
          script: stablePlan.segments[index],
          index,
          signal: options.signal,
          onLifecycle,
        }),
        options.signal,
      );
    } catch {
      dispatched = { outcome: "response_failed" };
    }
    closed = true;

    if (options.signal.aborted) {
      segment.outcome = "aborted";
    } else if (!options.isCurrent()) {
      segment.outcome = "stale";
    } else if (
      dispatched.outcome === "completed" &&
      !lifecycleInvalid &&
      segment.activity_at_ms !== null &&
      segment.generation_done_at_ms !== null &&
      segment.playback_stopped_at_ms !== null
    ) {
      segment.outcome = "completed";
    } else {
      segment.outcome = dispatched.outcome;
      if (segment.outcome === "completed") segment.outcome = "response_failed";
    }
    segments.push(segment);
    if (segment.outcome !== "completed") {
      terminalReason = segment.outcome;
      break;
    }
  }

  if (segments.length === stablePlan.segments.length && segments.every((segment) => segment.outcome === "completed")) {
    terminalReason = "completed";
  }
  const firstRequest = segments[0]?.requested_at_ms;
  const finalStop = segments.at(-1)?.playback_stopped_at_ms;
  const gaps: number[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    const priorStop = segments[index - 1].playback_stopped_at_ms;
    const activity = segments[index].activity_at_ms;
    if (priorStop !== null && activity !== null) gaps.push(round(activity - priorStop));
  }

  return verifySentenceResponseTrial({
    experiment_id: stablePlan.experimentId,
    run_id: stablePlan.runId,
    identity: stablePlan.identity,
    mode: stablePlan.mode,
    planned_responses: stablePlan.segments.length,
    response_call_ceiling: stablePlan.responseCallCeiling,
    requested_responses: segments.length,
    completed_responses: segments.filter((segment) => segment.outcome === "completed").length,
    failed_responses: segments.filter((segment) => segment.outcome !== "completed").length,
    terminal_reason: terminalReason,
    segments,
    total_latency_ms:
      terminalReason === "completed" &&
      firstRequest !== undefined &&
      finalStop !== undefined &&
      finalStop !== null
        ? round(finalStop - firstRequest)
        : null,
    inter_response_gap_ms: gaps,
  });
}

async function validatePlanBeforeDispatch(
  plan: Phase6SentencePlan,
  hashText: (value: string) => Promise<string>,
): Promise<Phase6SentencePlan> {
  const segments = [...plan.segments];
  const identity = { ...plan.identity };
  if (
    plan.schema !== "chalk.phase6-sentence-plan.v1" ||
    !SAFE_ID.test(plan.experimentId) ||
    !SAFE_ID.test(plan.runId) ||
    !STEP_ID.test(identity.step_id) ||
    !MODEL.test(identity.model) ||
    !BROWSER.test(identity.browser_label) ||
    !["projectile", "derivative", "unit-circle"].includes(identity.cached_lesson_id) ||
    !["marin", "cedar"].includes(identity.voice) ||
    identity.sync_mode !== "fixed" ||
    !/^[a-f0-9]{64}$/u.test(identity.script_sha256)
  ) {
    throw new Error("Phase-6 sentence plan identity is invalid.");
  }
  if (
    segments.length < 1 ||
    segments.length > MAX_SENTENCES ||
    plan.responseCallCeiling !== segments.length ||
    (plan.mode === "single_response" && segments.length !== 1) ||
    (plan.mode === "per_sentence" && (segments.length < 2 || segments.length > MAX_SENTENCES))
  ) {
    throw new Error("Phase-6 sentence plan call budget is invalid.");
  }
  const combined = segments.join(" ");
  const normalized = normalizeScript(combined);
  if (
    normalized !== combined ||
    (plan.mode === "per_sentence" && JSON.stringify(splitSentences(combined)) !== JSON.stringify(segments))
  ) {
    throw new Error("Phase-6 sentence plan segments are not the pinned normalized script.");
  }
  if ((await hashText(combined)) !== identity.script_sha256) {
    throw new Error("Phase-6 sentence plan content does not match its pinned hash.");
  }
  return {
    schema: "chalk.phase6-sentence-plan.v1",
    experimentId: plan.experimentId,
    runId: plan.runId,
    identity,
    mode: plan.mode,
    segments,
    responseCallCeiling: segments.length,
  };
}

export async function sha256Text(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto SHA-256 is unavailable; the experiment cannot be pinned.");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeScript(script: string): string {
  const normalized = script.replace(/\s+/gu, " ").trim();
  if (normalized.length < 2 || normalized.length > MAX_SCRIPT_CHARACTERS) {
    throw new Error("Phase-6 cached script is outside its character budget.");
  }
  return normalized;
}

function splitSentences(script: string): string[] {
  return script
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function checkedNow(now: () => number, previous: number | undefined): number {
  const value = now();
  if (!Number.isFinite(value) || value < 0 || (previous !== undefined && value < previous)) {
    throw new Error("Phase-6 clock is non-finite or non-monotonic.");
  }
  return value;
}

function raceDispatch(
  dispatch: Promise<{ outcome: SentenceDispatchOutcome }>,
  signal: AbortSignal,
): Promise<{ outcome: SentenceDispatchOutcome }> {
  if (signal.aborted) return Promise.resolve({ outcome: "interrupted" });
  return new Promise((resolve, reject) => {
    const onAbort = () => resolve({ outcome: "interrupted" });
    signal.addEventListener("abort", onAbort, { once: true });
    dispatch.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
