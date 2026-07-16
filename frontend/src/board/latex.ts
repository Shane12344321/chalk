import katex from "katex";

const FORBIDDEN_LATEX_COMMAND =
  /\\(?:href|url|includegraphics|html[a-z]*|class|style|gdef|def|newcommand|renewcommand)\b/i;

export function renderSafeLatex(latex: string): string {
  if (latex.length === 0 || latex.length > 160) {
    throw new Error("Equation length is outside the allowed budget.");
  }
  if (FORBIDDEN_LATEX_COMMAND.test(latex)) {
    throw new Error("Equation contains a forbidden command.");
  }
  return katex.renderToString(latex, {
    displayMode: true,
    output: "htmlAndMathml",
    strict: "error",
    throwOnError: true,
    trust: false,
    maxExpand: 100,
    maxSize: 12,
  });
}
