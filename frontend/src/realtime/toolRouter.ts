import type { FunctionCall } from "./types";

export type ToolResult =
  | { ok: true; echo: string }
  | { ok: true; status: "started"; request_id: string }
  | {
      ok: false;
      reason: "unknown_tool" | "invalid_arguments" | "handler_unavailable" | "lesson_busy";
    };

export interface ToolHandlers {
  teach?: (topic: string, studentContext: string) => { requestId: string };
}

export function routeToolCall(call: FunctionCall, handlers: ToolHandlers = {}): ToolResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(call.argumentsJson);
  } catch {
    return { ok: false, reason: "invalid_arguments" };
  }

  if (call.name === "debug_echo") {
    if (!isDebugEchoArguments(parsed)) {
      return { ok: false, reason: "invalid_arguments" };
    }
    return { ok: true, echo: parsed.message };
  }
  if (call.name === "teach") {
    if (!isTeachArguments(parsed)) return { ok: false, reason: "invalid_arguments" };
    if (!handlers.teach) return { ok: false, reason: "handler_unavailable" };
    try {
      const started = handlers.teach(parsed.topic, parsed.student_context);
      return { ok: true, status: "started", request_id: started.requestId };
    } catch {
      return { ok: false, reason: "lesson_busy" };
    }
  }
  return { ok: false, reason: "unknown_tool" };
}

function isTeachArguments(
  value: unknown,
): value is { topic: string; student_context: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 2 &&
    typeof record.topic === "string" &&
    record.topic.trim().length >= 2 &&
    record.topic.length <= 80 &&
    typeof record.student_context === "string" &&
    record.student_context.length <= 500
  );
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
