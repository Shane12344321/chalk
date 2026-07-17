import { describe, expect, it } from "vitest";
import { isSpaceToSpeakEvent } from "./voiceShortcut";

function keyboardEvent(
  target: Element,
  init: KeyboardEventInit = { code: "Space" },
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", init);
  Object.defineProperty(event, "target", { value: target });
  return event;
}

describe("isSpaceToSpeakEvent", () => {
  it("accepts one unmodified Space press on the page", () => {
    expect(isSpaceToSpeakEvent(keyboardEvent(document.body))).toBe(true);
  });

  it.each(["input", "textarea", "select", "button", "a"])(
    "ignores Space inside %s controls",
    (tagName) => {
      expect(isSpaceToSpeakEvent(keyboardEvent(document.createElement(tagName)))).toBe(false);
    },
  );

  it("ignores held, modified, and non-Space keys", () => {
    expect(isSpaceToSpeakEvent(keyboardEvent(document.body, { code: "Space", repeat: true }))).toBe(false);
    expect(isSpaceToSpeakEvent(keyboardEvent(document.body, { code: "Space", metaKey: true }))).toBe(false);
    expect(isSpaceToSpeakEvent(keyboardEvent(document.body, { code: "Enter" }))).toBe(false);
  });
});
