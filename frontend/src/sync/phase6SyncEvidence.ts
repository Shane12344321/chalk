import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import evidenceSchema from "../../../shared/schema/phase6-sync-evidence.schema.json";
import type {
  ActivityTransition,
  AudioActivityComparison,
  AudioActivityRun,
  AudioMetrics,
  AudibleReferenceWindow,
  CHALKPhase6SynchronizationEvidence,
  SentenceHumanReview,
  SentenceResponseComparison,
  SentenceResponseTrial,
} from "./phase6SyncEvidence.generated";

const SCHEMA_ID = "https://chalk.local/schema/phase6-sync-evidence.schema.json";
const MAX_EVIDENCE_BYTES = 48 * 1_024;
export const PHASE6_FALSE_PAUSE_MIN_MS = 80;
export const PHASE6_MAX_SAMPLE_COST_MS = 4;
export const PHASE6_MAX_ACTIVITY_START_LATENCY_MS = 250;
export const PHASE6_MAX_SENTENCE_GAP_MS = 250;
export const PHASE6_MAX_SENTENCE_LATENCY_REGRESSION_PERCENT = 15;

const ajv = new Ajv({ allErrors: true, strict: true });
ajv.addSchema(evidenceSchema, SCHEMA_ID);
const evidenceValidator = requiredValidator<CHALKPhase6SynchronizationEvidence>(SCHEMA_ID);
const audioRunValidator = requiredValidator<AudioActivityRun>(
  `${SCHEMA_ID}#/$defs/audioActivityRun`,
);
const sentenceTrialValidator = requiredValidator<SentenceResponseTrial>(
  `${SCHEMA_ID}#/$defs/sentenceResponseTrial`,
);

export class Phase6EvidenceError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(issues.slice(0, 32).join("; "));
    this.name = "Phase6EvidenceError";
    this.issues = issues.slice(0, 32);
  }
}

/** Strict terminal verifier. It has no network, media, or credential path. */
export function verifyPhase6SyncEvidence(
  value: unknown,
): CHALKPhase6SynchronizationEvidence {
  const normalized = finiteJsonClone(value);
  if (!evidenceValidator(normalized)) {
    throw new Phase6EvidenceError(formatErrors(evidenceValidator.errors));
  }
  const issues: string[] = [];
  if (normalized.schema === "chalk.phase6-audio-activity-comparison.v1") {
    verifyAudioComparisonSemantics(normalized, issues);
  } else {
    verifySentenceComparisonSemantics(normalized, issues);
  }
  if (issues.length > 0) throw new Phase6EvidenceError(issues);
  return normalized;
}

export function verifyAudioActivityRun(value: unknown): AudioActivityRun {
  const normalized = finiteJsonClone(value);
  if (!audioRunValidator(normalized)) {
    throw new Phase6EvidenceError(formatErrors(audioRunValidator.errors));
  }
  const issues: string[] = [];
  verifyAudioRunSemantics(normalized, issues, "run");
  if (issues.length > 0) throw new Phase6EvidenceError(issues);
  return normalized;
}

export function verifySentenceResponseTrial(value: unknown): SentenceResponseTrial {
  const normalized = finiteJsonClone(value);
  if (!sentenceTrialValidator(normalized)) {
    throw new Phase6EvidenceError(formatErrors(sentenceTrialValidator.errors));
  }
  const issues: string[] = [];
  verifySentenceTrialSemantics(normalized, issues, "trial");
  if (issues.length > 0) throw new Phase6EvidenceError(issues);
  return normalized;
}

export function buildAudioActivityComparison(options: {
  experimentId: string;
  runs: readonly AudioActivityRun[];
  decision: AudioActivityComparison["decision"];
}): AudioActivityComparison {
  return verifyPhase6SyncEvidence({
    schema: "chalk.phase6-audio-activity-comparison.v1",
    experiment_id: options.experimentId,
    status: "completed",
    request_call_ceiling: 3,
    runs: options.runs,
    decision: options.decision,
  }) as AudioActivityComparison;
}

