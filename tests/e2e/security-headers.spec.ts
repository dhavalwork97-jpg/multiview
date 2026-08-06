import { test, expect } from "@playwright/test";

// A unit test on the next.config.ts headers() function would only prove
// the config object is shaped correctly — this proves Vercel is actually
// applying it to a real response.
test("security headers are present on the deployed app", async ({ request }) => {
  const res = await request.get("/");
  const headers = res.headers();

  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBeTruthy();
  expect(headers["strict-transport-security"]).toContain("max-age");
});
