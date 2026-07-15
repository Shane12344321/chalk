import { describe, expect, it } from "vitest";
import { resolveLocalApiBaseUrl } from "./localApi";

describe("resolveLocalApiBaseUrl", () => {
  it.each([
    [undefined, "http://127.0.0.1:8000"],
    ["http://localhost:8000", "http://localhost:8000"],
    ["https://127.0.0.1:8443/", "https://127.0.0.1:8443"],
    ["http://[::1]:8000", "http://[::1]:8000"],
  ])("accepts exact loopback origins: %s", (input, expected) => {
    expect(resolveLocalApiBaseUrl(input)).toBe(expected);
  });

  it.each([
    "https://example.com",
    "http://localhost.example.com:8000",
    "http://localhost.:8000",
    "http://127.1:8000",
    "http://2130706433:8000",
    "http://0x7f000001:8000",
    "ftp://localhost:8000",
    "http://user:pass@localhost:8000",
    "http://localhost:8000/api",
    "http://localhost:8000/?debug=1",
    "http://localhost:8000/#trace",
    "//localhost:8000",
    "not a url",
  ])("rejects non-origin or non-loopback API targets: %s", (input) => {
    expect(() => resolveLocalApiBaseUrl(input)).toThrow();
  });
});