export function buildSentenceResponseComparison(options: {
  experimentId: string;
  singleResponse: SentenceResponseTrial;
  perSentence: SentenceResponseTrial;
  humanReview: SentenceHumanReview;
  decision: SentenceResponseComparison["decision"];
}): SentenceResponseComparison {
  return verifyPhase6SyncEvidence({
    schema: "chalk.phase6-sentence-response-comparison.v1",
    experiment_id: options.experimentId,
    status: "completed",
    request_call_ceiling:
      options.singleResponse.response_call_ceiling +
      options.perSentence.response_call_ceiling,
    single_response: options.singleResponse,
    per_sentence: options.perSentence,
    human_review: options.humanReview,
    decision: options.decision,
  }) as SentenceResponseComparison;
}

/**
 * Derive all audio-activity metrics from content-free transition timestamps and
 * human-observed audible windows. RMS samples and audio never enter this path.
 */
export function deriveAudioMetrics(options: {
  transitions: readonly ActivityTransition[];
  audibleReference: readonly AudibleReferenceWindow[];
  samples: number;
  maxSampleCostMs: number;
}): AudioMetrics {
  const references = options.audibleReference;
  const transitions = options.transitions;
  const firstActive = transitions.find((transition) => transition.active)?.at_ms;
  const finalInactive = [...transitions]
    .reverse()
    .find((transition) => !transition.active)?.at_ms;
  const firstReference = references[0]?.start_ms;
  const finalReference = references.at(-1)?.end_ms;
  let falsePauseCount = 0;
  let falsePauseTotalMs = 0;

  for (let index = 0; index < transitions.length; index += 1) {
    const transition = transitions[index];
    if (transition.active) continue;
    const restart = transitions.slice(index + 1).find((candidate) => candidate.active);
    if (!restart) continue;
    const overlap = references.reduce(
      (total, reference) =>
        total + overlapDuration(transition.at_ms, restart.at_ms, reference.start_ms, reference.end_ms),
      0,
    );
    if (overlap >= PHASE6_FALSE_PAUSE_MIN_MS) {
      falsePauseCount += 1;
      falsePauseTotalMs += overlap;
    }
  }

  return {
    activity_start_latency_ms:
      firstActive === undefined || firstReference === undefined
        ? null
        : round(firstActive - firstReference),
    activity_stop_offset_ms:
      finalInactive === undefined || finalReference === undefined
        ? null
        : round(finalInactive - finalReference),
    false_pause_count: falsePauseCount,
    false_pause_total_ms: round(falsePauseTotalMs),
    max_sample_cost_ms: round(options.maxSampleCostMs),
    samples: options.samples,
  };
}

function verifyAudioComparisonSemantics(
  record: AudioActivityComparison,
  issues: string[],
): void {
  unique(record.runs.map((run) => run.run_id), issues, "audio run IDs");
  const voices = new Set(record.runs.map((run) => run.identity.voice));
  expect(voices.has("marin") && voices.has("cedar"), issues, "audio comparison must cover marin and cedar");
  expect(
    record.runs.reduce((total, run) => total + run.response_calls, 0) <=
      record.request_call_ceiling,
    issues,
    "audio comparison exceeds its request-call ceiling",
  );
  const baseline = record.runs[0];
  for (const [index, run] of record.runs.entries()) {
    expect(
      run.experiment_id === record.experiment_id,
      issues,
      `runs[${index}] belongs to a different experiment`,
    );
    verifyAudioRunSemantics(run, issues, `runs[${index}]`);
    if (!baseline) continue;
    expect(
      sameAudioIdentityExceptVoice(run, baseline),
      issues,
      `runs[${index}] mixes cached step, script hash, model, browser, or sync mode`,
    );
    expect(
      JSON.stringify(run.detector) === JSON.stringify(baseline.detector),
      issues,
      `runs[${index}] mixes detector configuration`,
    );
  }

  if (record.decision === "promote") {
    expect(
      record.runs.every((run) => run.outcome === "completed"),
      issues,
      "promotion requires three completed audio runs",
    );
    expect(
      record.runs.every((run) => run.human_preference === "improved"),
      issues,
      "promotion requires three consecutive human preferences",
    );
    expect(
      record.runs.every((run) => run.interruption !== "regressed") &&
        record.runs.some((run) => run.interruption === "preserved"),
      issues,
      "promotion requires exercised interruption with no regression",
    );
    for (const [index, run] of record.runs.entries()) {
      expect(run.metrics.false_pause_count === 0, issues, `runs[${index}] has a false pause`);
      expect(
        run.metrics.max_sample_cost_ms <= PHASE6_MAX_SAMPLE_COST_MS,
        issues,
        `runs[${index}] exceeds the sampling-cost ceiling`,
      );
      expect(
        run.metrics.activity_start_latency_ms !== null &&
          run.metrics.activity_start_latency_ms <= PHASE6_MAX_ACTIVITY_START_LATENCY_MS,
        issues,
        `runs[${index}] exceeds the activity-start latency ceiling`,
      );
      expect(
        run.metrics.activity_stop_offset_ms !== null &&
          run.metrics.activity_stop_offset_ms >= 0,
        issues,
        `runs[${index}] detector stop leads audible speech`,
      );
    }
  }
}

