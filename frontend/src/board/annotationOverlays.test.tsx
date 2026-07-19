import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AnnotationOp } from "../annotations";
import { AnnotationOverlayLayer } from "./annotationOverlays";
import type { VisibleBoardElement } from "./manifest";

const target: VisibleBoardElement = {
  id: "rangecurve",
  kind: "curve",
  box: { x: 800, y: 100, width: 620, height: 430 },
  summary: "range curve",
};

describe("annotation overlay layer", () => {
  it("renders the bounded overlay primitives against committed targets", () => {
    const ops: AnnotationOp[] = [
      { op: "circle", id: "mark", target_id: target.id },
      { op: "underline", id: "under", target_id: target.id },
      { op: "arrow", id: "arrow", target_id: target.id, side: "left" },
      { op: "text", id: "label", target_id: target.id, side: "below", content: "Peak at 45°" },
      { op: "equation", id: "eq", target_id: target.id, side: "above", latex: "2\\theta=90^\\circ" },
    ];
    const view = render(
      <svg><AnnotationOverlayLayer ops={ops} elements={[target]} /></svg>,
    );
    for (const op of ops) {
      expect(view.container.querySelector(`[data-annotation-id="${op.id}"]`)).not.toBeNull();
    }
  });

  it("omits stale targets and isolates unsafe equation rendering", () => {
    const unsafe: AnnotationOp = {
      op: "equation",
      id: "unsafe",
      target_id: target.id,
      side: "above",
      latex: "\\href{x}{y}",
    };
    const stale: AnnotationOp = { op: "circle", id: "stale", target_id: "future" };
    const view = render(
      <svg><AnnotationOverlayLayer ops={[unsafe, stale]} elements={[target]} /></svg>,
    );
    expect(view.container.querySelector("[data-annotation-id]")).toBeNull();
  });
});
