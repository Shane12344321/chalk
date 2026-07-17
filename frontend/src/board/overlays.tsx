import { useMemo } from "react";
import rough from "roughjs/bin/rough";
import { stableSeed } from "./geometry";
import type { VisibleBoardElement } from "./manifest";

export type DeixisKind = "point_at" | "circle_el" | "underline" | "flash";

export interface DeixisOverlay {
  id: string;
  kind: DeixisKind;
  targetId: string;
}

interface OverlayLayerProps {
  overlays: readonly DeixisOverlay[];
  elements: readonly VisibleBoardElement[];
}

export function OverlayLayer({ overlays, elements }: OverlayLayerProps) {
  const targets = useMemo(
    () => new Map(elements.map((element) => [element.id, element])),
    [elements],
  );
  return (
    <g className="board-overlay-layer" aria-label="Temporary board highlights">
      {overlays.map((overlay) => {
        const target = targets.get(overlay.targetId);
        return target ? <OverlayMark key={overlay.id} overlay={overlay} target={target} /> : null;
      })}
    </g>
  );
}

function OverlayMark({
  overlay,
  target,
}: {
  overlay: DeixisOverlay;
  target: VisibleBoardElement;
}) {
  const paths = useMemo(() => overlayPaths(overlay, target), [overlay, target]);
  const { box } = target;
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
        stroke="#efc76a"
        strokeWidth="9"
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
        <circle cx={box.x - 18} cy={box.y + box.height / 2} fill="#efc76a" r="9" />
      ) : null}
    </g>
  );
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
    stroke: "#efc76a",
    strokeWidth: 6,
  }));
}
