import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ATTENTION_QUEUE_LIMIT,
  useAttentionChoreography,
  type AttentionContext,
} from "./attentionChoreography";

const BASE: AttentionContext = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  manifestVersion: 7,
  phase: "QA",
  visibleElementIds: ["ray1", "curve1"],
  interruptionEpoch: 0,
};

describe("attention choreography rail", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("executes bounded actions sequentially and cleans each one automatically", () => {
    const { result } = renderHook(() => useAttentionChoreography(BASE));
    let firstId = "";
    act(() => {
      const first = result.current.enqueue("trace_path", "ray1");
      const second = result.current.enqueue("focus_on", "curve1");
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (first.ok) firstId = first.overlayId;
    });
    expect(result.current.overlays).toHaveLength(1);
    expect(result.current.overlays[0]).toMatchObject({
      id: firstId,
      kind: "trace_path",
      targetId: "ray1",
      requestId: BASE.requestId,
      manifestVersion: 7,
    });

    act(() => vi.advanceTimersByTime(2_600));
    expect(result.current.overlays).toHaveLength(1);
    expect(result.current.overlays[0]?.kind).toBe("focus_on");
    act(() => vi.advanceTimersByTime(2_400));
    expect(result.current.overlays).toEqual([]);
  });

  it("rejects non-QA phases, unknown targets, and action floods", () => {
    const context = { ...BASE };
    const { result, rerender } = renderHook(() => useAttentionChoreography(context));
    expect(result.current.enqueue("point_at", "future")).toEqual({
      ok: false,
      reason: "unknown_element",
    });
    act(() => {
      for (let index = 0; index < ATTENTION_QUEUE_LIMIT; index += 1) {
        expect(result.current.enqueue("flash", "ray1").ok).toBe(true);
      }
    });
    expect(result.current.enqueue("flash", "ray1")).toEqual({
      ok: false,
      reason: "queue_full",
    });
    context.phase = "TEACHING";
    rerender();
    expect(result.current.enqueue("point_at", "ray1")).toEqual({
      ok: false,
      reason: "not_in_attention_phase",
    });
  });

  it("cancels on interruption, lesson changes, manifest changes, and target removal", () => {
    const context = { ...BASE, visibleElementIds: [...BASE.visibleElementIds] };
    const { result, rerender } = renderHook(() => useAttentionChoreography(context));
    act(() => void result.current.enqueue("circle_el", "ray1"));
    expect(result.current.overlays).toHaveLength(1);

    context.interruptionEpoch += 1;
    rerender();
    expect(result.current.overlays).toEqual([]);

    act(() => void result.current.enqueue("circle_el", "ray1"));
    context.manifestVersion += 1;
    rerender();
    expect(result.current.overlays).toEqual([]);

    act(() => void result.current.enqueue("circle_el", "ray1"));
    context.requestId = "123e4567-e89b-42d3-a456-426614174001";
    rerender();
    expect(result.current.overlays).toEqual([]);

    act(() => void result.current.enqueue("circle_el", "ray1"));
    context.visibleElementIds = ["curve1"];
    rerender();
    expect(result.current.overlays).toEqual([]);
  });
});
