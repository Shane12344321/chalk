const STORAGE_KEY = "chalk.realtime.client-id.v1";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getOrCreateClientId(
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
  randomUUID: () => string = () => crypto.randomUUID(),
): string {
  const existing = storage.getItem(STORAGE_KEY);
  if (existing && UUID_V4.test(existing)) {
    return existing;
  }

  const created = randomUUID();
  if (!UUID_V4.test(created)) {
    throw new Error("The browser did not generate a valid non-PII client identifier.");
  }
  storage.setItem(STORAGE_KEY, created);
  return created;
}
