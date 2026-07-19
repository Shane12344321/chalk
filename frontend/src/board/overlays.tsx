import { useMemo, type CSSProperties } from "react";
import rough from "roughjs/bin/rough";
import { stableSeed } from "./geometry";
import type { BoardGeometry, BoardPath } from "./geometry";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./layout";
import type { VisibleBoardElement } from "./manifest";

export type DeixisKind =
  | "point_at"
  | "circle_el"
  | "underline"
  | "flash"
  | "trace_path"
  | "focus_on";

export interface DeixisOverlay {
  id: string;
  kind: DeixisKind;
  targetId: string;
  /** Present on Phase-5 rail actions; omitted by the dependable legacy path. */
  requestId?: string;
  manifestVersion?: number;
  durationMs?: number;
}

interface OverlayLayerProps {
  overlays: readonly DeixisOverlay[];
  elements: readonly VisibleBoardElement[];
  geometries?: readonly BoardGeometry[];
}

export function OverlayLayer({ overlays, elements, geometries = [] }: OverlayLayerProps) {
  const targets = useMemo(
    () => new Map(elements.map((element) => [element.id, element])),
    [elements],
  );
  return (
    <g className="board-overlay-layer" aria-label="Temporary board highlights">
      {overlays.map((overlay) => {
        const target = targets.get(overlay.targetId);
        return target ? (
          <OverlayMark
            key={overlay.id}
            overlay={overlay}
            target={target}
            tracePaths={tracePathsForTarget(overlay.targetId, geometries)}
          />
        ) : null;
      })}
    </g>
  );
}

function OverlayMark({
  overlay,
  target,
  tracePaths,
}: {
  overlay: DeixisOverlay;
  target: VisibleBoardElement;
  tracePaths: readonly BoardPath[];
}) {
  const paths = useMemo(() => overlayPaths(overlay, target), [overlay, target]);
  const { box } = target;
  const style = overlay.durationMs
    ? ({ "--attention-duration": `${overlay.durationMs}ms` } as CSSProperties)
    : undefined;
  if (overlay.kind === "focus_on") {
    const maskId = `focus-mask-${overlay.id.replace(/[^a-zA-Z0-9_-]/gu, "")}`;
    return (
      <g
        className="board-overlay board-overlay-focus_on"
        data-overlay-id={overlay.id}
        data-overlay-kind={overlay.kind}
        data-target-id={target.id}
        style={style}
      >
        <defs>
          <mask id={maskId}>
            <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="white" />
            <rect
              x={box.x - 18}
              y={box.y - 18}
              width={box.width + 36}
              height={box.height + 36}
              rx="24"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          fill="#ffffff"
          fillOpacity="0.58"
          mask={`url(#${maskId})`}
        />
      </g>
    );
  }
  if (overlay.kind === "trace_path" && tracePaths.length > 0) {
    return (
      <g
        className="board-overlay board-overlay-trace_path"
        data-overlay-id={overlay.id}
        data-overlay-kind={overlay.kind}
        data-target-id={target.id}
        style={style}
      >
        {tracePaths.map((path, index) => (
          <path
            key={`${overlay.id}-trace-${index}`}
            d={path.d}
            fill="none"
            pathLength={1}
            stroke="#d97a29"
            strokeDasharray="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={Math.max(7, path.strokeWidth + 3)}
          />
        ))}
      </g>
    );
  }
  if (overlay.kind === "flash") {
    return (
      <rect
        className="board-overlay board-overlay-flash"
        data-overlay-id={overlay.id}
        data-overlay-kind={overlay.kind}
        data-target-id={target.id}
        fill="none"
        height={box.height + 20}
        rx="18"
        stroke="#d97a29"
        strokeWidth="9"
        style={style}
        width={box.width + 20}
        x={box.x - 10}
        y={box.y - 10}
      />
    );
  }
  return (
    <g
      className={`board-overlay board-overlay-${overlay.kind}`}
      data-overlay-id={overlay.id}
      data-overlay-kind={overlay.kind}
      data-target-id={target.id}
      style={style}
    >
      {paths.map((path, index) => (
        <path
          key={`${overlay.id}-${index}`}
          d={path.d}
          fill={path.fill}
          stroke={path.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={path.strokeWidth}
        />
      ))}
      {overlay.kind === "point_at" ? (
        <circle cx={box.x - 18} cy={box.y + box.height / 2} fill="#d97a29" r="9" />
      ) : null}
    </g>
  );
}

function tracePathsForTarget(
  targetId: string,
  geometries: readonly BoardGeometry[],
): readonly BoardPath[] {
  const root = geometries.find((geometry) => geometry.id === targetId);
  if (root) return root.paths;
  for (const geometry of geometries) {
    const part = geometry.manifestParts?.find((candidate) => candidate.id === targetId);
    if (part) {
      return geometry.paths.filter((path) => path.revealGroup === part.revealGroup);
    }
  }
  return [];
}

interface OverlayPath {
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

function overlayPaths(
  overlay: DeixisOverlay,
  target: VisibleBoardElement,
): OverlayPath[] {
  const { box } = target;
  const generator = rough.generator();
  const seed = stableSeed(`${overlay.kind}:${target.id}`);
  const drawable =
    overlay.kind === "circle_el"
      ? generator.ellipse(
          box.x + box.width / 2,
          box.y + box.height / 2,
          box.width + 28,
          box.height + 28,
          { seed, roughness: 1.1 },
        )
      : overlay.kind === "underline"
        ? generator.line(
            box.x - 4,
            box.y + box.height + 12,
            box.x + box.width + 4,
            box.y + box.height + 12,
            { seed, roughness: 1.25 },
          )
        : generator.line(
            Math.max(18, box.x - 78),
            box.y + box.height / 2,
            box.x - 18,
            box.y + box.height / 2,
            { seed, roughness: 1.1 },
          );
  return generator.toPaths(drawable).map((path) => ({
    d: path.d,
    fill: path.fill && path.fill !== "none" ? path.fill : "none",
    stroke: "#d97a29",
    strokeWidth: 6,
  }));
}
