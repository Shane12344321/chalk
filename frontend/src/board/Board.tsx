import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import "katex/dist/katex.min.css";
import type { NormalizedLesson } from "./decode";
import { type BoardGeometry, type BoardPath } from "./geometry";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./layout";
import {
  type VisibleBoardState,
} from "./manifest";
import { OverlayLayer, type DeixisOverlay } from "./overlays";
import { AnnotationOverlayLayer } from "./annotationOverlays";
import type { AnnotationOp } from "../annotations";
import { fitBoardText } from "./textLayout";
import { type LayoutLintIssue } from "./layoutLint";
import { revealGroupProgress } from "./reveal";
import { RoughSvgBoardRenderer, type BoardRenderContext } from "./renderer";
import { measureRenderedBoard } from "./measuredLayout";
import type { PrecommitMeasurementCache } from "./precommitMeasurement";

export interface BoardProps {
  lesson: NormalizedLesson;
  currentStepIndex: number;
  currentStepProgress: number;
  phase: string;
  onManifestChange?: (manifest: string) => void;
  onVisibleStateChange?: (state: VisibleBoardState) => void;
  overlays?: readonly DeixisOverlay[];
  annotations?: readonly AnnotationOp[];
  measurementId?: string;
  onFirstVisibleInk?: (measurementId: string, observedAtMs: number) => void;
  showDiagnostics?: boolean;
  onMeasuredLayoutFindings?: (findings: readonly LayoutLintIssue[]) => void;
  measurementCache?: PrecommitMeasurementCache;
  renderContext?: BoardRenderContext;
}

export function Board({
  lesson,
  currentStepIndex,
  currentStepProgress,
  phase,
  onManifestChange,
  onVisibleStateChange,
  overlays = [],
  annotations = [],
  measurementId,
  onFirstVisibleInk,
  showDiagnostics = false,
  onMeasuredLayoutFindings,
  measurementCache,
  renderContext,
}: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<RoughSvgBoardRenderer>();
  if (!rendererRef.current) rendererRef.current = new RoughSvgBoardRenderer(measurementCache);
  const renderer = rendererRef.current;
  const prepared = useMemo(
    () => renderer.prepareLesson(lesson, renderContext),
    [lesson, renderContext, renderer],
  );
  const { build, layoutIssues } = prepared;
  const visibleSnapshot = useMemo(
    () => renderer.visibleSnapshot(prepared, currentStepIndex, currentStepProgress),
    [currentStepIndex, currentStepProgress, prepared, renderer],
  );
  const visibleVersionRef = useRef(0);
  const visibleFingerprintRef = useRef<string>();
  useEffect(() => {
    if (visibleFingerprintRef.current === visibleSnapshot.fingerprint) return;
    visibleFingerprintRef.current = visibleSnapshot.fingerprint;
    visibleVersionRef.current += 1;
    onManifestChange?.(visibleSnapshot.manifest);
    onVisibleStateChange?.({ ...visibleSnapshot, version: visibleVersionRef.current });
  }, [onManifestChange, onVisibleStateChange, visibleSnapshot]);
  useLayoutEffect(() => {
    if (!onMeasuredLayoutFindings || !svgRef.current) return;
    onMeasuredLayoutFindings(measureRenderedBoard(svgRef.current, build.geometries));
  }, [build.geometries, onMeasuredLayoutFindings]);
  const measuredRef = useRef<string>();
  useEffect(() => {
    if (!measurementId || measuredRef.current === measurementId) return;
    const hasVisibleInk = build.geometries.some(
      (geometry) =>
        renderer.geometryProgress(
          prepared,
          geometry,
          currentStepIndex,
          currentStepProgress,
        ) > 0,
    );
    if (!hasVisibleInk) return;
    measuredRef.current = measurementId;
    onFirstVisibleInk?.(measurementId, performance.now());
  }, [
    build.geometries,
    currentStepIndex,
    currentStepProgress,
    lesson,
    measurementId,
    onFirstVisibleInk,
    prepared,
    renderer,
  ]);

  return (
    <section className="chalkboard-shell" aria-label={`Animated lesson board: ${lesson.title}`}>
      <div className="board-toolbar">
        <div>
          <span className="board-live-dot" aria-hidden="true" />
          <strong>{lesson.title}</strong>
        </div>
        <span>{phase.toLowerCase()} · step {Math.min(currentStepIndex + 1, lesson.steps.length)}/{lesson.steps.length}</span>
      </div>
      <svg
        ref={svgRef}
        className="chalkboard"
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        role="img"
        aria-label={`A hand-drawn lesson about ${lesson.title}`}
      >
        <defs>
          <filter id="chalk-softness">
            <feGaussianBlur stdDeviation="0.16" />
          </filter>
          <marker
            id="annotation-arrowhead"
            markerHeight="8"
            markerWidth="8"
            orient="auto-start-reverse"
            refX="7"
            refY="4"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="#3a6fd8" />
          </marker>
        </defs>
        <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} rx="36" fill="transparent" />
        <path className="board-ghost-line" d="M48 300 H1552 M48 576 H1552" />
        {build.geometries.map((geometry) => {
          const progress = renderer.geometryProgress(
            prepared,
            geometry,
            currentStepIndex,
            currentStepProgress,
          );
          return <BoardGeometryLayer key={geometry.id} geometry={geometry} progress={progress} />;
        })}
        <AnnotationOverlayLayer ops={annotations} elements={visibleSnapshot.elements} />
        <OverlayLayer
          overlays={overlays}
          elements={visibleSnapshot.elements}
          geometries={build.geometries}
        />
      </svg>
      {build.warnings.length > 0 || (showDiagnostics && layoutIssues.length > 0) ? (
        <p
          className="board-warning"
          data-layout-lint-count={layoutIssues.length}
          role="status"
        >
          {build.warnings.length > 0
            ? `${build.warnings.length} invalid board operation${build.warnings.length === 1 ? "" : "s"} skipped safely.`
            : null}
          {build.warnings.length > 0 && showDiagnostics && layoutIssues.length > 0
            ? " "
            : null}
          {showDiagnostics && layoutIssues.length > 0
            ? `${layoutIssues.length} deterministic layout lint${layoutIssues.length === 1 ? "" : "s"}: ${layoutIssueSummary(layoutIssues)}.`
            : null}
        </p>
      ) : null}
    </section>
  );
}

