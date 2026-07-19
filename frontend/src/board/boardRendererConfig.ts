export type ConfiguredBoardRenderer = "rough-svg" | "tldraw";

export function configuredBoardRenderer(value: unknown): ConfiguredBoardRenderer {
  return value === "tldraw" ? "tldraw" : "rough-svg";
}