function verifyAudioRunSemantics(run: AudioActivityRun, issues: string[], path: string): void {
  expect(run.window_start_ms <= run.window_end_ms, issues, `${path}: reversed run window`);
  monotonic(
    run.transitions.map((transition) => transition.at_ms),
    issues,
    `${path}: activity transitions`,
  );
  for (let index = 0; index < run.transitions.length; index += 1) {
    const transition = run.transitions[index];
    expect(
      transition.at_ms >= run.window_start_ms && transition.at_ms <= run.window_end_ms,
      issues,
      `${path}: activity transition is outside the run window`,
    );
    if (index > 0) {
      expect(
        transition.active !== run.transitions[index - 1].active,
        issues,
        `${path}: activity transitions do not alternate`,
      );
    }
  }
  let previousReferenceEnd = run.window_start_ms;
  for (const reference of run.audible_reference) {
    expect(reference.start_ms < reference.end_ms, issues, `${path}: empty audible reference`);
    expect(
      reference.start_ms >= previousReferenceEnd && reference.end_ms <= run.window_end_ms,
      issues,
      `${path}: audible references overlap or escape the run window`,
    );
    previousReferenceEnd = reference.end_ms;
  }
  if (run.buffer_started_ms !== null && run.buffer_stopped_ms !== null) {
    expect(
      run.window_start_ms <= run.buffer_started_ms &&
        run.buffer_started_ms <= run.buffer_stopped_ms &&
        run.buffer_stopped_ms <= run.window_end_ms,
      issues,
      `${path}: buffer timing is not monotonic inside the run window`,
    );
  }

  if (run.outcome === "completed") {
    expect(run.response_calls === 1, issues, `${path}: completed run must claim one response call`);
    expect(
      run.buffer_started_ms !== null && run.buffer_stopped_ms !== null,
      issues,
      `${path}: completed run lacks buffer timing`,
    );
    expect(run.audible_reference.length > 0, issues, `${path}: completed run lacks audible reference`);
    expect(run.metrics.samples > 0, issues, `${path}: completed run has no analyser samples`);
    expect(
      run.transitions.length >= 2 &&
        run.transitions[0].active &&
        !run.transitions.at(-1)?.active,
      issues,
      `${path}: completed run lacks a closed activity interval`,
    );
  } else {
    expect(run.human_preference === "not_rated", issues, `${path}: failed run has a preference rating`);
  }
  if (run.outcome === "unsupported") {
    expect(run.response_calls === 0, issues, `${path}: unsupported Web Audio consumed a response`);
  }

  const expectedMetrics = deriveAudioMetrics({
    transitions: run.transitions,
    audibleReference: run.audible_reference,
    samples: run.metrics.samples,
    maxSampleCostMs: run.metrics.max_sample_cost_ms,
  });
  expect(
    JSON.stringify(expectedMetrics) === JSON.stringify(run.metrics),
    issues,
    `${path}: audio metrics do not match retained timings`,
  );
}

