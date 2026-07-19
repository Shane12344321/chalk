import { describe, expect, it } from "vitest";
import { PartialInkStore } from "./partialInk";

const REQUEST = "123e4567-e89b-42d3-a456-426614174000";

describe("PartialInkStore", () => {
  it("keeps accepted points append-only and rejects reordered replacement", () => {
    const store = new PartialInkStore();
    store.beginRequest(REQUEST);
    expect(store.registerHeader({
      requestId: REQUEST,
      stepId: "s1",
      opId: "pen1",
      strokeCount: 1,
      pointBudget: 4,
    })).toBe(true);

    expect(store.accept({
      request_id: REQUEST,
      step_id: "s1",
      op_id: "pen1",
      stroke_index: 0,
      sequence: 0,
      points: [[0.1, 0.2], [0.2, 0.3]],
      complete: false,
    })).toBe("accepted");
    const prefix = store.snapshot("s1", "pen1");

    expect(store.accept({
      request_id: REQUEST,
      step_id: "s1",
      op_id: "pen1",
      stroke_index: 0,
      sequence: 0,
      points: [[0.9, 0.9]],
      complete: true,
    })).toBe("out_of_order");
    expect(store.snapshot("s1", "pen1")).toEqual(prefix);
  });

  it("freezes exactly at cancellation and rejects stale future deltas", () => {
    const store = new PartialInkStore();
    store.beginRequest(REQUEST);
    store.registerHeader({
      requestId: REQUEST,
      stepId: "s1",
      opId: "pen1",
      strokeCount: 1,
      pointBudget: 3,
    });
    store.accept({
      request_id: REQUEST,
      step_id: "s1",
      op_id: "pen1",
      stroke_index: 0,
      sequence: 0,
      points: [[0.1, 0.2]],
      complete: false,
    });
    store.cancelRequest(REQUEST);

    expect(store.snapshot("s1", "pen1")).toBeUndefined();
    expect(store.accept({
      request_id: REQUEST,
      step_id: "s1",
      op_id: "pen1",
      stroke_index: 0,
      sequence: 1,
      points: [[0.2, 0.3]],
      complete: true,
    })).toBe("stale_request");
  });

  it("enforces accepted header and total point budgets without mutation", () => {
    const store = new PartialInkStore();
    store.beginRequest(REQUEST);
    expect(store.registerHeader({
      requestId: REQUEST,
      stepId: "s1",
      opId: "pen1",
      strokeCount: 1,
      pointBudget: 2,
    })).toBe(true);
    expect(store.accept({
      request_id: REQUEST,
      step_id: "s1",
      op_id: "pen1",
      stroke_index: 0,
      sequence: 0,
      points: [[0.1, 0.1], [0.2, 0.2], [0.3, 0.3]],
      complete: false,
    })).toBe("invalid_delta");
    expect(store.snapshot("s1", "pen1")?.strokes[0]).toEqual([]);
  });
});
