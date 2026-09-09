import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["app/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["app/routes/*.tsx"],
      exclude: ["app/**/*.test.tsx"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
