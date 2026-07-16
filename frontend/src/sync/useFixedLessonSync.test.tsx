import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { decodeLesson } from "../board/decode";
import type { ConnectionStatus, RealtimeClient } from "../realtime";
import { useFixedLessonSync } from "./useFixedLessonSync";

const lesson = decodeLesson(projectileLesson).lesson!;

function setup(status: ConnectionStatus = "connected", responseIdle = true) {
  const requestNarration = vi.fn();
  const requestCheckpointPrompt = vi.fn();
  const expectAutomaticResponse = vi.fn();
  const cancelExpectedAutomaticResponse = vi.fn();
  const setInteractionGuidance = vi.fn().mockResolvedValue(undefined);
  const clientRef = {
    current: {
      requestNarration,
      requestCheckpointPrompt,
      expectAutomaticResponse,
      cancelExpectedAutomaticResponse,
      setInteractionGuidance,
    } as unknown as RealtimeClient,
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
  return {
    ...hook,
    requestNarration,
    requestCheckpointPrompt,
    expectAutomaticResponse,
    cancelExpectedAutomaticResponse,
    setInteractionGuidance,
  };
}

describe("fixed lesson synchronization effects", () => {
  it("waits for the active response to become idle before requesting narration", async () => {
    const { result, rerender, requestNarration } = setup("connected", false);
    act(() => result.current.start());
    expect(result.current.state.phase).toBe("TEACHING");
    expect(requestNarration).not.toHaveBeenCalled();

    rerender({ connectionStatus: "connected", idle: true });
    await waitFor(() => expect(requestNarration).toHaveBeenCalledOnce());
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

  it("assigns an interrupted teaching response to student Q&A", async () => {
    const { result, expectAutomaticResponse } = setup();
    act(() => result.current.start());
    act(() => result.current.onSemanticEvent({ type: "student.speech_started" }));

    expect(expectAutomaticResponse).toHaveBeenCalledWith(
      "student_qa",
      expect.objectContaining({ stepId: "s1" }),
    );
    await waitFor(() => expect(result.current.state.phase).toBe("QA"));
  });

  it("clears an unbound Q&A expectation when the user resumes", async () => {
    const { result, cancelExpectedAutomaticResponse } = setup();
    act(() => result.current.start());
    act(() => result.current.onSemanticEvent({ type: "student.speech_started" }));
    await waitFor(() => expect(result.current.state.phase).toBe("QA"));
    act(() => result.current.resume());

    expect(cancelExpectedAutomaticResponse).toHaveBeenCalledWith(
      "student_qa",
      expect.objectContaining({ stepId: "s1", cycle: 1 }),
    );
    expect(result.current.state.phase).toBe("TEACHING");
  });
});
