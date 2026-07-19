import {
  SurfacedLayoutFindings,
  layoutLintEvidence,
  type LayoutLintIssue,
} from "./layoutLint";

export type VisualRepairMode = "off" | "lint-only" | "one-pass";

export interface VisualRepairCandidate {
  requestId: string;
  stepId: string;
  findings: LayoutLintIssue[];
}

/**
 * Authorizes at most one visual repair for one candidate. Estimated findings
 * remain diagnostics and can never spend a call.
 */
export class VisualRepairGate {
  private readonly surfaced = new SurfacedLayoutFindings();
  private readonly attempted = new Set<string>();

  constructor(readonly mode: VisualRepairMode) {}

  candidate(
    requestId: string,
    stepId: string,
    measured: readonly LayoutLintIssue[],
    semantic: readonly LayoutLintIssue[] = [],
  ): VisualRepairCandidate | undefined {
    if (this.mode !== "one-pass") return undefined;
    const key = `${requestId}:${stepId}`;
    if (this.attempted.has(key)) return undefined;
    const eligible = this.surfaced.unsurfaced([
      ...measured,
      ...semantic.filter((issue) => layoutLintEvidence(issue.code) !== "estimated"),
    ]);
    if (eligible.length === 0) return undefined;
    this.attempted.add(key);
    this.surfaced.markSurfaced(eligible);
    return { requestId, stepId, findings: eligible };
  }
}

export function parseVisualRepairMode(value: unknown): VisualRepairMode {
  return value === "one-pass" || value === "off" ? value : "lint-only";
}