function verifySentenceComparisonSemantics(
  record: SentenceResponseComparison,
  issues: string[],
): void {
  const single = record.single_response;
  const split = record.per_sentence;
  expect(single.mode === "single_response", issues, "single_response trial has the wrong mode");
  expect(split.mode === "per_sentence", issues, "per_sentence trial has the wrong mode");
  expect(single.run_id !== split.run_id, issues, "sentence comparison reuses a run ID");
  expect(
    single.experiment_id === record.experiment_id && split.experiment_id === record.experiment_id,
    issues,
    "sentence trial belongs to a different experiment",
  );
  expect(
    JSON.stringify(single.identity) === JSON.stringify(split.identity),
    issues,
    "sentence comparison mixes cached step, script hash, model, voice, browser, or sync mode",
  );
  expect(single.planned_responses === 1, issues, "single-response trial must plan exactly one call");
  expect(
    split.planned_responses >= 2 && split.planned_responses <= 5,
    issues,
    "per-sentence trial must plan two to five calls",
  );
  expect(
    record.request_call_ceiling === single.response_call_ceiling + split.response_call_ceiling,
    issues,
    "sentence comparison call ceiling is not the exact sum of both plans",
  );
  verifySentenceTrialSemantics(single, issues, "single_response");
  verifySentenceTrialSemantics(split, issues, "per_sentence");

  if (record.decision === "promote") {
    expect(
      single.terminal_reason === "completed" && split.terminal_reason === "completed",
      issues,
      "promotion requires both sentence trials to complete",
    );
    expect(
      record.human_review.preferred_mode === "per_sentence" &&
        record.human_review.per_sentence_naturalness > record.human_review.single_naturalness,
      issues,
      "promotion requires a human naturalness preference for per-sentence responses",
    );
    expect(
      record.human_review.interruption_behavior === "preserved",
      issues,
      "promotion requires exercised interruption without regression",
    );
    expect(
      split.inter_response_gap_ms.every((gap) => gap <= PHASE6_MAX_SENTENCE_GAP_MS),
      issues,
      "promotion exceeds the inter-response gap ceiling",
    );
    if (single.total_latency_ms !== null && split.total_latency_ms !== null) {
      const ceiling = single.total_latency_ms *
        (1 + PHASE6_MAX_SENTENCE_LATENCY_REGRESSION_PERCENT / 100);
      expect(
        split.total_latency_ms <= ceiling,
        issues,
        "promotion exceeds the total-latency regression ceiling",
      );
    }
  }
}

