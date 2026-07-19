import { describe, expect, it, vi } from "vitest";
import { LessonContinuationClient } from "./continuation";
import type { RecoveryFinding } from "../board/resolvedScene.generated";

const REQUEST_ID = "783c6081-75a4-4ed2-8be7-4e0f32680a2b";
const CLIENT_ID = "2f2db996-2dcc-4fc8-aa7f-206c7e7a9300";
const RECEIPT = `v1.${"a".repeat(60)}.${"b".repeat(43)}`;
const HASH = "a".repeat(64);
const responseMetadata = {
  board_model: "gpt-5.6-luna",
  board_reasoning_effort: "none",
  board_prompt_sha256: HASH,
  repair_prompt_sha256: HASH,
  continuation_prompt_sha256: HASH,
  configuration_sha256: HASH,
};
const step = {
  id: "s1",
  script: "A short valid explanation.",
  ops: [{ op: "text" as const, id: "label", region: "A1" as const, content: "Slope" }],
  checkpoint: null,
};
const plan = {
  kind: "lesson_plan" as const,
  visual_structure: "A left-to-right slope argument",
  progression: ["define slope", "draw curve", "add tangent"] as [string, string, string],
  checkpoint_step: 2,
};
const scene = {
  schema_version: "1.0" as const,
  request_id: REQUEST_ID,
  prefix_version: 1,
  elements: [{
    id: "label",
    kind: "text" as const,
    bounds: [0.03, 0.05, 0.2, 0.08] as [number, number, number, number],
    summary: "slope label",
    state: "committed" as const,
  }],
  findings: [] as [],
};

