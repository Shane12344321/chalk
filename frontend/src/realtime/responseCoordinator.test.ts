import { describe, expect, it } from "vitest";
import { ResponseCoordinator } from "./responseCoordinator";

const context = { requestId: "req-1", stepId: "s2", cycle: 3 };

describe("ResponseCoordinator", () => {
  it("retains only a bounded transcript character count for pacing", () => {
    const coordinator = new ResponseCoordinator();
    coordinator.registerManual({
      purpose: "lesson_narration",
      clientEventId: "evt_1",
      context: { requestId: "req", stepId: "s1", cycle: 1 },
    });
    coordinator.bindCreated("resp_1", {
      chalk_kind: "lesson_narration",
      chalk_request_id: "req",
      chalk_step_id: "s1",
      chalk_cycle: "1",
    });

    expect(coordinator.addTranscriptCharacters("resp_1", 120)?.transcriptCharacters).toBe(120);
    expect(coordinator.addTranscriptCharacters("resp_1", 10_000)?.transcriptCharacters).toBe(4_096);
  });

  it("binds a manual response only through matching metadata", () => {
    const coordinator = new ResponseCoordinator();
    coordinator.registerManual({
      purpose: "lesson_narration",
      context,
      clientEventId: "evt-1",
    });
    expect(
      coordinator.bindCreated("resp-wrong", {
        chalk_kind: "lesson_narration",
        chalk_request_id: "old",
        chalk_step_id: "s2",
        chalk_cycle: "3",
      }),
    ).toBeUndefined();
    expect(
      coordinator.bindCreated("resp-1", {
        chalk_kind: "lesson_narration",
        chalk_request_id: "req-1",
        chalk_step_id: "s2",
        chalk_cycle: "3",
      }),
    ).toMatchObject({ purpose: "lesson_narration", context, responseId: "resp-1" });
  });

  it("distinguishes pending registrations from bound in-flight responses", () => {
    const coordinator = new ResponseCoordinator();
    expect(coordinator.hasPending()).toBe(false);
    expect(coordinator.hasInFlight()).toBe(false);
    coordinator.registerManual({
      purpose: "tool_continuation",
      clientEventId: "evt-filler",
    });
    expect(coordinator.hasPending()).toBe(true);
    expect(coordinator.hasInFlight()).toBe(true);
    coordinator.bindCreated("resp-filler", { chalk_kind: "tool_continuation" });
    expect(coordinator.hasPending()).toBe(false);
    expect(coordinator.hasInFlight()).toBe(true);
    coordinator.markGenerationDone("resp-filler");
    coordinator.markPlaybackStopped("resp-filler");
    coordinator.releaseIfSettled("resp-filler");
    expect(coordinator.hasInFlight()).toBe(false);
  });

  it("binds the next VAD-created response to an armed purpose", () => {
    const coordinator = new ResponseCoordinator();
    coordinator.armAutomatic({ purpose: "checkpoint_feedback", context });
    expect(coordinator.bindCreated("resp-feedback")).toMatchObject({
      purpose: "checkpoint_feedback",
      context,
    });
  });

  it("retains a response until generation and playback both settle", () => {
    const coordinator = new ResponseCoordinator();
    coordinator.armAutomatic({ purpose: "student_qa", context });
    coordinator.bindCreated("resp-qa");
    coordinator.markPlaybackStopped("resp-qa");
    coordinator.releaseIfSettled("resp-qa");
    expect(coordinator.get("resp-qa")).toBeDefined();
    coordinator.markGenerationDone("resp-qa");
    coordinator.releaseIfSettled("resp-qa");
    expect(coordinator.get("resp-qa")).toBeUndefined();
  });

  it("releases rejected manual registration and resets bounded state", () => {
    const coordinator = new ResponseCoordinator();
    coordinator.registerManual({
      purpose: "checkpoint_prompt",
      context,
      clientEventId: "evt-checkpoint",
    });
    expect(coordinator.failByClientEventId("evt-checkpoint")).toMatchObject({
      purpose: "checkpoint_prompt",
    });
    expect(coordinator.hasPurpose("checkpoint_prompt")).toBe(false);
    coordinator.armAutomatic({ purpose: "checkpoint_feedback", context });
    coordinator.reset();
    expect(coordinator.hasPurpose("checkpoint_feedback")).toBe(false);
  });

  it("cancels only the matching unbound automatic response", () => {
    const coordinator = new ResponseCoordinator();
    coordinator.armAutomatic({ purpose: "student_qa", context });
    expect(
      coordinator.cancelAutomatic("student_qa", { ...context, cycle: 99 }),
    ).toBe(false);
    expect(coordinator.cancelAutomatic("student_qa", context)).toBe(true);
    expect(coordinator.hasPurpose("student_qa")).toBe(false);
  });
});
