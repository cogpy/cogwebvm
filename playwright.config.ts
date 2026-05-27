import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: "5173",
      OAUTH_SERVER_URL: process.env.OAUTH_SERVER_URL ?? "http://127.0.0.1:5173",
      VITE_ANALYTICS_ENDPOINT: process.env.VITE_ANALYTICS_ENDPOINT ?? "",
      VITE_ANALYTICS_WEBSITE_ID: process.env.VITE_ANALYTICS_WEBSITE_ID ?? "test",
    },
  },
});
