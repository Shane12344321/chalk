/* Generated from shared/schema/lesson-plan.schema.json. Do not edit. */

export interface LessonPlan {
  kind: "lesson_plan";
  visual_structure: string;
  composition_archetype?:
    | "single_large_figure"
    | "derivation_plus_diagram"
    | "worked_example_column"
    | "comparison_pair"
    | "graph_with_summary";
  /**
   * @minItems 3
   * @maxItems 5
   */
  progression: [string, string, string] | [string, string, string, string] | [string, string, string, string, string];
  checkpoint_step: number | null;
}
