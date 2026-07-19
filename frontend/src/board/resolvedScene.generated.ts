/* Generated from shared/schema/resolved-board-scene.schema.json. Do not edit. */

export type ElementId = string;
export type Zone =
  "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "left" | "right" | "full";

export interface ResolvedBoardScene {
  schema_version: "1.0";
  request_id: string;
  prefix_version: number;
  /**
   * @maxItems 30
   */
  elements: {
    id: string;
    kind: "text" | "equation" | "axes" | "curve" | "sketch" | "line" | "arrow" | "point" | "angle_arc" | "diagram";
    /**
     * @minItems 4
     * @maxItems 4
     */
    bounds: [number, number, number, number];
    summary: string;
    state: "committed" | "buffered";
  }[];
  /**
   * @maxItems 12
   */
  findings:
    | []
    | [
        | {
            code:
              | "label_overlap"
              | "label_out_of_bounds"
              | "text_overflow"
              | "element_overlap"
              | "reading_order_conflict"
              | "measurement_unavailable";
            evidence: "estimated" | "measured" | "semantic";
            /**
             * @minItems 1
             * @maxItems 4
             */
            element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
          }
        | {
            code: "region_crowded" | "board_imbalanced";
            evidence: "estimated" | "measured" | "semantic";
            /**
             * @minItems 1
             * @maxItems 4
             */
            element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            zone:
              | "A1"
              | "A2"
              | "A3"
              | "B1"
              | "B2"
              | "B3"
              | "C1"
              | "C2"
              | "C3"
              | "D1"
              | "D2"
              | "D3"
              | "left"
              | "right"
              | "full";
          }
        | {
            code: "region_sparse";
            evidence: "estimated" | "measured" | "semantic";
            /**
             * @maxItems 4
             */
            element_ids: [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
            zone:
              | "A1"
              | "A2"
              | "A3"
              | "B1"
              | "B2"
              | "B3"
              | "C1"
              | "C2"
              | "C3"
              | "D1"
              | "D2"
              | "D3"
              | "left"
              | "right"
              | "full";
          }
      ]
    | [
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        )
      ]
    | [
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        )
      ]
    | [
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        )
      ]
    | [
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        )
      ]
    | [
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        )
      ]
    | [
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        )
      ]
    | [
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        )
      ]
    | [
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        )
      ]
    | [
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        )
      ]
    | [
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        )
      ]
    | [
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        ),
        (
          | {
              code:
                | "label_overlap"
                | "label_out_of_bounds"
                | "text_overflow"
                | "element_overlap"
                | "reading_order_conflict"
                | "measurement_unavailable";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
            }
          | {
              code: "region_crowded" | "board_imbalanced";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @minItems 1
               * @maxItems 4
               */
              element_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
          | {
              code: "region_sparse";
              evidence: "estimated" | "measured" | "semantic";
              /**
               * @maxItems 4
               */
              element_ids:
                [] | [string] | [string, string] | [string, string, string] | [string, string, string, string];
              zone:
                | "A1"
                | "A2"
                | "A3"
                | "B1"
                | "B2"
                | "B3"
                | "C1"
                | "C2"
                | "C3"
                | "D1"
                | "D2"
                | "D3"
                | "left"
                | "right"
                | "full";
            }
        )
      ];
  /**
   * Closed, redacted browser evidence for visual intent that did not become visible ink. These are unavailable IDs, not board elements.
   *
   * @maxItems 8
   */
  recovery_findings?:
    | []
    | [RecoveryFinding]
    | [RecoveryFinding, RecoveryFinding]
    | [RecoveryFinding, RecoveryFinding, RecoveryFinding]
    | [RecoveryFinding, RecoveryFinding, RecoveryFinding, RecoveryFinding]
    | [RecoveryFinding, RecoveryFinding, RecoveryFinding, RecoveryFinding, RecoveryFinding]
    | [RecoveryFinding, RecoveryFinding, RecoveryFinding, RecoveryFinding, RecoveryFinding, RecoveryFinding]
    | [
        RecoveryFinding,
        RecoveryFinding,
        RecoveryFinding,
        RecoveryFinding,
        RecoveryFinding,
        RecoveryFinding,
        RecoveryFinding
      ]
    | [
        RecoveryFinding,
        RecoveryFinding,
        RecoveryFinding,
        RecoveryFinding,
        RecoveryFinding,
        RecoveryFinding,
        RecoveryFinding,
        RecoveryFinding
      ];
}
export interface RecoveryFinding {
  finding_id: string;
  code:
    | "browser_invalid_step"
    | "browser_invalid_op"
    | "browser_duplicate_id"
    | "browser_unknown_reference"
    | "browser_invalid_expression"
    | "browser_invalid_equation"
    | "browser_invalid_axes"
    | "renderer_geometry_failed";
  intent:
    "step" | "text" | "equation" | "sketch" | "axes" | "curve" | "diagram" | "line" | "arrow" | "point" | "angle_arc";
  status: "pending" | "recovered" | "abandoned";
  /**
   * @maxItems 4
   */
  affected_element_ids:
    | []
    | [ElementId]
    | [ElementId, ElementId]
    | [ElementId, ElementId, ElementId]
    | [ElementId, ElementId, ElementId, ElementId];
  /**
   * @maxItems 4
   */
  affected_op_indexes: [] | [number] | [number, number] | [number, number, number] | [number, number, number, number];
  source_step_id?: ElementId;
  neighborhood: {
    zone?: Zone;
    /**
     * @maxItems 4
     */
    nearby_element_ids:
      | []
      | [ElementId]
      | [ElementId, ElementId]
      | [ElementId, ElementId, ElementId]
      | [ElementId, ElementId, ElementId, ElementId];
  };
}
