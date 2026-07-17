import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverlayLayer, type DeixisOverlay } from "./overlays";
import type { VisibleBoardElement } from "./manifest";

const element: VisibleBoardElement = {
  id: "rangecurve",
  kind: "curve",
  box: { x: 800, y: 100, width: 620, height: 430 },
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
});
