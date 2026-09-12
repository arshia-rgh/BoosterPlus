import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // The qualification database has two CPUs. Pin independent browser workers
  // instead of deriving seven concurrent journeys from a developer laptop's cores.
  // Domain tests separately exercise concurrent mutations under the race detector.
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "HOST=127.0.0.1 PORT=4173 npm run start",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
