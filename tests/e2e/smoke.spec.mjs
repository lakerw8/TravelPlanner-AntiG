import { test, expect } from "@playwright/test";

test("unauthenticated user is routed to login and sees Google sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});
