import type { LayoutBox } from "./layout";

/**
 * One renderer-owned mapping for the drawable interior of axes. Curves and
 * construction relations must share this exact box or conceptual contact can
 * drift when axis labels or margins change.
 */
export function axesPlotBox(box: LayoutBox): LayoutBox {
  return {
    x: box.x + 58,
    y: box.y + 24,
    width: box.width - 82,
    height: box.height - 76,
  };
}
