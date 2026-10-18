import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    // Allow tests to resolve backend dependencies (zod, etc.)
    alias: {
      "zod": path.resolve(__dirname, "backend/node_modules/zod"),
    },
  },
});
