import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  publicDir: "../public",
  envDir: "..",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
