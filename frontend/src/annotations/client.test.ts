import { describe, expect, it, vi } from "vitest";
import { AnnotationClient, requestAnnotation } from "./client";

const REQUEST_ID = "783c6081-75a4-4ed2-8be7-4e0f32680a2b";
const CLIENT_ID = "2f2db996-2dcc-4fc8-aa7f-206c7e7a9300";

const request = {
  requestId: REQUEST_ID,
  manifestVersion: 3,
  question: "Why does it peak here?",
  boardManifest: "Lesson: range. Visible board: rangecurve.",
  visibleElements: [{ id: "rangecurve", kind: "curve" as const, bounds: [0.55, 0.2, 0.35, 0.5] as [number, number, number, number] }],
};

const program = {
  schema_version: "1.0",
  request_id: REQUEST_ID,
  manifest_version: 3,
  ops: [{ op: "circle", id: "peakmark", target_id: "rangecurve" }],
};

function response(value: unknown = program, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Chalk-Annotation-Repairs": "0",
      ...headers,
    },
  });
}

describe("annotation client", () => {
  it("posts the bounded visible snapshot and validates the response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      response(program, {
        "X-Chalk-Annotation-Repairs": "1",
        "X-Chalk-Board-Model": "gpt-5.6-luna",
        "X-Chalk-Annotation-Prompt-SHA256": "abc123",
      }),
    );
    const result = await requestAnnotation({
      apiBaseUrl: "http://127.0.0.1:8000",
      clientId: CLIENT_ID,
      request,
      fetchImpl,
    });
    expect(result).toEqual({
      program,
      repairs: 1,
      boardModel: "gpt-5.6-luna",
      promptSha256: "abc123",
    });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      request_id: REQUEST_ID,
      client_id: CLIENT_ID,
      question: request.question,
      manifest_version: 3,
      board_manifest: request.boardManifest,
      visible_elements: request.visibleElements,
    });
  });

  it.each([
    new Response("bad", { status: 502, headers: { "Content-Type": "application/json" } }),
    new Response("{}", { status: 200, headers: { "Content-Type": "text/plain" } }),
    response({ ...program, manifest_version: 4 }),
    response({ ...program, ops: [{ op: "axes", id: "bad", target_id: "rangecurve" }] }),
    response({ ...program, ops: [{ op: "circle", id: "mark", target_id: "future" }] }),
    response({ ...program, ops: [{ op: "circle", id: "rangecurve", target_id: "rangecurve" }] }),
    response(program, { "X-Chalk-Annotation-Repairs": "9" }),
  ])("rejects HTTP, media, identity, schema, and metadata failures", async (serverResponse) => {
    await expect(
      requestAnnotation({
        apiBaseUrl: "http://127.0.0.1:8000",
        clientId: CLIENT_ID,
        request,
        fetchImpl: vi.fn().mockResolvedValue(serverResponse),
      }),
    ).rejects.toThrow();
  });

  it("rejects an oversized body even without a content-length hint", async () => {
    await expect(
      requestAnnotation({
        apiBaseUrl: "http://127.0.0.1:8000",
        clientId: CLIENT_ID,
        request,
        fetchImpl: vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ ...program, padding: "x".repeat(33 * 1024) }), {
            headers: { "Content-Type": "application/json" },
          }),
        ),
      }),
    ).rejects.toThrow(/byte budget/i);
  });

  it("aborts replaced work and ignores a transport that resolves stale", async () => {
    const resolvers: Array<(value: Response) => void> = [];
    const fetchImpl = vi.fn().mockImplementation(
      () => new Promise<Response>((resolve) => resolvers.push(resolve)),
    );
    const client = new AnnotationClient("http://127.0.0.1:8000", CLIENT_ID, fetchImpl);
    const first = client.start(request);
    const secondId = "00000000-0000-4000-8000-000000000001";
    const second = client.start({ ...request, requestId: secondId });
    resolvers[0](response(program));
    resolvers[1](response({ ...program, request_id: secondId }));
    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    await expect(second).resolves.toMatchObject({
      program: { request_id: secondId },
    });
  });
});
