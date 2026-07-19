import { describe, expect, it, vi } from "vitest";
import { loadTldrawLicenseKey } from "./tldrawLicense";

describe("tldraw runtime licence projection", () => {
  it("loads a configured key only from the no-store backend endpoint", async () => {
    const fetchImpl = vi.fn(async () => new Response(
      JSON.stringify({ tldraw_license_key: " licence-value " }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    await expect(loadTldrawLicenseKey("http://127.0.0.1:8000", fetchImpl))
      .resolves.toBe("licence-value");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/runtime-config/renderer",
      expect.objectContaining({ cache: "no-store", credentials: "omit" }),
    );
  });

  it("fails closed when the endpoint is absent or malformed", async () => {
    await expect(loadTldrawLicenseKey("http://127.0.0.1:8000", async () =>
      new Response("{}", { status: 503 }))).resolves.toBeUndefined();
    await expect(loadTldrawLicenseKey("http://127.0.0.1:8000", async () =>
      new Response(JSON.stringify({ tldraw_license_key: 42 }), { status: 200 })))
      .resolves.toBeUndefined();
  });
});
