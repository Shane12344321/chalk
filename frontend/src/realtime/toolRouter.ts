import type { FunctionCall } from "./types";
import type { DeixisKind } from "../board/overlays";

export type ToolResult =
  | { ok: true; echo: string }
  | { ok: true; status: "started"; request_id: string }
  | { ok: true; status: "shown"; overlay_id: string }
  | { ok: true; status: "annotation_started"; request_id: string }
  | {
      ok: false;
      reason:
        | "unknown_tool"
        | "invalid_arguments"
        | "handler_unavailable"
        | "lesson_busy"
        | "unknown_element";
    };

export interface ToolHandlers {
  teach?: (topic: string, studentContext: string) => { requestId: string };
  deixis?: (kind: DeixisKind, elementId: string) => { overlayId: string } | undefined;
  annotate?: (request: string) => { requestId: string } | undefined;
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
  if (isDeixisKind(call.name)) {
    if (!isDeixisArguments(parsed)) return { ok: false, reason: "invalid_arguments" };
    if (!handlers.deixis) return { ok: false, reason: "handler_unavailable" };
    const shown = handlers.deixis(call.name, parsed.element_id);
    return shown
      ? { ok: true, status: "shown", overlay_id: shown.overlayId }
      : { ok: false, reason: "unknown_element" };
  }
  if (call.name === "annotate") {
    if (!isAnnotateArguments(parsed)) return { ok: false, reason: "invalid_arguments" };
    if (!handlers.annotate) return { ok: false, reason: "handler_unavailable" };
    const started = handlers.annotate(parsed.request);
    return started
      ? { ok: true, status: "annotation_started", request_id: started.requestId }
      : { ok: false, reason: "unknown_element" };
  }
  return { ok: false, reason: "unknown_tool" };
}

function isAnnotateArguments(value: unknown): value is { request: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 1 &&
    typeof record.request === "string" &&
    record.request.trim().length >= 2 &&
    record.request.length <= 400
  );
}

function isDeixisKind(value: string): value is DeixisKind {
  return ["point_at", "circle_el", "underline", "flash"].includes(value);
}

function isDeixisArguments(value: unknown): value is { element_id: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 1 &&
    typeof record.element_id === "string" &&
    /^[a-z][a-z0-9_-]{0,15}$/.test(record.element_id)
  );
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