function layoutIssueSummary(
  issues: readonly LayoutLintIssue[],
): string {
  const counts = new Map<string, number>();
  for (const issue of issues) counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1);
  return [...counts.entries()]
    .map(([code, count]) => `${code.replaceAll("_", " ")} ${count}`)
    .join(", ");
}

const AXIS_LABEL_REVEAL_PROGRESS = 0.85;
const DIAGRAM_LABEL_REVEAL_PROGRESS = 0.72;

export function BoardGeometryLayer({ geometry, progress }: { geometry: BoardGeometry; progress: number }) {
  if (progress <= 0) return null;
  const clipId = `reveal-${geometry.id}`;
  const fittedText = geometry.text ? fitBoardText(geometry.text, geometry.box) : undefined;
  // A hand writes labels after drawing the axes, not during the strokes.
  const isDiagram = ["diagram", "line", "arrow", "point", "angle_arc"].includes(geometry.kind);
  const labelsVisible = geometry.kind === "axes"
    ? progress >= AXIS_LABEL_REVEAL_PROGRESS
    : !isDiagram || progress >= DIAGRAM_LABEL_REVEAL_PROGRESS;
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
      {geometry.paths.map((path, index) => {
    const revealProgress = pathRevealProgress(geometry, path, progress);
        return (
        <path
          data-board-mark="ink"
          key={`${geometry.id}-path-${index}`}
          d={path.d}
          fill={path.fill}
          filter="url(#chalk-softness)"
          pathLength={1}
          stroke={path.stroke}
          strokeDasharray="1"
          strokeDashoffset={1 - revealProgress}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={path.strokeWidth}
        />
        );
      })}
      {geometry.labels.map((label, index) => {
        const visible = label.revealGroup === undefined
          ? labelsVisible
          : revealGroupProgress(geometry.paths, label.revealGroup, progress) >= 0.55;
        return visible ? (
            <text
              data-auto-place={label.autoPlace ? "true" : "false"}
              data-board-mark="label"
              key={`${geometry.id}-label-${index}`}
              className="board-axis-label"
              clipPath={isDiagram ? undefined : `url(#${clipId})`}
              style={label.fontSize ? { fontSize: `${label.fontSize}px` } : undefined}
              textAnchor={label.anchor ?? "start"}
              x={label.x}
              y={label.y}
            >
              {label.text}
            </text>
          ) : null;
      })}
      {fittedText ? (
        <text
          className="board-hand-text"
          clipPath={`url(#${clipId})`}
          data-text-line-count={fittedText.lines.length}
          style={{ fontSize: `${fittedText.fontSize}px` }}
          x={geometry.box.x}
          y={fittedText.startY}
        >
          {fittedText.lines.map((line, index) => (
            <tspan
              key={`${geometry.id}-text-line-${index}`}
              x={geometry.box.x}
              dy={index === 0 ? 0 : fittedText.lineHeight}
            >
              {line}
            </tspan>
          ))}
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
            style={{ fontSize: `${geometry.equationFontSize ?? 31}px` }}
            // This markup is produced by KaTeX with trust disabled after a
            // CHALK command allowlist; raw model HTML never reaches this sink.
            dangerouslySetInnerHTML={{ __html: geometry.equationHtml }}
          />
        </foreignObject>
      ) : null}
    </g>
  );
}


function pathRevealProgress(
  geometry: BoardGeometry,
  path: BoardPath,
  progress: number,
): number {
  if (path.revealGroup === undefined) return easeInOut(clampPathProgress(progress));
  return revealGroupProgress(geometry.paths, path.revealGroup, progress);
}

function clampPathProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Strokes accelerate out of the start and settle into the end the way a hand
// does; endpoints stay exact so freeze/commit semantics are unchanged.
function easeInOut(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2;
}
