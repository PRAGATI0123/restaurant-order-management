import { defineConfig } from "vitest/config";

// Vitest settings.
export default defineConfig({
  resolve: {
    // Lets tests use the same "@/..." imports as the app, read from tsconfig.json.
    // (The Next.js guide uses the vite-tsconfig-paths plugin for this; Vite now
    // does it natively and asks us to use this option instead.)
    tsconfigPaths: true,
  },
  test: {
    // Our first tests check plain TypeScript functions (domain/), which need no
    // browser. Step 19 adds React component tests, which will switch to "jsdom".
    environment: "node",
    // Test files sit next to the code they test, in __tests__ folders.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
