export interface TldrawRuntimeConfig {
  tldraw_license_key?: string;
}

export async function loadTldrawLicenseKey(
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | undefined> {
  try {
    const response = await fetchImpl(`${apiBaseUrl}/runtime-config/renderer`, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return undefined;
    const value: unknown = await response.json();
    if (!isRecord(value)) return undefined;
    const key = value.tldraw_license_key;
    return typeof key === "string" && key.trim() ? key.trim() : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
