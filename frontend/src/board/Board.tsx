import { useMemo, useRef } from "react";
import "katex/dist/katex.min.css";
import { opProgress } from "./animation";
import type { NormalizedLesson } from "./decode";
import { BoardGeometryStore, type BoardGeometry } from "./geometry";
import { BOARD_HEIGHT, BOARD_WIDTH, layoutSteps } from "./layout";

interface BoardProps {
  lesson: NormalizedLesson;
  currentStepIndex: number;
  currentStepProgress: number;
  phase: string;
}

export function Board({ lesson, currentStepIndex, currentStepProgress, phase }: BoardProps) {
  const store = useRef<BoardGeometryStore>();
  if (!store.current) store.current = new BoardGeometryStore();
  const geometryStore = store.current;
  const laidOut = useMemo(() => layoutSteps(lesson.steps), [lesson]);
  const build = useMemo(() => geometryStore.build(laidOut), [geometryStore, laidOut]);

  return (
    <section className="chalkboard-shell" aria-label="Animated projectile lesson board">
      <div className="board-toolbar">
        <div>
          <span className="board-live-dot" aria-hidden="true" />
          <strong>{lesson.title}</strong>
        </div>
        <span>{phase.toLowerCase()} · step {Math.min(currentStepIndex + 1, lesson.steps.length)}/{lesson.steps.length}</span>
      </div>
      <svg
        className="chalkboard"
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        role="img"
        aria-label="A hand-drawn projectile range lesson"
      >
        <defs>
          <filter id="chalk-softness">
            <feGaussianBlur stdDeviation="0.16" />
          </filter>
        </defs>
        <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} rx="36" fill="#102b22" />
        <path className="board-ghost-line" d="M48 300 H1552 M48 576 H1552" />
        {build.geometries.map((geometry) => {
          const progress = geometryProgress(geometry, lesson, currentStepIndex, currentStepProgress);
          return <Geometry key={geometry.id} geometry={geometry} progress={progress} />;
        })}
      </svg>
      {build.warnings.length > 0 ? (
        <p className="board-warning" role="status">
          {build.warnings.length} invalid board operation{build.warnings.length === 1 ? "" : "s"} skipped safely.
        </p>
      ) : null}
    </section>
  );
}

function Geometry({ geometry, progress }: { geometry: BoardGeometry; progress: number }) {
  if (progress <= 0) return null;
  const clipId = `reveal-${geometry.id}`;
  return (
    <g data-element-id={geometry.id} data-kind={geometry.kind} data-progress={progress.toFixed(3)}>
      <clipPath id={clipId}>
        <rect
          x={geometry.box.x - 8}
          y={geometry.box.y - 8}
          width={(geometry.box.width + 16) * progress}
          height={geometry.box.height + 16}
        />
      </clipPath>
      {geometry.paths.map((path, index) => (
        <path
          key={`${geometry.id}-path-${index}`}
          d={path.d}
          fill={path.fill}
          filter="url(#chalk-softness)"
          pathLength={1}
          stroke={path.stroke}
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={path.strokeWidth}
        />
      ))}
      {geometry.labels.map((label, index) => (
        <text
          key={`${geometry.id}-label-${index}`}
          className="board-axis-label"
          clipPath={`url(#${clipId})`}
          textAnchor={label.anchor ?? "start"}
          x={label.x}
          y={label.y}
        >
          {label.text}
        </text>
      ))}
      {geometry.text ? (
        <text
          className="board-hand-text"
          clipPath={`url(#${clipId})`}
          x={geometry.box.x}
          y={geometry.box.y + geometry.box.height * 0.7}
        >
          {geometry.text}
        </text>
      ) : null}
      {geometry.equationHtml ? (
        <foreignObject
          clipPath={`url(#${clipId})`}
          x={geometry.box.x}
          y={geometry.box.y}
          width={geometry.box.width}
          height={geometry.box.height}
        >
          <div
            className="board-equation"
            // This markup is produced by KaTeX with trust disabled after a
            // CHALK command allowlist; raw model HTML never reaches this sink.
            dangerouslySetInnerHTML={{ __html: geometry.equationHtml }}
          />
        </foreignObject>
      ) : null}
    </g>
  );
}

function geometryProgress(
  geometry: BoardGeometry,
  lesson: NormalizedLesson,
  currentStepIndex: number,
  currentStepProgress: number,
): number {
  if (geometry.stepIndex < currentStepIndex) return 1;
  if (geometry.stepIndex > currentStepIndex) return 0;
  const step = lesson.steps[geometry.stepIndex];
  return step ? opProgress(step.ops, geometry.opIndex, currentStepProgress) : 0;
}
