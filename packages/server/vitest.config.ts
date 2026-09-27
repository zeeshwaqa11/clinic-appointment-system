import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    env: {
      NODE_ENV: "test",
    },
    fileParallelism: false,
  },
});
