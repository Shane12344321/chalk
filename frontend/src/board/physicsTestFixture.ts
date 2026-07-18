export function physicsDiagramLesson() {
  return {
    schema_version: "1.1",
    title: "Reflection",
    steps: [
      {
        id: "s1",
        script: "Build the interface, normal, incident ray, and contact point.",
        ops: [
          { op: "line", id: "boundary", region: "right", from: [0.1, 0.55], to: [0.9, 0.55], stroke: "solid", label: "interface" },
          { op: "line", id: "normal", canvas_id: "boundary", from: [0.5, 0.1], to: [0.5, 0.9], stroke: "dashed", label: "normal" },
          { op: "arrow", id: "incident", canvas_id: "boundary", from: [0.15, 0.85], to: [0.5, 0.55], stroke: "solid", label: "incident" },
          { op: "point", id: "hit", canvas_id: "boundary", at: [0.5, 0.55], label: "P" },
        ],
        checkpoint: null,
      },
      {
        id: "s2",
        script: "Add the reflected ray and mark its angle from the normal.",
        ops: [
          { op: "arrow", id: "reflected", canvas_id: "boundary", from: [0.5, 0.55], to: [0.85, 0.85], stroke: "solid", label: "reflected" },
          { op: "angle_arc", id: "theta", canvas_id: "boundary", center: [0.5, 0.55], radius: 0.16, start_deg: 45, end_deg: 90, stroke: "solid", label: "theta" },
        ],
        checkpoint: null,
      },
    ],
  };
}
