import { defineConfig } from "vitest/config";

// Intentionally a vitest.config.ts rather than a vite.config.ts: the project
// builds on Vite's defaults today, and introducing a vite.config.ts would change
// the production build. `vite build` ignores this file.
export default defineConfig({
  test: {
    // Node by default so pure-logic suites skip the ~20s jsdom startup.
    // Component tests opt in with a `@vitest-environment jsdom` docblock.
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // The default `forks` pool cannot spawn workers on some Windows setups
    // (process forking fails outright); worker threads are reliable here.
    // Spawning several at once is also flaky on constrained machines, and the
    // suite is small enough that one worker costs nothing.
    pool: "threads",
    poolOptions: {
      threads: { singleThread: true },
    },
    // src/config/firebase.ts throws at import time when these are missing, so
    // every test that transitively imports it needs them present.
    env: {
      VITE_FIREBASE_API_KEY: "test-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "test-project",
      VITE_FIREBASE_STORAGE_BUCKET: "test.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "0",
      VITE_FIREBASE_APP_ID: "test-app-id",
      VITE_FIREBASE_MEASUREMENT_ID: "G-TEST",
      VITE_RECAPTCHA_SITE_KEY: "test-recaptcha-key",
      VITE_MAP_KEY: "test-map-key",
      VITE_CLARITY_ID: "test-clarity-id",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/components/pages/mapLogic.ts", "src/types/report.ts"],
      // Scoped to the extracted logic on purpose. A global threshold would fail
      // CI on day one over legacy components that have no tests yet; raise the
      // net as coverage grows rather than starting red.
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
