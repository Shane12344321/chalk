import { describe, expect, it } from "vitest";
import { ResponseCoordinator } from "./responseCoordinator";

const context = { requestId: "req-1", stepId: "s2", cycle: 3 };

describe("ResponseCoordinator", () => {
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
