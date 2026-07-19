import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    // Retained model output is evidence, not an application asset. Permit only
    // the pinned batch directory, and only while Vitest is replaying it.
    ...(mode === "test" ? {
      fs: {
        allow: ["../artifacts/evidence/m3-luna-v2-batch-20260717-0635/raw"],
      },
    } : {}),
  },
  test: {
    environment: "jsdom",
  },
}));