describe("LessonContinuationClient", () => {
  it("replays the prefix and accepts exactly one browser-valid next step", async () => {
    const nextStep = { ...step, id: "s2", ops: [{ ...step.ops[0], id: "nextlabel" }] };
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      request_id: REQUEST_ID,
      prefix_version: 1,
      done: false,
      step: nextStep,
      repairs: 0,
      sanitized_fields: 0,
      continuation_receipt: RECEIPT,
      ...responseMetadata,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const client = new LessonContinuationClient("http://127.0.0.1:8000", CLIENT_ID, fetchImpl);
    const result = await client.next({
      requestId: REQUEST_ID,
      topic: "Derivative",
      studentContext: "",
      acceptedPrefix: [step],
      receiptPrefix: [step],
      plan,
      resolvedScene: scene,
      repairsUsed: 0,
      continuationReceipt: RECEIPT,
    });

    expect(result).toMatchObject({ done: false, step: { id: "s2" } });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.prefix_version).toBe(1);
    expect(body.resolved_scene.elements[0].summary).toBe("slope label");
    expect(body.continuation_receipt).toBe(RECEIPT);
    expect(body.receipt_prefix).toEqual([step]);
  });

  it("preserves the exact server step when browser validation filters one op", async () => {
    const serverStep = {
      ...step,
      id: "s2",
      ops: [
        { ...step.ops[0], id: "keptlabel" },
        {
          op: "line" as const,
          id: "failedline",
          region: "A2" as const,
          from: [0.5, 0.5] as [number, number],
          to: [0.5, 0.5] as [number, number],
          stroke: "solid" as const,
        },
      ],
    };
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      request_id: REQUEST_ID,
      prefix_version: 1,
      done: false,
      step: serverStep,
      repairs: 0,
      sanitized_fields: 0,
      continuation_receipt: RECEIPT,
      ...responseMetadata,
    }), { status: 200 }));
    const client = new LessonContinuationClient("http://127.0.0.1:8000", CLIENT_ID, fetchImpl);

    const result = await client.next({
      requestId: REQUEST_ID,
      topic: "Derivative",
      studentContext: "",
      acceptedPrefix: [step],
      receiptPrefix: [step],
      plan,
      resolvedScene: scene,
      repairsUsed: 0,
      continuationReceipt: RECEIPT,
    });

    expect(result).toMatchObject({
      done: false,
      browserDropped: false,
      step: { ops: [{ id: "keptlabel" }] },
      receiptStep: serverStep,
      recoveryEvidence: [{
        code: "browser_invalid_op",
        affectedElementIds: ["failedline"],
        affectedOpIndexes: [1],
      }],
    });
  });

  it("returns closed evidence and the signed raw step when every op is dropped", async () => {
    const serverStep = {
      ...step,
      id: "s2",
      ops: [{
        op: "line" as const,
        id: "failedline",
        region: "A2" as const,
        from: [0.5, 0.5] as [number, number],
        to: [0.5, 0.5] as [number, number],
        stroke: "solid" as const,
      }],
    };
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      request_id: REQUEST_ID,
      prefix_version: 1,
      done: false,
      step: serverStep,
      repairs: 0,
      sanitized_fields: 0,
      continuation_receipt: RECEIPT,
      ...responseMetadata,
    }), { status: 200 }));
    const client = new LessonContinuationClient("http://127.0.0.1:8000", CLIENT_ID, fetchImpl);

    const result = await client.next({
      requestId: REQUEST_ID,
      topic: "Derivative",
      studentContext: "",
      acceptedPrefix: [step],
      receiptPrefix: [step],
      plan,
      resolvedScene: scene,
      repairsUsed: 0,
      continuationReceipt: RECEIPT,
    });

    expect(result).toMatchObject({
      done: false,
      browserDropped: true,
      receiptStep: serverStep,
      recoveryEvidence: [{
        code: "browser_invalid_op",
        affectedElementIds: ["failedline"],
        affectedOpIndexes: [0],
      }],
    });
  });

  it("accepts a clean early terminal instead of waiting for missing ink", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      request_id: REQUEST_ID,
      prefix_version: 1,
      done: true,
      reason: "continuation_unavailable",
      repairs: 0,
      ...responseMetadata,
    }), { status: 200 }));
    const client = new LessonContinuationClient("http://127.0.0.1:8000", CLIENT_ID, fetchImpl);
    await expect(client.next({
      requestId: REQUEST_ID,
      topic: "Derivative",
      studentContext: "",
      acceptedPrefix: [step],
      receiptPrefix: [step],
      plan,
      resolvedScene: scene,
      repairsUsed: 0,
      continuationReceipt: RECEIPT,
    })).resolves.toMatchObject({ done: true, reason: "continuation_unavailable", repairs: 0 });
  });

  it("rejects terminal reasons outside the shared closed enum", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      request_id: REQUEST_ID,
      prefix_version: 1,
      done: true,
      reason: "model_said_something_unbounded",
      repairs: 0,
      ...responseMetadata,
    }), { status: 200 }));
    const client = new LessonContinuationClient("http://127.0.0.1:8000", CLIENT_ID, fetchImpl);
    await expect(client.next({
      requestId: REQUEST_ID,
      topic: "Derivative",
      studentContext: "",
      acceptedPrefix: [step],
      receiptPrefix: [step],
      plan,
      resolvedScene: scene,
      repairsUsed: 0,
      continuationReceipt: RECEIPT,
    })).rejects.toThrow("shared contract");
  });

  it("accepts explicit clean abandonment when bounded visual recovery fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      request_id: REQUEST_ID,
      prefix_version: 1,
      done: true,
      reason: "recovery_abandoned",
      repairs: 0,
      ...responseMetadata,
    }), { status: 200 }));
    const client = new LessonContinuationClient("http://127.0.0.1:8000", CLIENT_ID, fetchImpl);
    await expect(client.next({
      requestId: REQUEST_ID,
      topic: "Derivative",
      studentContext: "",
      acceptedPrefix: [step],
      receiptPrefix: [step],
      plan,
      resolvedScene: scene,
      repairsUsed: 0,
      continuationReceipt: RECEIPT,
    })).resolves.toMatchObject({ done: true, reason: "recovery_abandoned" });
  });

  it("defensively rejects a continuation that resurrects a failed visual ID", async () => {
    const recoveredScene = {
      ...scene,
      recovery_findings: [{
        finding_id: "rf_1234abcd" as const,
        code: "browser_invalid_op" as const,
        intent: "text" as const,
        status: "pending" as const,
        affected_element_ids: ["failedid"] as [string],
        affected_op_indexes: [0] as [number],
        source_step_id: "s1",
        neighborhood: { nearby_element_ids: ["label"] as [string] },
      }] as [RecoveryFinding],
    };
    const resurrected = {
      ...step,
      id: "s2",
      ops: [{ ...step.ops[0], id: "failedid" }],
    };
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      request_id: REQUEST_ID,
      prefix_version: 1,
      done: false,
      step: resurrected,
      repairs: 0,
      sanitized_fields: 0,
      continuation_receipt: RECEIPT,
      ...responseMetadata,
    }), { status: 200 }));
    const client = new LessonContinuationClient("http://127.0.0.1:8000", CLIENT_ID, fetchImpl);
    await expect(client.next({
      requestId: REQUEST_ID,
      topic: "Derivative",
      studentContext: "",
      acceptedPrefix: [step],
      receiptPrefix: [step],
      plan,
      resolvedScene: recoveredScene,
      repairsUsed: 0,
      continuationReceipt: RECEIPT,
    })).rejects.toThrow("unavailable visual output");
  });

  it("aborts a stale in-flight continuation when a newer request starts", async () => {
    let call = 0;
    const terminal = {
      request_id: REQUEST_ID,
      prefix_version: 1,
      done: true,
      reason: "plan_complete",
      repairs: 0,
      ...responseMetadata,
    };
    const fetchImpl = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) => {
        call += 1;
        if (call === 2) return Promise.resolve(new Response(JSON.stringify(terminal)));
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          }, { once: true });
        });
      },
    );
    const client = new LessonContinuationClient("http://127.0.0.1:8000", CLIENT_ID, fetchImpl);
    const request = {
      requestId: REQUEST_ID,
      topic: "Derivative",
      studentContext: "",
      acceptedPrefix: [step],
      receiptPrefix: [step],
      plan,
      resolvedScene: scene,
      repairsUsed: 0,
      continuationReceipt: RECEIPT,
    };
    const stale = client.next(request);
    const staleExpectation = expect(stale).rejects.toMatchObject({ name: "AbortError" });
    await expect(client.next(request)).resolves.toMatchObject({
      done: true,
      reason: "plan_complete",
    });
    await staleExpectation;
  });

  it("rejects a superseded result even when fetch ignores AbortSignal", async () => {
    let resolveStale!: (response: Response) => void;
    let call = 0;
    const terminal = {
      request_id: REQUEST_ID,
      prefix_version: 1,
      done: true,
      reason: "plan_complete",
      repairs: 0,
      ...responseMetadata,
    };
    const fetchImpl = vi.fn().mockImplementation(() => {
      call += 1;
      if (call === 2) return Promise.resolve(new Response(JSON.stringify(terminal)));
      return new Promise<Response>((resolve) => {
        resolveStale = resolve;
      });
    });
    const client = new LessonContinuationClient("http://127.0.0.1:8000", CLIENT_ID, fetchImpl);
    const request = {
      requestId: REQUEST_ID,
      topic: "Derivative",
      studentContext: "",
      acceptedPrefix: [step],
      receiptPrefix: [step],
      plan,
      resolvedScene: scene,
      repairsUsed: 0,
      continuationReceipt: RECEIPT,
    };
    const stale = client.next(request);
    await expect(client.next(request)).resolves.toMatchObject({ done: true });
    resolveStale(new Response(JSON.stringify(terminal)));
    await expect(stale).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects a late result after explicit cancellation even if fetch does not abort", async () => {
    let resolveLate!: (response: Response) => void;
    const fetchImpl = vi.fn().mockImplementation(() =>
      new Promise<Response>((resolve) => {
        resolveLate = resolve;
      }),
    );
    const client = new LessonContinuationClient("http://127.0.0.1:8000", CLIENT_ID, fetchImpl);
    const pending = client.next({
      requestId: REQUEST_ID,
      topic: "Derivative",
      studentContext: "",
      acceptedPrefix: [step],
      receiptPrefix: [step],
      plan,
      resolvedScene: scene,
      repairsUsed: 0,
      continuationReceipt: RECEIPT,
    });
    client.cancel();
    resolveLate(new Response(JSON.stringify({
      request_id: REQUEST_ID,
      prefix_version: 1,
      done: true,
      reason: "plan_complete",
      repairs: 0,
      ...responseMetadata,
    })));
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
