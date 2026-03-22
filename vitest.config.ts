
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["server/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["node_modules", "dist", "e2e"],
    coverage: {
      provider: "v8",
      include: ["server/**/*.ts"],
      exclude: ["server/_core/**", "server/**/*.test.ts"],
    },
  },
});