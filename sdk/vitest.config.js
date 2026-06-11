import { defineConfig } from "vitest/config";

// Standalone config so the SDK suite runs in a plain Node environment and
// never inherits the repo root's Clarinet simnet setup.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
