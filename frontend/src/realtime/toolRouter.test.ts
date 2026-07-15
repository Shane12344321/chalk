import { describe, expect, it } from "vitest";
import { routeToolCall } from "./toolRouter";

describe("routeToolCall", () => {
  it("routes the bounded debug echo tool", () => {
    expect(
      routeToolCall({
        callId: "call_1",
        name: "debug_echo",
        argumentsJson: '{"message":"protocol alive"}',
      }),
    ).toEqual({ ok: true, echo: "protocol alive" });
  });

  it.each([
    "not json",
    "{}",
    '{"message":""}',
    '{"message":"ok","extra":true}',
    JSON.stringify({ message: "x".repeat(201) }),
  ])("soft-fails invalid arguments: %s", (argumentsJson) => {
    expect(
      routeToolCall({ callId: "call_1", name: "debug_echo", argumentsJson }),
    ).toEqual({ ok: false, reason: "invalid_arguments" });
  });

  it("soft-fails unknown tools", () => {
    expect(
      routeToolCall({ callId: "call_1", name: "delete_everything", argumentsJson: "{}" }),
    ).toEqual({ ok: false, reason: "unknown_tool" });
  });
});
