import { defineConfig, devices } from "@playwright/test";

// Runs against a real deployed URL — a Vercel preview deployment in CI
// (see .github/workflows/ci.yml), or your production URL for a manual
// smoke test — never localhost. This is deliberate: the things E2E is
// for here (does a live match actually show up on the grid via the real
// Socket.IO server, does the real Clerk sign-in flow work) only mean
// anything against the real deployed stack, not a local dev server that
// skips half of it.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL, // set by CI to the preview URL — no default, fails loudly if unset rather than silently hitting localhost
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
});
