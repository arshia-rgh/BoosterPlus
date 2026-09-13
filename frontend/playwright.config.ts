import { defineConfig, devices } from "@playwright/test";

const engine = process.env.PLAYWRIGHT_ENGINE ?? "chromium";
if (!["chromium", "firefox", "webkit"].includes(engine))
  throw new Error("Unsupported PLAYWRIGHT_ENGINE");
const browserName = engine as "chromium" | "firefox" | "webkit";
// Keep device project names stable: the backend assigns isolated fixture populations by name.
// Firefox has no isMobile emulation; its narrow project checks viewport/touch reflow only.
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
    {
      name: "desktop",
      use: {
        ...devices[
          browserName === "webkit"
            ? "Desktop Safari"
            : browserName === "firefox"
              ? "Desktop Firefox"
              : "Desktop Chrome"
        ],
        browserName,
      },
    },
    {
      name: "mobile",
      use: {
        ...devices[browserName === "webkit" ? "iPhone 13" : "Pixel 7"],
        browserName,
        ...(browserName === "firefox"
          ? { isMobile: false, userAgent: undefined }
          : {}),
      },
    },
  ],
  webServer: {
    command: "HOST=127.0.0.1 PORT=4173 npm run start",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
