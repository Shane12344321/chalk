import {
  REMOTE_AUDIO_ACTIVITY_CONFIGURATION,
  type AudioActivityEvidence,
  type AudioActivityTransition,
} from "../realtime/remoteAudioActivity";
import type {
  ActivityTransition,
  AudioActivityRun,
  AudibleReferenceWindow,
  RunIdentity,
} from "./phase6SyncEvidence.generated";
import { deriveAudioMetrics, verifyAudioActivityRun } from "./phase6SyncEvidence";
import { sha256Text } from "./phase6SentenceRunner";

export interface Phase6AudioRunPlan {
  schema: "chalk.phase6-audio-run-plan.v1";
  experimentId: string;
  runId: string;
  identity: RunIdentity;
  responseCallCeiling: 1;
}

export interface PreparePhase6AudioRunPlanOptions {
  experimentId: string;
  runId: string;
  cachedLessonId: RunIdentity["cached_lesson_id"];
  stepId: string;
  script: string;
  model: string;
  voice: RunIdentity["voice"];
  browserLabel: string;
}

export interface Phase6AudioRunRecorderOptions {
  signal: AbortSignal;
  isCurrent: () => boolean;
  now?: () => number;
}

const SAFE_ID = /^[a-z][a-z0-9-]{2,47}$/u;
const STEP_ID = /^[a-z][a-z0-9_-]{0,15}$/u;
const MODEL = /^gpt-realtime-[a-z0-9.-]{1,31}$/u;
const BROWSER = /^[a-z0-9][a-z0-9._-]{2,47}$/u;
const MAX_SCRIPT_CHARACTERS = 240;

export async function preparePhase6AudioRunPlan(
  options: PreparePhase6AudioRunPlanOptions,
  hashText: (value: string) => Promise<string> = sha256Text,
): Promise<Phase6AudioRunPlan> {
  if (!SAFE_ID.test(options.experimentId) || !SAFE_ID.test(options.runId)) {
    throw new Error("Phase-6 experiment or audio run ID is outside its closed contract.");
  }
  if (!STEP_ID.test(options.stepId)) {
    throw new Error("Phase-6 cached step ID is outside the lesson contract.");
  }
  if (!MODEL.test(options.model) || !BROWSER.test(options.browserLabel)) {
    throw new Error("Phase-6 session identity is outside its closed contract.");
  }
  const normalizedScript = options.script.replace(/\s+/gu, " ").trim();
  if (normalizedScript.length < 2 || normalizedScript.length > MAX_SCRIPT_CHARACTERS) {
    throw new Error("Phase-6 cached script is outside its character budget.");
  }
  const scriptSha256 = await hashText(normalizedScript);
  if (!/^[a-f0-9]{64}$/u.test(scriptSha256)) {
    throw new Error("Phase-6 script hash provider did not return SHA-256 hex.");
  }
  return {
    schema: "chalk.phase6-audio-run-plan.v1",
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
    responseCallCeiling: 1,
  };
}

/**
 * Injection-compatible Phase-6A recorder. The Realtime harness can forward the
 * existing monitor callback and buffer lifecycle into this recorder. There is
 * deliberately no media, request, credential, or live dispatcher here.
 */
export class Phase6AudioActivityRecorder {
  private readonly now: () => number;
  private readonly startedAt: number;
  private lastObservedAt: number;
  private responseCalls = 0;
  private bufferStartedMs: number | null = null;
  private bufferStoppedMs: number | null = null;
  private transitions: ActivityTransition[] = [];
  private references: AudibleReferenceWindow[] = [];
  private interruption: AudioActivityRun["interruption"] = "not_exercised";
  private finished = false;

  constructor(
    plan: Phase6AudioRunPlan,
    private readonly options: Phase6AudioRunRecorderOptions,
  ) {
    this.plan = validateAudioPlan(plan);
    this.now = options.now ?? (() => performance.now());
    this.startedAt = checkedTime(this.now(), undefined);
    this.lastObservedAt = this.startedAt;
  }

  private readonly plan: Phase6AudioRunPlan;

  /** Claim the single call immediately before the owner-approved dispatcher runs. */
  claimResponse(): boolean {
    if (!this.accepting() || this.responseCalls >= this.plan.responseCallCeiling) return false;
    this.responseCalls += 1;
    return true;
  }

  bufferStarted(): boolean {
    if (!this.accepting() || this.bufferStartedMs !== null) return false;
    this.bufferStartedMs = this.elapsed();
    return true;
  }

  bufferStopped(): boolean {
    if (!this.accepting() || this.bufferStartedMs === null || this.bufferStoppedMs !== null) {
      return false;
    }
    this.bufferStoppedMs = this.elapsed();
    return true;
  }

  /** RMS is intentionally ignored; only the closed activity transition survives. */
  activityTransition(event: AudioActivityTransition): boolean {
    if (!this.accepting() || this.transitions.length >= 64) return false;
    const previous = this.transitions.at(-1);
    if (previous?.active === event.active) return false;
    let atMs: number;
    try {
      const absolute = checkedTime(event.observedAtMs, this.lastObservedAt);
      this.lastObservedAt = absolute;
      atMs = round(absolute - this.startedAt);
    } catch {
      return false;
    }
    this.transitions.push({ active: event.active, at_ms: atMs });
    return true;
  }

