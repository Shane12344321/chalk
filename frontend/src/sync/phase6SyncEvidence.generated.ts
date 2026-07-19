/* Generated from shared/schema/phase6-sync-evidence.schema.json. Do not edit. */

/**
 * Content-free, terminal evidence for the separately owner-approved Phase 6A and 6B comparisons. Script text, transcripts, RMS samples, audio, and credentials are intentionally absent.
 */
export type CHALKPhase6SynchronizationEvidence = AudioActivityComparison | SentenceResponseComparison;
export type SafeId = string;
export type Sha256 = string;
export type TimeMs = number;
export type NullableTimeMs = TimeMs | null;
export type NullableSignedTimeMs = SignedTimeMs | null;
export type SignedTimeMs = number;

export interface AudioActivityComparison {
  schema: "chalk.phase6-audio-activity-comparison.v1";
  experiment_id: SafeId;
  status: "completed";
  request_call_ceiling: 3;
  /**
   * @minItems 3
   * @maxItems 3
   */
  runs: [AudioActivityRun, AudioActivityRun, AudioActivityRun];
  decision: "promote" | "park" | "remove";
}
export interface AudioActivityRun {
  experiment_id: SafeId;
  run_id: SafeId;
  identity: RunIdentity;
  detector: DetectorConfiguration;
  response_call_ceiling: 1;
  response_calls: number;
  outcome: "completed" | "unsupported" | "response_failed" | "interrupted" | "aborted" | "stale";
  window_start_ms: TimeMs;
  window_end_ms: TimeMs;
  buffer_started_ms: NullableTimeMs;
  buffer_stopped_ms: NullableTimeMs;
  /**
   * @maxItems 64
   */
  transitions: ActivityTransition[];
  /**
   * @maxItems 16
   */
  audible_reference:
    | []
    | [AudibleReferenceWindow]
    | [AudibleReferenceWindow, AudibleReferenceWindow]
    | [AudibleReferenceWindow, AudibleReferenceWindow, AudibleReferenceWindow]
    | [AudibleReferenceWindow, AudibleReferenceWindow, AudibleReferenceWindow, AudibleReferenceWindow]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ]
    | [
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow,
        AudibleReferenceWindow
      ];
  metrics: AudioMetrics;
  interruption: "not_exercised" | "preserved" | "regressed";
  human_preference: "improved" | "flat" | "worse" | "not_rated";
}
export interface RunIdentity {
  cached_lesson_id: "projectile" | "derivative" | "unit-circle";
  step_id: string;
  script_sha256: Sha256;
  model: string;
  voice: "marin" | "cedar";
  browser_label: string;
  sync_mode: "fixed";
}
export interface DetectorConfiguration {
  policy_revision: "rms-hysteresis-v1";
  activity_threshold_rms: number;
  active_frames: number;
  silent_frames: number;
  fft_size: 1024;
  false_pause_min_ms: 80;
}
export interface ActivityTransition {
  active: boolean;
  at_ms: TimeMs;
}
export interface AudibleReferenceWindow {
  start_ms: TimeMs;
  end_ms: TimeMs;
}
export interface AudioMetrics {
  activity_start_latency_ms: NullableSignedTimeMs;
  activity_stop_offset_ms: NullableSignedTimeMs;
  false_pause_count: number;
  false_pause_total_ms: TimeMs;
  max_sample_cost_ms: number;
  samples: number;
}
export interface SentenceResponseComparison {
  schema: "chalk.phase6-sentence-response-comparison.v1";
  experiment_id: SafeId;
  status: "completed";
  request_call_ceiling: number;
  single_response: SentenceResponseTrial;
  per_sentence: SentenceResponseTrial;
  human_review: SentenceHumanReview;
  decision: "promote" | "park" | "remove";
}
export interface SentenceResponseTrial {
  experiment_id: SafeId;
  run_id: SafeId;
  identity: RunIdentity;
  mode: "single_response" | "per_sentence";
  planned_responses: number;
  response_call_ceiling: number;
  requested_responses: number;
  completed_responses: number;
  failed_responses: number;
  terminal_reason: "completed" | "response_failed" | "interrupted" | "aborted" | "stale";
  /**
   * @maxItems 5
   */
  segments:
    | []
    | [SentenceSegment]
    | [SentenceSegment, SentenceSegment]
    | [SentenceSegment, SentenceSegment, SentenceSegment]
    | [SentenceSegment, SentenceSegment, SentenceSegment, SentenceSegment]
    | [SentenceSegment, SentenceSegment, SentenceSegment, SentenceSegment, SentenceSegment];
  total_latency_ms: NullableTimeMs;
  /**
   * @maxItems 4
   */
  inter_response_gap_ms: [] | [TimeMs] | [TimeMs, TimeMs] | [TimeMs, TimeMs, TimeMs] | [TimeMs, TimeMs, TimeMs, TimeMs];
}
export interface SentenceSegment {
  index: number;
  outcome: "completed" | "response_failed" | "interrupted" | "aborted" | "stale";
  requested_at_ms: TimeMs;
  activity_at_ms: NullableTimeMs;
  generation_done_at_ms: NullableTimeMs;
  playback_stopped_at_ms: NullableTimeMs;
}
export interface SentenceHumanReview {
  preferred_mode: "single_response" | "per_sentence" | "tie";
  single_naturalness: number;
  per_sentence_naturalness: number;
  interruption_behavior: "not_exercised" | "preserved" | "regressed";
}
