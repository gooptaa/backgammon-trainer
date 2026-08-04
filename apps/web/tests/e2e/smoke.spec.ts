import { expect, test } from "@playwright/test";

test("application shell loads key placeholders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Backgammon Trainer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Board Workspace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coach" })).toBeVisible();
});
