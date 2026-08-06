import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // Integration tests hit a real (test) Postgres via Prisma — see
    // tests/integration/README.md — so they can't run in parallel
    // against the same DB without stepping on each other's data.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
