/* Generated from shared/schema/annotation.schema.json. Do not edit. */

export type Op = TargetOp | ArrowOp | TextOp | EquationOp;
export type ElementId = string;
export type Side = "above" | "below" | "left" | "right";

export interface AnnotationProgram {
  schema_version: "1.0";
  request_id: string;
  manifest_version: number;
  /**
   * @minItems 1
   * @maxItems 5
   */
  ops: [Op] | [Op, Op] | [Op, Op, Op] | [Op, Op, Op, Op] | [Op, Op, Op, Op, Op];
}
export interface TargetOp {
  op: "circle" | "underline";
  id: ElementId;
  target_id: ElementId;
}
export interface ArrowOp {
  op: "arrow";
  id: ElementId;
  target_id: ElementId;
  side: Side;
}
export interface TextOp {
  op: "text";
  id: ElementId;
  target_id: ElementId;
  side: Side;
  content: string;
}
export interface EquationOp {
  op: "equation";
  id: ElementId;
  target_id: ElementId;
  side: Side;
  latex: string;
}
