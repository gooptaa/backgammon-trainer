import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@backgammon-trainer/backgammon-domain": fileURLToPath(
        new URL("../../packages/backgammon-domain/src/index.ts", import.meta.url)
      ),
      "@backgammon-trainer/backgammon-analysis": fileURLToPath(
        new URL("../../packages/backgammon-analysis/src/index.ts", import.meta.url)
      ),
      "@backgammon-trainer/backgammon-engine": fileURLToPath(
        new URL("../../packages/backgammon-engine/src/index.ts", import.meta.url)
      )
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  }
});
