import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverlayLayer, type DeixisOverlay } from "./overlays";
import type { BoardGeometry } from "./geometry";
import type { VisibleBoardElement } from "./manifest";

const element: VisibleBoardElement = {
  id: "rangecurve",
  kind: "curve",
  box: { x: 800, y: 100, width: 620, height: 430 },
  summary: "range curve",
};

describe("deixis overlay layer", () => {
  it.each(["point_at", "circle_el", "underline", "flash"] as const)(
    "renders %s only for a committed target",
    (kind) => {
      const overlay: DeixisOverlay = { id: `overlay-${kind}`, kind, targetId: element.id };
      const view = render(<svg><OverlayLayer overlays={[overlay]} elements={[element]} /></svg>);
      expect(view.container.querySelector(`[data-overlay-kind="${kind}"]`)).not.toBeNull();
      view.rerender(<svg><OverlayLayer overlays={[overlay]} elements={[]} /></svg>);
      expect(view.container.querySelector(`[data-overlay-kind="${kind}"]`)).toBeNull();
    },
  );

  it("keeps rough overlay paths stable across rerenders", () => {
    const overlay: DeixisOverlay = {
      id: "overlay-circle",
      kind: "circle_el",
      targetId: element.id,
    };
    const view = render(<svg><OverlayLayer overlays={[overlay]} elements={[element]} /></svg>);
    const original = view.container.querySelector("path")?.getAttribute("d");
    view.rerender(<svg><OverlayLayer overlays={[overlay]} elements={[{ ...element }]} /></svg>);
    expect(view.container.querySelector("path")?.getAttribute("d")).toBe(original);
  });

  it("traces the target's actual retained path and restores without geometry mutation", () => {
    const geometry: BoardGeometry = {
      id: element.id,
      kind: "curve",
      box: { ...element.box },
      paths: [{ d: "M800 500 C900 120 1200 120 1420 500", fill: "none", stroke: "#222", strokeWidth: 4 }],
      labels: [],
      manifestSummary: element.summary,
      stepIndex: 0,
      opIndex: 0,
    };
    const before = JSON.stringify(geometry);
    const overlay: DeixisOverlay = {
      id: "attention-trace",
      kind: "trace_path",
      targetId: element.id,
      durationMs: 2_600,
    };
    const view = render(
      <svg><OverlayLayer overlays={[overlay]} elements={[element]} geometries={[geometry]} /></svg>,
    );
    const trace = view.container.querySelector('[data-overlay-kind="trace_path"] path');
    expect(trace?.getAttribute("d")).toBe(geometry.paths[0].d);
    view.rerender(<svg><OverlayLayer overlays={[]} elements={[element]} geometries={[geometry]} /></svg>);
    expect(view.container.querySelector('[data-overlay-kind="trace_path"]')).toBeNull();
    expect(JSON.stringify(geometry)).toBe(before);
  });

  it("dims everything except the current target with a transient SVG mask", () => {
    const overlay: DeixisOverlay = {
      id: "attention-focus",
      kind: "focus_on",
      targetId: element.id,
      durationMs: 2_400,
    };
    const view = render(<svg><OverlayLayer overlays={[overlay]} elements={[element]} /></svg>);
    const focus = view.container.querySelector('[data-overlay-kind="focus_on"]');
    expect(focus?.querySelector("mask")).not.toBeNull();
    expect(focus?.querySelector("rect[mask]")).not.toBeNull();
  });
});
