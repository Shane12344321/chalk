import type { FunctionCall } from "./types";

export type ToolResult =
  | { ok: true; echo: string }
  | { ok: false; reason: "unknown_tool" | "invalid_arguments" };

export function routeToolCall(call: FunctionCall): ToolResult {
  if (call.name !== "debug_echo") {
    return { ok: false, reason: "unknown_tool" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(call.argumentsJson);
  } catch {
    return { ok: false, reason: "invalid_arguments" };
  }

  if (!isDebugEchoArguments(parsed)) {
    return { ok: false, reason: "invalid_arguments" };
  }

  return { ok: true, echo: parsed.message };
}

function isDebugEchoArguments(value: unknown): value is { message: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 1 &&
    typeof record.message === "string" &&
    record.message.trim().length > 0 &&
    record.message.length <= 200
  );
}
