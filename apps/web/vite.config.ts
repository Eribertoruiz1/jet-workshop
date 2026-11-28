import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  // Every page is an entry, or the build only includes index.html. Vite 8 docs
  // (vite.dev/guide/build, "Multi-Page App"): the top-level `input`, paths
  // relative to the project root; it is used in dev as well as in the build.
  input: {
    main: "index.html",
    flight: "flight.html",
  },
});
