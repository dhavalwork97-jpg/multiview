import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],

    // Integration tests use a real Postgres database (Neon).
    // The remote DB can take several seconds to establish/reuse connections.
    testTimeout: 30000,
    hookTimeout: 30000,

    // Integration tests share one database and reset it between tests.
    fileParallelism: false,
  },

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});