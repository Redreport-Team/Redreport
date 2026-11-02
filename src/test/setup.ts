export {};

// Runs for every suite. Pure-logic suites run in the `node` environment and
// have no DOM, so the Testing Library wiring is loaded only when one exists.
if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  const { afterEach } = await import("vitest");

  afterEach(() => {
    cleanup();
  });
}
