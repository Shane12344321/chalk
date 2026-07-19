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

export function compositeDiagramLesson() {
  return {
    schema_version: "1.1",
    title: "Pendulum forces",
    steps: [
      {
        id: "s1",
        script: "Sketch the support, curved cord, mass, and force direction together.",
        ops: [
          {
            op: "diagram",
            id: "pendulum",
            region: "full",
            tension: 0.55,
            primitives: [
              { kind: "line", points: [[0.25, 0.18], [0.75, 0.18]], stroke: "solid", label: "support" },
              { kind: "smooth", points: [[0.5, 0.18], [0.58, 0.42], [0.7, 0.67]], stroke: "solid", label: "cord" },
              { kind: "ellipse", center: [0.7, 0.72], radius: [0.07, 0.08], stroke: "solid", fill: true, label: "mass" },
              { kind: "arc", center: [0.5, 0.18], radius: [0.18, 0.22], start_deg: 60, end_deg: 90, stroke: "dashed", arrow: true, label: "theta" },
              { kind: "line", points: [[0.7, 0.8], [0.7, 0.95]], stroke: "solid", arrow: true, label: "mg" },
            ],
          },
        ],
        checkpoint: null,
      },
    ],
  };
}

export function alignedConstructionLesson() {
  return {
    schema_version: "1.1",
    title: "Aligned working",
    steps: [
      {
        id: "s1",
        script: "Keep each transformation registered in one shared working area.",
        ops: [
          {
            op: "diagram",
            id: "working",
            region: "full",
            primitives: [
              { kind: "text", at: [0.5, 0.2], content: "2x + 3 = 11", align: "center", size: "large" },
              { kind: "text", at: [0.5, 0.42], content: "2x = 8", align: "center" },
              { kind: "line", points: [[0.34, 0.49], [0.66, 0.49]], stroke: "solid" },
              { kind: "text", at: [0.5, 0.68], content: "x = 4", align: "center", size: "large" },
            ],
          },
        ],
        checkpoint: null,
      },
    ],
  };
}
