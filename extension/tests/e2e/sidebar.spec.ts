import { expect, test } from "@playwright/test";

test.describe("Glance sidebar", () => {
  test("renders the options form shell", async ({ page }) => {
    await page.goto("file://" + process.cwd().replace(/\\/g, "/") + "/src/options/index.html");

    await expect(page.getByRole("heading", { name: "Glance Settings" })).toBeVisible();
    await expect(page.getByLabel("Gemini model")).toBeVisible();
  });
});
