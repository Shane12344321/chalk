/* Generated from shared/schema/lesson.schema.json. Do not edit. */

export type ElementId = string;
export type LessonOp = TextOp | EquationOp | SketchOp | AxesOp | CurveOp;
export type TextOp = TextRegionOp | TextAnchorOp;
export type Region =
  "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "left" | "right" | "full";
export type EquationOp = EquationRegionOp | EquationAnchorOp;
/**
 * @minItems 2
 * @maxItems 2
 */
export type NormalizedPoint = [number, number];

/**
 * CHALK M2 deterministic lesson wire contract.
 */
export interface LessonProgram {
  schema_version: "1.0";
  title: string;
  /**
   * @minItems 1
   * @maxItems 8
   */
  steps:
    | [LessonStep]
    | [LessonStep, LessonStep]
    | [LessonStep, LessonStep, LessonStep]
    | [LessonStep, LessonStep, LessonStep, LessonStep]
    | [LessonStep, LessonStep, LessonStep, LessonStep, LessonStep]
    | [LessonStep, LessonStep, LessonStep, LessonStep, LessonStep, LessonStep]
    | [LessonStep, LessonStep, LessonStep, LessonStep, LessonStep, LessonStep, LessonStep]
    | [LessonStep, LessonStep, LessonStep, LessonStep, LessonStep, LessonStep, LessonStep, LessonStep];
}
export interface LessonStep {
  id: ElementId;
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
  id: ElementId;
  region: Region;
  content: string;
}
export interface TextAnchorOp {
  op: "text";
  id: ElementId;
  anchor: Anchor;
  content: string;
}
export interface Anchor {
  el: ElementId;
  side: "above" | "below" | "left" | "right";
  gap?: number;
}
export interface EquationRegionOp {
  op: "equation";
  id: ElementId;
  region: Region;
  latex: string;
}
export interface EquationAnchorOp {
  op: "equation";
  id: ElementId;
  anchor: Anchor;
  latex: string;
}
export interface SketchOp {
  op: "sketch";
  id: ElementId;
  region: Region;
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
  id: ElementId;
  region: Region;
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
  id: ElementId;
  axes_id: ElementId;
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
