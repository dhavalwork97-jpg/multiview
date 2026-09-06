import { test, expect } from "@playwright/test";

test.describe("production health contract", () => {
  test("health endpoint is reachable and returns a structured status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(body).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded|error)$/),
      checks: expect.objectContaining({
        database: expect.stringMatching(/^(ok|error)$/),
        redis: expect.stringMatching(/^(ok|unavailable|error)$/),
      }),
    });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("readiness endpoint only reports ready when the database is reachable", async ({ request }) => {
    const response = await request.get("/api/ready");
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(body.status).toMatch(/^(ready|not_ready)$/);
    expect(body.timestamp).toEqual(expect.any(String));
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
});
