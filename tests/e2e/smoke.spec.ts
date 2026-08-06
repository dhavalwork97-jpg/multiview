import { test, expect } from "@playwright/test";

// Deliberately unauthenticated flows — anything requiring a real Clerk
// session needs Clerk's test-mode session tokens wired into CI, which is
// a real setup step of its own (see TESTING_STRATEGY.md's "not yet done"
// list) rather than something to fake with a brittle mock here.

test("dashboard redirects signed-out visitors to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/sign-in/);
});

test("watch page 404s cleanly for a nonexistent match", async ({ page }) => {
  const res = await page.goto("/watch/does-not-exist");
  expect(res?.status()).toBe(404);
});

test("multiview page loads without crashing when nothing is live", async ({ page }) => {
  await page.goto("/multiview");
  await expect(page.getByText(/multi-view/i)).toBeVisible();
});
