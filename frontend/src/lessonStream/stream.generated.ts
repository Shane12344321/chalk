/* Generated from shared/schema/lesson-stream.schema.json. Do not edit. */

/**
 * Validated backend-to-browser NDJSON envelopes for live lesson generation.
 */
export type LessonStreamEnvelope = Started | Step | Warning | Done | Error;
export type RequestId = string;
export type LessonOp = TextOp | EquationOp | SketchOp | AxesOp | CurveOp | LineOp | ArrowOp | PointOp | AngleArcOp;
export type TextOp = TextRegionOp | TextAnchorOp;
export type EquationOp = EquationRegionOp | EquationAnchorOp;
/**
 * @minItems 2
 * @maxItems 2
 */
export type NormalizedPoint = [number, number];
export type LineOp = LineRegionOp | LineCanvasOp;
export type ArrowOp = ArrowRegionOp | ArrowCanvasOp;
export type PointOp = PointRegionOp | PointCanvasOp;
export type AngleArcOp = AngleArcRegionOp | AngleArcCanvasOp;
export type Warning = StandardWarning | SanitizedWarning;
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
export interface LineRegionOp {
  op: "line";
  id: string;
  region: "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "left" | "right" | "full";
  from: NormalizedPoint;
  to: NormalizedPoint;
  stroke: "solid" | "dashed";
  label?: string;
}
export interface LineCanvasOp {
  op: "line";
  id: string;
  canvas_id: string;
  from: NormalizedPoint;
  to: NormalizedPoint;
  stroke: "solid" | "dashed";
  label?: string;
}
export interface ArrowRegionOp {
  op: "arrow";
  id: string;
  region: "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "left" | "right" | "full";
  from: NormalizedPoint;
  to: NormalizedPoint;
  stroke: "solid" | "dashed";
  label?: string;
}
export interface ArrowCanvasOp {
  op: "arrow";
  id: string;
  canvas_id: string;
  from: NormalizedPoint;
  to: NormalizedPoint;
  stroke: "solid" | "dashed";
  label?: string;
}
export interface PointRegionOp {
  op: "point";
  id: string;
  region: "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "left" | "right" | "full";
  at: NormalizedPoint;
  label?: string;
}
export interface PointCanvasOp {
  op: "point";
  id: string;
  canvas_id: string;
  at: NormalizedPoint;
  label?: string;
}
export interface AngleArcRegionOp {
  op: "angle_arc";
  id: string;
  region: "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "left" | "right" | "full";
  center: NormalizedPoint;
  radius: number;
  start_deg: number;
  end_deg: number;
  stroke: "solid" | "dashed";
  label?: string;
}
export interface AngleArcCanvasOp {
  op: "angle_arc";
  id: string;
  canvas_id: string;
  center: NormalizedPoint;
  radius: number;
  start_deg: number;
  end_deg: number;
  stroke: "solid" | "dashed";
  label?: string;
}
export interface Checkpoint {
  question: string;
  expected_gist: string;
}
export interface StandardWarning {
  type: "lesson.warning";
  request_id: RequestId;
  code: "step_repaired" | "step_dropped" | "truncated_output";
  step_hint?: string;
}
export interface SanitizedWarning {
  type: "lesson.warning";
  request_id: RequestId;
  code: "step_sanitized";
  step_hint?: string;
  /**
   * @minItems 1
   * @maxItems 4
   */
  corrections:
    | ["trimmed_outer_whitespace" | "normalized_power_operator" | "clamped_anchor_gap" | "clamped_normalized_point"]
    | [
        "trimmed_outer_whitespace" | "normalized_power_operator" | "clamped_anchor_gap" | "clamped_normalized_point",
        "trimmed_outer_whitespace" | "normalized_power_operator" | "clamped_anchor_gap" | "clamped_normalized_point"
      ]
    | [
        "trimmed_outer_whitespace" | "normalized_power_operator" | "clamped_anchor_gap" | "clamped_normalized_point",
        "trimmed_outer_whitespace" | "normalized_power_operator" | "clamped_anchor_gap" | "clamped_normalized_point",
        "trimmed_outer_whitespace" | "normalized_power_operator" | "clamped_anchor_gap" | "clamped_normalized_point"
      ]
    | [
        "trimmed_outer_whitespace" | "normalized_power_operator" | "clamped_anchor_gap" | "clamped_normalized_point",
        "trimmed_outer_whitespace" | "normalized_power_operator" | "clamped_anchor_gap" | "clamped_normalized_point",
        "trimmed_outer_whitespace" | "normalized_power_operator" | "clamped_anchor_gap" | "clamped_normalized_point",
        "trimmed_outer_whitespace" | "normalized_power_operator" | "clamped_anchor_gap" | "clamped_normalized_point"
      ];
  correction_count: number;
}
export interface Done {
  type: "lesson.done";
  request_id: RequestId;
  accepted_steps: number;
  repairs: number;
  dropped_steps: number;
  sanitized_steps?: number;
  sanitized_fields?: number;
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
