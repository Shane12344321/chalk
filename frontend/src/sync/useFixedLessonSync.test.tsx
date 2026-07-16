import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { decodeLesson } from "../board/decode";
import type { ConnectionStatus, RealtimeClient } from "../realtime";
import { useFixedLessonSync } from "./useFixedLessonSync";

const lesson = decodeLesson(projectileLesson).lesson!;

function setup(status: ConnectionStatus = "connected", responseIdle = true) {
  const requestNarration = vi.fn();
  const clientRef = {
    current: { requestNarration } as unknown as RealtimeClient,
  };
  const hook = renderHook(
    ({ connectionStatus, idle }) =>
      useFixedLessonSync({
        lesson,
        clientRef,
        connectionStatus,
        responseIdle: idle,
      }),
    { initialProps: { connectionStatus: status, idle: responseIdle } },
  );
  return { ...hook, requestNarration };
}

describe("fixed lesson synchronization effects", () => {
  it("waits for the active response to become idle before requesting narration", () => {
    const { result, rerender, requestNarration } = setup("connected", false);
    act(() => result.current.start());
    expect(result.current.state.phase).toBe("TEACHING");
    expect(requestNarration).not.toHaveBeenCalled();

    rerender({ connectionStatus: "connected", idle: true });
    expect(requestNarration).toHaveBeenCalledOnce();
  });

  it("resets an in-progress lesson when its connected session ends", () => {
    const { result, rerender } = setup();
    act(() => result.current.start());
    expect(result.current.state.phase).toBe("TEACHING");

    rerender({ connectionStatus: "disconnected", idle: true });
    expect(result.current.state.phase).toBe("IDLE");
    expect(result.current.state.currentStepProgress).toBe(0);
  });

  it("recovers from a correlated narration rejection", () => {
    const { result } = setup();
    act(() => result.current.start());
    const state = result.current.state;
    act(() =>
      result.current.onSemanticEvent({
        type: "narration.failed",
        context: {
          requestId: state.requestId,
          stepId: state.stepIds[state.currentStepIndex],
          cycle: state.cycle,
        },
      }),
    );
    expect(result.current.state.phase).toBe("IDLE");
  });
});
