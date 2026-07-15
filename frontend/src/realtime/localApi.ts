const EXACT_LOOPBACK_ORIGIN =
  /^(https?):\/\/(localhost|127\.0\.0\.1|\[::1\])(?::([0-9]{1,5}))?\/?$/i;

export function resolveLocalApiBaseUrl(value: string | undefined): string {
  const candidate = value ?? "http://127.0.0.1:8000";
  if (!EXACT_LOOPBACK_ORIGIN.test(candidate)) {
    throw new Error(
      "VITE_API_BASE_URL must be an exact loopback origin without credentials, path, query, or fragment.",
    );
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("VITE_API_BASE_URL must be an absolute loopback URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("VITE_API_BASE_URL must use http or https.");
  }
  if (url.username || url.password) {
    throw new Error("VITE_API_BASE_URL must not contain credentials.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("VITE_API_BASE_URL must not contain a path, query, or fragment.");
  }

  return `${url.protocol}//${url.host}`;
}
