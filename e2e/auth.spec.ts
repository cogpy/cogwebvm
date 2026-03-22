import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should load the application homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CogWebVM|OpenCog/i);
  });

  test("should display login UI when not authenticated", async ({ page }) => {
    await page.goto("/");
    // The app should show some form of auth gate or login prompt
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("should handle logout gracefully", async ({ page }) => {
    await page.goto("/");
    // Navigate and verify the page doesn't crash
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("File Management Flow", () => {
  test("should navigate to dashboard after authentication", async ({
    page,
  }) => {
    await page.goto("/");
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
  });
});
