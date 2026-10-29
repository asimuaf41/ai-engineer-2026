import { defineConfig, devices } from "@playwright/test";

// Port 3100 never collides with `pnpm dev` (3000) or the lab app (3001).
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "reports/playwright", open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // Every public page is checked in light, dark and on a phone.
  projects: [
    { name: "desktop-light", use: { ...devices["Desktop Chrome"], colorScheme: "light" } },
    { name: "desktop-dark", use: { ...devices["Desktop Chrome"], colorScheme: "dark" } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Tests run against a production build, like the real site (and like Lighthouse).
    command: `pnpm build && pnpm exec next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // These tests never call the AI API, so the app doesn't need real keys to build or start.
    env: { SKIP_ENV_VALIDATION: "1" },
  },
});