  /** Human-observed audible spans are timestamps only; no recording enters evidence. */
  addAudibleReference(startedAtMs: number, endedAtMs: number): boolean {
    if (!this.accepting() || this.references.length >= 16) return false;
    if (
      !Number.isFinite(startedAtMs) ||
      !Number.isFinite(endedAtMs) ||
      startedAtMs < this.startedAt ||
      endedAtMs <= startedAtMs
    ) {
      return false;
    }
    const reference = {
      start_ms: round(startedAtMs - this.startedAt),
      end_ms: round(endedAtMs - this.startedAt),
    };
    if (reference.start_ms < (this.references.at(-1)?.end_ms ?? 0)) return false;
    this.references.push(reference);
    return true;
  }

  recordInterruption(value: Exclude<AudioActivityRun["interruption"], "not_exercised">): boolean {
    if (!this.accepting() || this.interruption !== "not_exercised") return false;
    this.interruption = value;
    return true;
  }

  finish(options: {
    outcome: AudioActivityRun["outcome"];
    monitor: AudioActivityEvidence;
    humanPreference: AudioActivityRun["human_preference"];
  }): AudioActivityRun {
    if (this.finished) throw new Error("Phase-6 audio run is already terminal.");
    this.finished = true;
    if (
      options.monitor.transitions !== this.transitions.length ||
      options.monitor.active !== (this.transitions.at(-1)?.active ?? false)
    ) {
      throw new Error("Phase-6 monitor snapshot does not match retained transitions.");
    }
    let outcome = options.outcome;
    if (this.options.signal.aborted) outcome = "aborted";
    else if (!this.options.isCurrent()) outcome = "stale";
    const windowEndMs = this.elapsed(true);
    const humanPreference = outcome === "completed" ? options.humanPreference : "not_rated";
    return verifyAudioActivityRun({
      experiment_id: this.plan.experimentId,
      run_id: this.plan.runId,
      identity: this.plan.identity,
      detector: {
        policy_revision: REMOTE_AUDIO_ACTIVITY_CONFIGURATION.policyRevision,
        activity_threshold_rms: REMOTE_AUDIO_ACTIVITY_CONFIGURATION.activityThresholdRms,
        active_frames: REMOTE_AUDIO_ACTIVITY_CONFIGURATION.activeFrames,
        silent_frames: REMOTE_AUDIO_ACTIVITY_CONFIGURATION.silentFrames,
        fft_size: REMOTE_AUDIO_ACTIVITY_CONFIGURATION.fftSize,
        false_pause_min_ms: REMOTE_AUDIO_ACTIVITY_CONFIGURATION.falsePauseMinMs,
      },
      response_call_ceiling: this.plan.responseCallCeiling,
      response_calls: this.responseCalls,
      outcome,
      window_start_ms: 0,
      window_end_ms: windowEndMs,
      buffer_started_ms: this.bufferStartedMs,
      buffer_stopped_ms: this.bufferStoppedMs,
      transitions: this.transitions,
      audible_reference: this.references,
      metrics: deriveAudioMetrics({
        transitions: this.transitions,
        audibleReference: this.references,
        samples: options.monitor.samples,
        maxSampleCostMs: options.monitor.maxSampleCostMs,
      }),
      interruption: this.interruption,
      human_preference: humanPreference,
    });
  }

  private accepting(): boolean {
    return !this.finished && !this.options.signal.aborted && this.options.isCurrent();
  }

  private elapsed(allowTerminal = false): number {
    if (!allowTerminal && !this.accepting()) {
      throw new Error("Phase-6 audio run is aborted, stale, or terminal.");
    }
    const absolute = checkedTime(this.now(), this.lastObservedAt);
    this.lastObservedAt = absolute;
    return round(absolute - this.startedAt);
  }
}

function validateAudioPlan(plan: Phase6AudioRunPlan): Phase6AudioRunPlan {
  const identity = { ...plan.identity };
  if (
    plan.schema !== "chalk.phase6-audio-run-plan.v1" ||
    !SAFE_ID.test(plan.experimentId) ||
    !SAFE_ID.test(plan.runId) ||
    plan.responseCallCeiling !== 1 ||
    !STEP_ID.test(identity.step_id) ||
    !MODEL.test(identity.model) ||
    !BROWSER.test(identity.browser_label) ||
    !["projectile", "derivative", "unit-circle"].includes(identity.cached_lesson_id) ||
    !["marin", "cedar"].includes(identity.voice) ||
    identity.sync_mode !== "fixed" ||
    !/^[a-f0-9]{64}$/u.test(identity.script_sha256)
  ) {
    throw new Error("Phase-6 audio run plan is invalid.");
  }
  return {
    schema: "chalk.phase6-audio-run-plan.v1",
    experimentId: plan.experimentId,
    runId: plan.runId,
    identity,
    responseCallCeiling: 1,
  };
}

function checkedTime(value: number, previous: number | undefined): number {
  if (!Number.isFinite(value) || value < 0 || (previous !== undefined && value < previous)) {
    throw new Error("Phase-6 audio clock is non-finite or non-monotonic.");
  }
  return value;
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
