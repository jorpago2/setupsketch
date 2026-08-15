import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [["line"]],
  use: {
    baseURL: "http://127.0.0.1:4183/setupsketch/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-light", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, colorScheme: "light" } },
    { name: "mobile-dark", use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 }, colorScheme: "dark" } },
  ],
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 4183",
    url: "http://127.0.0.1:4183/setupsketch/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
