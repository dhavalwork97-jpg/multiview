import { test, expect } from "@playwright/test";

const PROTECTED_OR_MISSING = [404, 301, 302, 307, 308, 401, 403];

test.describe("launch access boundaries", () => {
  test("protected organizer workspace does not expose a public session", async ({ request }) => {
    const response = await request.get("/organizer", { maxRedirects: 0 });
    expect(PROTECTED_OR_MISSING).toContain(response.status());

    if ([301, 302, 307, 308].includes(response.status())) {
      expect(response.headers().location).toBeTruthy();
    }
  });

  test("protected platform admin does not expose a public session", async ({ request }) => {
    const response = await request.get("/admin", { maxRedirects: 0 });
    expect(PROTECTED_OR_MISSING).toContain(response.status());

    if ([301, 302, 307, 308].includes(response.status())) {
      expect(response.headers().location).toBeTruthy();
    }
  });

  test("health and readiness remain cache-disabled contracts", async ({ request }) => {
    for (const path of ["/api/health", "/api/ready"]) {
      const response = await request.get(path);
      expect([200, 503]).toContain(response.status());
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(response.headers()["content-type"]).toContain("application/json");
    }
  });
});
