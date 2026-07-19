import { describe, expect, it } from "vitest";
import { parseVisualRepairMode, VisualRepairGate } from "./visualRepair";

describe("bounded visual repair eligibility", () => {
  it("does not authorize calls in the default lint-only mode", () => {
    const gate = new VisualRepairGate(parseVisualRepairMode(undefined));
    expect(gate.mode).toBe("lint-only");
    expect(gate.candidate("r1", "s1", [{
      code: "label_overlap",
      elementIds: ["a", "b"],
    }])).toBeUndefined();
  });

  it("authorizes one measured candidate only once", () => {
    const gate = new VisualRepairGate("one-pass");
    const measured = [{ code: "label_overlap" as const, elementIds: ["a", "b"] }];
    expect(gate.candidate("r1", "s1", measured)?.findings).toEqual(measured);
    expect(gate.candidate("r1", "s1", measured)).toBeUndefined();
  });

  it("keeps estimated-only findings out of the repair budget", () => {
    const gate = new VisualRepairGate("one-pass");
    expect(gate.candidate("r1", "s1", [], [{
      code: "text_overflow",
      elementIds: ["text1"],
    }])).toBeUndefined();
  });
});
