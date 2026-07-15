import { describe, expect, it, vi } from "vitest";
import { getOrCreateClientId } from "./clientIdentity";

function storageWith(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => {
      value = next;
    }),
  };
}

describe("getOrCreateClientId", () => {
  it("reuses a persisted UUIDv4", () => {
    const storage = storageWith("00000000-0000-4000-8000-000000000001");
    expect(
      getOrCreateClientId(storage, () => "00000000-0000-4000-8000-000000000002"),
    ).toBe("00000000-0000-4000-8000-000000000001");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each([
    "student@example.com",
    "00000000-0000-1000-8000-000000000001",
    "00000000-0000-4000-7000-000000000001",
  ])("rotates an invalid persisted identifier: %s", (existing) => {
    const storage = storageWith(existing);
    expect(
      getOrCreateClientId(storage, () => "00000000-0000-4000-8000-000000000002"),
    ).toBe("00000000-0000-4000-8000-000000000002");
    expect(storage.setItem).toHaveBeenCalledOnce();
  });

  it("rejects an invalid generated identifier", () => {
    expect(() => getOrCreateClientId(storageWith(), () => "not-a-uuid")).toThrow(
      /valid non-PII client identifier/i,
    );
  });
});