function verifySentenceTrialSemantics(
  trial: SentenceResponseTrial,
  issues: string[],
  path: string,
): void {
  expect(
    trial.response_call_ceiling === trial.planned_responses,
    issues,
    `${path}: response-call ceiling differs from the plan`,
  );
  expect(
    trial.requested_responses === trial.segments.length &&
      trial.requested_responses <= trial.response_call_ceiling,
    issues,
    `${path}: requested-response count is inconsistent`,
  );
  expect(
    trial.completed_responses ===
      trial.segments.filter((segment) => segment.outcome === "completed").length,
    issues,
    `${path}: completed-response count is inconsistent`,
  );
  expect(
    trial.failed_responses ===
      trial.segments.filter((segment) => segment.outcome !== "completed").length,
    issues,
    `${path}: failed-response count is inconsistent`,
  );
  expect(trial.failed_responses <= 1, issues, `${path}: dispatch continued after a failure`);

  for (const [index, segment] of trial.segments.entries()) {
    expect(segment.index === index, issues, `${path}: segment indexes are not contiguous`);
    if (index > 0) {
      const prior = trial.segments[index - 1];
      expect(prior.outcome === "completed", issues, `${path}: dispatch continued after a failure`);
      expect(
        prior.playback_stopped_at_ms !== null &&
          segment.requested_at_ms >= prior.playback_stopped_at_ms,
        issues,
        `${path}: responses overlap or request timing regresses`,
      );
    }
    for (const [name, value] of [
      ["activity", segment.activity_at_ms],
      ["generation", segment.generation_done_at_ms],
      ["playback stop", segment.playback_stopped_at_ms],
    ] as const) {
      if (value !== null) {
        expect(value >= segment.requested_at_ms, issues, `${path}: ${name} precedes request`);
      }
    }
    if (segment.activity_at_ms !== null && segment.playback_stopped_at_ms !== null) {
      expect(
        segment.playback_stopped_at_ms >= segment.activity_at_ms,
        issues,
        `${path}: playback stop precedes audio activity`,
      );
    }
    if (segment.outcome === "completed") {
      expect(
        segment.activity_at_ms !== null &&
          segment.generation_done_at_ms !== null &&
          segment.playback_stopped_at_ms !== null,
        issues,
        `${path}: completed segment lacks lifecycle evidence`,
      );
    }
  }

  if (trial.terminal_reason === "completed") {
    expect(
      trial.segments.length === trial.planned_responses && trial.failed_responses === 0,
      issues,
      `${path}: completed trial is incomplete`,
    );
  } else if (trial.segments.length > 0) {
    expect(
      trial.segments.at(-1)?.outcome === trial.terminal_reason,
      issues,
      `${path}: terminal reason differs from the final segment`,
    );
  } else {
    expect(
      trial.terminal_reason === "aborted" || trial.terminal_reason === "stale",
      issues,
      `${path}: empty trial has no pre-dispatch terminal reason`,
    );
  }

  const firstRequest = trial.segments[0]?.requested_at_ms;
  const finalStop = trial.segments.at(-1)?.playback_stopped_at_ms;
  const expectedLatency =
    trial.terminal_reason === "completed" &&
    firstRequest !== undefined &&
    finalStop !== undefined &&
    finalStop !== null
      ? round(finalStop - firstRequest)
      : null;
  expect(trial.total_latency_ms === expectedLatency, issues, `${path}: total latency is stale`);

  const expectedGaps: number[] = [];
  for (let index = 1; index < trial.segments.length; index += 1) {
    const previousStop = trial.segments[index - 1].playback_stopped_at_ms;
    const activity = trial.segments[index].activity_at_ms;
    if (previousStop !== null && activity !== null) expectedGaps.push(round(activity - previousStop));
  }
  expect(
    JSON.stringify(trial.inter_response_gap_ms) === JSON.stringify(expectedGaps),
    issues,
    `${path}: response gaps are stale`,
  );
}

function sameAudioIdentityExceptVoice(a: AudioActivityRun, b: AudioActivityRun): boolean {
  return (
    a.identity.cached_lesson_id === b.identity.cached_lesson_id &&
    a.identity.step_id === b.identity.step_id &&
    a.identity.script_sha256 === b.identity.script_sha256 &&
    a.identity.model === b.identity.model &&
    a.identity.browser_label === b.identity.browser_label &&
    a.identity.sync_mode === b.identity.sync_mode
  );
}

function finiteJsonClone<T>(value: T): T {
  let encoded: string;
  try {
    encoded = JSON.stringify(value);
  } catch {
    throw new Phase6EvidenceError(["evidence is not JSON serializable"]);
  }
  if (encoded === undefined || encoded.length > MAX_EVIDENCE_BYTES) {
    throw new Phase6EvidenceError(["evidence exceeds the 48 KiB budget"]);
  }
  if (/\b(?:NaN|Infinity)\b/u.test(encoded)) {
    throw new Phase6EvidenceError(["evidence contains a non-finite number"]);
  }
  return JSON.parse(encoded) as T;
}

function overlapDuration(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function monotonic(values: readonly number[], issues: string[], label: string): void {
  for (let index = 1; index < values.length; index += 1) {
    expect(values[index] > values[index - 1], issues, `${label} are not strictly monotonic`);
  }
}

function unique(values: readonly string[], issues: string[], label: string): void {
  expect(new Set(values).size === values.length, issues, `${label} are not unique`);
}

function expect(condition: boolean, issues: string[], message: string): void {
  if (!condition && !issues.includes(message)) issues.push(message);
}

function requiredValidator<T>(reference: string): ValidateFunction<T> {
  const validator = ajv.getSchema<T>(reference);
  if (!validator) throw new Error(`Missing compiled Phase-6 schema reference: ${reference}`);
  return validator;
}

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors) return [];
  return errors.slice(0, 16).map((error) => {
    const path = error.instancePath || "/";
    return `${path} ${error.message ?? error.keyword}`;
  });
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
