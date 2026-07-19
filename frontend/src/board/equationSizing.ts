/** The single font-size rule shared by precommit DOM measurement and painting. */
export function equationFontSizeForContent(latex: string, width: number): number {
  const visibleLength = latex
    .replace(/\\(?:frac|over|bigg|quad|qquad|mathrm|text|sin|cos|ln|sqrt|cdot|theta|omega|lambda|pi|Delta|sum|approx|Rightarrow|circ|vec)/gu, "x")
    .replace(/[{}\\_^|]/gu, "")
    .length;
  return Math.max(10, Math.min(31, width / Math.max(10, visibleLength * 0.9)));
}
