import { test, expect } from "@playwright/test";

const publicPages = [
  ["/terms", "Terms of Service"],
  ["/privacy", "Privacy Notice"],
  ["/community-guidelines", "Community Guidelines"],
  ["/copyright", "Copyright & Takedowns"],
  ["/refunds", "Refunds & Cancellations"],
] as const;

test.describe("public trust surfaces", () => {
  for (const [path, heading] of publicPages) {
    test(`${path} is public`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}$`));
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    });
  }

  test("security.txt is published", async ({ request }) => {
    const response = await request.get("/.well-known/security.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Contact:");
    expect(body).toContain("Policy:");
    expect(body).toContain("Canonical:");
  });
});
