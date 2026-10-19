import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    // Allow tests to resolve backend dependencies (zod, etc.) and mock Canva runtime
    alias: {
      "zod": path.resolve(__dirname, "backend/node_modules/zod"),
      "@canva/design": path.resolve(__dirname, "tests/mocks/canva-design-mock.ts"),
    },
  },
});
