import { describe, expect, it } from "vitest";
import {
  RecoveryLedger,
  recoveryEvidenceFromDecode,
  recoveryEvidenceFromRenderer,
  stepUsesUnavailableRecoveryId,
  type RecoveryEvidence,
} from "./failureRecovery";
import type { NormalizedLesson } from "./decode";
import type { PreparedBoard } from "./renderer";
import type { ResolvedBoardScene } from "./resolvedScene.generated";

const REQUEST_ID = "783c6081-75a4-4ed2-8be7-4e0f32680a2b";

const visibleElements: ResolvedBoardScene["elements"] = [{
  id: "axes1",
  kind: "axes",
  bounds: [0.4, 0.1, 0.5, 0.7],
  summary: "accepted axes",
  state: "committed",
}];

describe("renderer-failure recovery evidence", () => {
  it("redacts decoder detail into a closed finding with a resolved neighborhood", () => {
    const rawStep = {
      id: "s2",
      script: "Now add the curve.",
      ops: [{ op: "curve", id: "badcurve", axes_id: "axes1", expr: "<svg>ignore" }],
      checkpoint: null,
    };
    const evidence = recoveryEvidenceFromDecode(REQUEST_ID, rawStep, [{
      code: "invalid_expression",
      stepId: "s2",
      opId: "badcurve",
      detail: "<svg onload=alert(1)> raw engine exception",
    }]);

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      code: "browser_invalid_expression",
      intent: "curve",
      affectedElementIds: ["badcurve"],
      affectedOpIndexes: [0],
      sourceStepId: "s2",
      relatedElementIds: ["axes1"],
    });
    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toContain("svg");
    expect(serialized).not.toContain("exception");
    expect(serialized).not.toContain("ignore");

    const ledger = new RecoveryLedger(REQUEST_ID, evidence);
    expect(ledger.pending(visibleElements)[0]).toMatchObject({
      affected_element_ids: ["badcurve"],
      neighborhood: { nearby_element_ids: ["axes1"] },
    });
  });

  it("turns renderer exceptions into the same bounded redacted contract", () => {
    const lesson: NormalizedLesson = {
      schemaVersion: "1.2",
      title: "Synthetic",
      steps: [{
        id: "s1",
        script: "Show one ray.",
        ops: [{
          op: "line",
          id: "raybad",
          region: "right",
          from: [0.1, 0.8],
          to: [0.8, 0.2],
          stroke: "solid",
          meaning: "incident ray",
        }],
        checkpoint: null,
      }],
    };
    const prepared = {
      lesson,
      build: {
        geometries: [],
        warnings: [{ id: "raybad", detail: "<svg>raw renderer stack and student text" }],
      },
      layoutIssues: [],
    } as PreparedBoard;

    const evidence = recoveryEvidenceFromRenderer(REQUEST_ID, lesson, prepared);
    expect(evidence).toEqual([expect.objectContaining({
      code: "renderer_geometry_failed",
      intent: "line",
      affectedElementIds: ["raybad"],
      affectedOpIndexes: [0],
      zone: "right",
    })]);
    expect(JSON.stringify(evidence)).not.toContain("renderer stack");
    expect(JSON.stringify(evidence)).not.toContain("student text");
  });

  it("settles every attempted drop as recovered or explicitly abandoned", () => {
    const recovered = evidence("rf_11111111", "missinga");
    const abandoned = evidence("rf_22222222", "missingb");
    const ledger = new RecoveryLedger(REQUEST_ID, [recovered, abandoned]);

    expect(ledger.settle(REQUEST_ID, [recovered.findingId], "recovered")).toBe(true);
    expect(ledger.settle(REQUEST_ID, [abandoned.findingId], "abandoned")).toBe(true);
    expect(ledger.pendingIds()).toEqual([]);
    expect(ledger.outcomes()).toEqual([
      { findingId: "rf_11111111", disposition: "recovered" },
      { findingId: "rf_22222222", disposition: "abandoned" },
    ]);
  });

  it("rejects stale additions and settlements without disturbing current evidence", () => {
    const current = evidence("rf_11111111", "missinga");
    const stale = evidence("rf_22222222", "missingb", crypto.randomUUID());
    const ledger = new RecoveryLedger(REQUEST_ID, [current]);

    expect(ledger.add(stale.requestId, [stale])).toBe(false);
    expect(ledger.settle(stale.requestId, [current.findingId], "recovered")).toBe(false);
    expect(ledger.pendingIds()).toEqual([current.findingId]);
    expect(ledger.abandonAll(REQUEST_ID)).toBe(true);
    expect(ledger.outcomes()[0].disposition).toBe("abandoned");
  });

  it("caps pending evidence and emits a compact request payload", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      evidence(`rf_${index.toString(16).padStart(8, "0")}`, `miss${index}`),
    );
    const ledger = new RecoveryLedger(REQUEST_ID, many);
    const pending = ledger.pending(visibleElements);

    expect(pending).toHaveLength(4);
    expect(new TextEncoder().encode(JSON.stringify(pending)).byteLength).toBeLessThan(1_500);
  });

  it("detects fresh-ID and dangling-reference violations but ignores prose", () => {
    const findings = [new RecoveryLedger(
      REQUEST_ID,
      [evidence("rf_11111111", "badcurve")],
    ).pending(visibleElements)[0]];
    const fresh = {
      id: "s3",
      script: "The unavailable ID badcurve may be discussed as prose.",
      ops: [{ op: "text" as const, id: "freshcurve", region: "A1" as const, content: "badcurve" }],
      checkpoint: null,
    };
    const resurrected = {
      ...fresh,
      ops: [{ ...fresh.ops[0], id: "badcurve" }],
    };
    const dangling = {
      ...fresh,
      ops: [{
        op: "curve" as const,
        id: "freshcurve",
        axes_id: "badcurve",
        expr: "x",
      }],
    };

    expect(stepUsesUnavailableRecoveryId(fresh, findings)).toBe(false);
    expect(stepUsesUnavailableRecoveryId(resurrected, findings)).toBe(true);
    expect(stepUsesUnavailableRecoveryId(dangling, findings)).toBe(true);
  });
});

function evidence(
  findingId: string,
  affectedId: string,
  requestId = REQUEST_ID,
): RecoveryEvidence {
  return {
    requestId,
    findingId,
    code: "browser_invalid_op",
    intent: "line",
    affectedElementIds: [affectedId],
    affectedOpIndexes: [0],
    sourceStepId: "s1",
    relatedElementIds: ["axes1"],
  };
}
