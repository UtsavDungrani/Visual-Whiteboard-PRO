import { defineConfig } from "vitest/config";

// Kept separate from vite.config.js so the test runner's Vite pipeline does not
// interact with the (rolldown-based) production build config. React JSX is
// handled through esbuild's automatic runtime rather than a plugin.
export default defineConfig({
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    css: false,
    restoreMocks: true,
  },
});
