import { describe, expect, it } from "vitest";
import type {
  AudioActivityRun,
  RunIdentity,
  SentenceResponseTrial,
} from "./phase6SyncEvidence.generated";
import {
  buildAudioActivityComparison,
  buildSentenceResponseComparison,
  deriveAudioMetrics,
  Phase6EvidenceError,
  verifyAudioActivityRun,
  verifyPhase6SyncEvidence,
  verifySentenceResponseTrial,
} from "./phase6SyncEvidence";

const SCRIPT_HASH = "a".repeat(64);

function identity(voice: "marin" | "cedar" = "marin"): RunIdentity {
  return {
    cached_lesson_id: "projectile",
    step_id: "range",
    script_sha256: SCRIPT_HASH,
    model: "gpt-realtime-2.1-mini",
    voice,
    browser_label: "chrome-macos",
    sync_mode: "fixed",
  };
}

function audioRun(runId: string, voice: "marin" | "cedar"): AudioActivityRun {
  const transitions = [
    { active: true, at_ms: 110 },
    { active: false, at_ms: 1_850 },
  ];
  const audibleReference = [{ start_ms: 100, end_ms: 1_800 }];
  return verifyAudioActivityRun({
    experiment_id: "phase-six-audio",
    run_id: runId,
    identity: identity(voice),
    detector: {
      policy_revision: "rms-hysteresis-v1",
      activity_threshold_rms: 0.012,
      active_frames: 2,
      silent_frames: 5,
      fft_size: 1_024,
      false_pause_min_ms: 80,
    },
    response_call_ceiling: 1,
    response_calls: 1,
    outcome: "completed",
    window_start_ms: 0,
    window_end_ms: 2_000,
    buffer_started_ms: 50,
    buffer_stopped_ms: 1_900,
    transitions,
    audible_reference: audibleReference,
    metrics: deriveAudioMetrics({
      transitions,
      audibleReference,
      samples: 120,
      maxSampleCostMs: 0.2,
    }),
    interruption: runId === "audio-run-one" ? "preserved" : "not_exercised",
    human_preference: "improved",
  });
}

function sentenceTrial(
  mode: "single_response" | "per_sentence",
  overrides: Partial<SentenceResponseTrial> = {},
): SentenceResponseTrial {
  const segments = mode === "single_response"
    ? [{
        index: 0,
        outcome: "completed" as const,
        requested_at_ms: 0,
        activity_at_ms: 100,
        generation_done_at_ms: 500,
        playback_stopped_at_ms: 800,
      }]
    : [
        {
          index: 0,
          outcome: "completed" as const,
          requested_at_ms: 0,
          activity_at_ms: 80,
          generation_done_at_ms: 350,
          playback_stopped_at_ms: 430,
        },
        {
          index: 1,
          outcome: "completed" as const,
          requested_at_ms: 440,
          activity_at_ms: 480,
          generation_done_at_ms: 820,
          playback_stopped_at_ms: 900,
        },
      ];
  const planned = segments.length;
  return verifySentenceResponseTrial({
    experiment_id: "phase-six-sentences",
    run_id: mode === "single_response" ? "sentence-single" : "sentence-split",
    identity: identity(),
    mode,
    planned_responses: planned,
    response_call_ceiling: planned,
    requested_responses: planned,
    completed_responses: planned,
    failed_responses: 0,
    terminal_reason: "completed",
    segments,
    total_latency_ms: mode === "single_response" ? 800 : 900,
    inter_response_gap_ms: mode === "single_response" ? [] : [50],
    ...overrides,
  });
}

