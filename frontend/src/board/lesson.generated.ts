/* Generated from shared/schema/lesson.schema.json. Do not edit. */

export type ElementId = string;
export type LessonOp = TextOp | EquationOp | SketchOp | AxesOp | CurveOp | LineOp | ArrowOp | PointOp | AngleArcOp;
export type TextOp = TextRegionOp | TextAnchorOp;
export type Region =
  "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "left" | "right" | "full";
export type EquationOp = EquationRegionOp | EquationAnchorOp;
/**
 * @minItems 2
 * @maxItems 2
 */
export type NormalizedPoint = [number, number];
export type LineOp = LineRegionOp | LineCanvasOp;
export type StrokeStyle = "solid" | "dashed";
export type ArrowOp = ArrowRegionOp | ArrowCanvasOp;
export type PointOp = PointRegionOp | PointCanvasOp;
export type AngleArcOp = AngleArcRegionOp | AngleArcCanvasOp;

/**
 * CHALK M2 deterministic lesson wire contract.
 */
export interface LessonProgram {
  schema_version: "1.0" | "1.1";
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
export interface LineRegionOp {
  op: "line";
  id: ElementId;
  region: Region;
  from: NormalizedPoint;
  to: NormalizedPoint;
  stroke: StrokeStyle;
  label?: string;
}
export interface LineCanvasOp {
  op: "line";
  id: ElementId;
  canvas_id: ElementId;
  from: NormalizedPoint;
  to: NormalizedPoint;
  stroke: StrokeStyle;
  label?: string;
}
export interface ArrowRegionOp {
  op: "arrow";
  id: ElementId;
  region: Region;
  from: NormalizedPoint;
  to: NormalizedPoint;
  stroke: StrokeStyle;
  label?: string;
}
export interface ArrowCanvasOp {
  op: "arrow";
  id: ElementId;
  canvas_id: ElementId;
  from: NormalizedPoint;
  to: NormalizedPoint;
  stroke: StrokeStyle;
  label?: string;
}
export interface PointRegionOp {
  op: "point";
  id: ElementId;
  region: Region;
  at: NormalizedPoint;
  label?: string;
}
export interface PointCanvasOp {
  op: "point";
  id: ElementId;
  canvas_id: ElementId;
  at: NormalizedPoint;
  label?: string;
}
export interface AngleArcRegionOp {
  op: "angle_arc";
  id: ElementId;
  region: Region;
  center: NormalizedPoint;
  radius: number;
  start_deg: number;
  end_deg: number;
  stroke: StrokeStyle;
  label?: string;
}
export interface AngleArcCanvasOp {
  op: "angle_arc";
  id: ElementId;
  canvas_id: ElementId;
  center: NormalizedPoint;
  radius: number;
  start_deg: number;
  end_deg: number;
  stroke: StrokeStyle;
  label?: string;
}
export interface Checkpoint {
  question: string;
  expected_gist: string;
}
