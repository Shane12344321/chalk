/* Generated from shared/schema/lesson-stream.schema.json. Do not edit. */

/**
 * Validated backend-to-browser NDJSON envelopes for live lesson generation.
 */
export type LessonStreamEnvelope = Started | Step | Warning | Done | Error;
export type RequestId = string;
export type LessonOp = TextOp | EquationOp | SketchOp | AxesOp | CurveOp;
export type TextOp = TextRegionOp | TextAnchorOp;
export type EquationOp = EquationRegionOp | EquationAnchorOp;
/**
 * @minItems 2
 * @maxItems 2
 */
export type NormalizedPoint = [number, number];
export type Error = UpstreamError | LocalError;

export interface Started {
  type: "lesson.started";
  request_id: RequestId;
  title: string;
}
export interface Step {
  type: "lesson.step";
  request_id: RequestId;
  step: LessonStep;
}
export interface LessonStep {
  id: string;
  script: string;
  /**
   * @minItems 1
   * @maxItems 4
   */
  ops: [LessonOp] | [LessonOp, LessonOp] | [LessonOp, LessonOp, LessonOp] | [LessonOp, LessonOp, LessonOp, LessonOp];
  checkpoint: null | Checkpoint;
}
export interface TextRegionOp {
  op: "text";
  id: string;
  region: "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "left" | "right" | "full";
  content: string;
}
export interface TextAnchorOp {
  op: "text";
  id: string;
  anchor: Anchor;
  content: string;
}
export interface Anchor {
  el: string;
  side: "above" | "below" | "left" | "right";
  gap?: number;
}
export interface EquationRegionOp {
  op: "equation";
  id: string;
  region: "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "left" | "right" | "full";
  latex: string;
}
export interface EquationAnchorOp {
  op: "equation";
  id: string;
  anchor: Anchor;
  latex: string;
}
export interface SketchOp {
  op: "sketch";
  id: string;
  region: "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "left" | "right" | "full";
  /**
   * @minItems 1
   * @maxItems 6
   */
  strokes:
    | [[NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]]]
    | [
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]]
      ]
    | [
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]]
      ]
    | [
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]]
      ]
    | [
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]]
      ]
    | [
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]],
        [NormalizedPoint, NormalizedPoint, ...NormalizedPoint[]]
      ];
}
export interface AxesOp {
  op: "axes";
  id: string;
  region: "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "left" | "right" | "full";
  x: AxisSpec;
  y: AxisSpec;
}
export interface AxisSpec {
  min: number;
  max: number;
  label: string;
}
export interface CurveOp {
  op: "curve";
  id: string;
  axes_id: string;
  expr: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  domain?: [number, number];
}
export interface Checkpoint {
  question: string;
  expected_gist: string;
}
export interface Warning {
  type: "lesson.warning";
  request_id: RequestId;
  code: "step_repaired" | "step_dropped" | "truncated_output";
  step_hint?: string;
}
export interface Done {
  type: "lesson.done";
  request_id: RequestId;
  accepted_steps: number;
  repairs: number;
  dropped_steps: number;
}
export interface UpstreamError {
  type: "lesson.error";
  request_id: RequestId;
  code: "upstream_rejected" | "upstream_failed" | "upstream_incomplete" | "upstream_error";
  upstream_reason?:
    | "max_output_tokens"
    | "content_filter"
    | "rate_limit"
    | "authentication"
    | "permission"
    | "server_error"
    | "invalid_request"
    | "unknown";
  failure_origin?: "generation" | "repair";
  repair_attempts?: number;
  fallback_available: true;
}
export interface LocalError {
  type: "lesson.error";
  request_id: RequestId;
  code: "not_configured" | "upstream_unavailable" | "generation_timeout" | "invalid_stream" | "no_valid_steps";
  failure_origin?: "generation" | "repair";
  repair_attempts?: number;
  fallback_available: true;
}