describe("Phase-6 evidence contract", () => {
  it("accepts exactly three homogeneous audio runs covering both candidate voices", () => {
    const record = buildAudioActivityComparison({
      experimentId: "phase-six-audio",
      runs: [
        audioRun("audio-run-one", "marin"),
        audioRun("audio-run-two", "cedar"),
        audioRun("audio-run-three", "marin"),
      ],
      decision: "promote",
    });
    expect(record.runs).toHaveLength(3);
    expect(JSON.stringify(record)).not.toMatch(/"script":|transcript|rms_samples|audio_bytes/u);
  });

  it("derives false pauses and refuses stale or detector-leading metrics", () => {
    const transitions = [
      { active: true, at_ms: 110 },
      { active: false, at_ms: 700 },
      { active: true, at_ms: 900 },
      { active: false, at_ms: 1_750 },
    ];
    expect(deriveAudioMetrics({
      transitions,
      audibleReference: [{ start_ms: 100, end_ms: 1_800 }],
      samples: 100,
      maxSampleCostMs: 0.1,
    })).toEqual({
      activity_start_latency_ms: 10,
      activity_stop_offset_ms: -50,
      false_pause_count: 1,
      false_pause_total_ms: 200,
      max_sample_cost_ms: 0.1,
      samples: 100,
    });

    const stale = structuredClone(audioRun("audio-run-one", "marin"));
    stale.metrics.false_pause_count = 1;
    expect(() => verifyAudioActivityRun(stale)).toThrow(/metrics do not match/u);
  });

  it("rejects mixed identity, raw content fields, incomplete promotion, and non-finite timing", () => {
    const runs = [
      audioRun("audio-run-one", "marin"),
      audioRun("audio-run-two", "cedar"),
      audioRun("audio-run-three", "marin"),
    ] as const;
    runs[1].identity.script_sha256 = "b".repeat(64);
    expect(() => buildAudioActivityComparison({
      experimentId: "phase-six-audio",
      runs,
      decision: "park",
    })).toThrow(/mixes cached step/u);

    const withScript = { ...audioRun("audio-run-four", "marin"), script: "secret words" };
    expect(() => verifyAudioActivityRun(withScript)).toThrow(/additional properties/u);

    const unsupported = structuredClone(audioRun("audio-run-five", "marin"));
    unsupported.outcome = "unsupported";
    unsupported.response_calls = 0;
    unsupported.human_preference = "not_rated";
    expect(() => buildAudioActivityComparison({
      experimentId: "phase-six-audio",
      runs: [unsupported, audioRun("audio-run-six", "cedar"), audioRun("audio-run-seven", "marin")],
      decision: "promote",
    })).toThrow(/three completed/u);

    const nonFinite = structuredClone(audioRun("audio-run-eight", "marin")) as AudioActivityRun;
    nonFinite.window_end_ms = Number.NaN;
    expect(() => verifyAudioActivityRun(nonFinite)).toThrow(Phase6EvidenceError);
  });

  it("accepts a content-free exact sentence pair and enforces the promotion gate", () => {
    const record = buildSentenceResponseComparison({
      experimentId: "phase-six-sentences",
      singleResponse: sentenceTrial("single_response"),
      perSentence: sentenceTrial("per_sentence"),
      humanReview: {
        preferred_mode: "per_sentence",
        single_naturalness: 3,
        per_sentence_naturalness: 5,
        interruption_behavior: "preserved",
      },
      decision: "promote",
    });
    expect(record.request_call_ceiling).toBe(3);
    expect(JSON.stringify(record)).not.toContain("Therefore");
  });

  it("binds every child run to the enclosing experiment ID", () => {
    const wrongAudio = audioRun("audio-run-two", "cedar");
    wrongAudio.experiment_id = "different-audio-run";
    expect(() => buildAudioActivityComparison({
      experimentId: "phase-six-audio",
      runs: [audioRun("audio-run-one", "marin"), wrongAudio, audioRun("audio-run-three", "marin")],
      decision: "park",
    })).toThrow(/different experiment/u);

    const wrongSentence = sentenceTrial("per_sentence");
    wrongSentence.experiment_id = "different-sentence-run";
    expect(() => buildSentenceResponseComparison({
      experimentId: "phase-six-sentences",
      singleResponse: sentenceTrial("single_response"),
      perSentence: wrongSentence,
      humanReview: {
        preferred_mode: "tie",
        single_naturalness: 3,
        per_sentence_naturalness: 3,
        interruption_behavior: "not_exercised",
      },
      decision: "park",
    })).toThrow(/different experiment/u);
  });

  it("rejects mixed pair identity, response overlap, post-failure dispatch, and weak promotion", () => {
    const mixed = structuredClone(sentenceTrial("per_sentence"));
    mixed.identity.voice = "cedar";
    expect(() => buildSentenceResponseComparison({
      experimentId: "phase-six-sentences",
      singleResponse: sentenceTrial("single_response"),
      perSentence: mixed,
      humanReview: {
        preferred_mode: "tie",
        single_naturalness: 3,
        per_sentence_naturalness: 3,
        interruption_behavior: "not_exercised",
      },
      decision: "park",
    })).toThrow(/mixes cached step/u);

    const overlap = structuredClone(sentenceTrial("per_sentence"));
    overlap.segments[1]!.requested_at_ms = 400;
    expect(() => verifySentenceResponseTrial(overlap)).toThrow(/overlap/u);

    const afterFailure = structuredClone(sentenceTrial("per_sentence"));
    afterFailure.segments[0]!.outcome = "response_failed";
    afterFailure.completed_responses = 1;
    afterFailure.failed_responses = 1;
    afterFailure.terminal_reason = "response_failed";
    afterFailure.total_latency_ms = null;
    expect(() => verifySentenceResponseTrial(afterFailure)).toThrow(/continued after a failure/u);

    expect(() => buildSentenceResponseComparison({
      experimentId: "phase-six-sentences",
      singleResponse: sentenceTrial("single_response"),
      perSentence: sentenceTrial("per_sentence"),
      humanReview: {
        preferred_mode: "tie",
        single_naturalness: 4,
        per_sentence_naturalness: 4,
        interruption_behavior: "not_exercised",
      },
      decision: "promote",
    })).toThrow(/naturalness preference/u);
  });

  it("allows terminal failed evidence to park while rejecting an incomplete-looking record", () => {
    const failed = verifySentenceResponseTrial({
      experiment_id: "phase-six-sentences",
      run_id: "sentence-split",
      identity: identity(),
      mode: "per_sentence",
      planned_responses: 2,
      response_call_ceiling: 2,
      requested_responses: 1,
      completed_responses: 0,
      failed_responses: 1,
      terminal_reason: "response_failed",
      segments: [{
        index: 0,
        outcome: "response_failed",
        requested_at_ms: 0,
        activity_at_ms: null,
        generation_done_at_ms: null,
        playback_stopped_at_ms: null,
      }],
      total_latency_ms: null,
      inter_response_gap_ms: [],
    });
    expect(buildSentenceResponseComparison({
      experimentId: "phase-six-sentences",
      singleResponse: sentenceTrial("single_response"),
      perSentence: failed,
      humanReview: {
        preferred_mode: "single_response",
        single_naturalness: 4,
        per_sentence_naturalness: 1,
        interruption_behavior: "not_exercised",
      },
      decision: "park",
    }).decision).toBe("park");

    const incomplete = structuredClone(sentenceTrial("single_response"));
    incomplete.segments = [];
    incomplete.requested_responses = 0;
    incomplete.completed_responses = 0;
    incomplete.total_latency_ms = null;
    expect(() => verifyPhase6SyncEvidence({
      schema: "chalk.phase6-sentence-response-comparison.v1",
      experiment_id: "phase-six-sentences",
      status: "completed",
      request_call_ceiling: 3,
      single_response: incomplete,
      per_sentence: sentenceTrial("per_sentence"),
      human_review: {
        preferred_mode: "tie",
        single_naturalness: 3,
        per_sentence_naturalness: 3,
        interruption_behavior: "not_exercised",
      },
      decision: "park",
    })).toThrow(/completed trial is incomplete/u);
  });
});
