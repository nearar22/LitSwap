import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Pure SPA build (no SSR). The TanStack Start plugin used to wrap this app for
// server-side rendering, but we deploy as a static site on Vercel, so we use
// the TanStack Router file-based plugin only and let Vite emit a normal SPA.
export default defineConfig({
  server: { port: 3000, strictPort: false },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
  ],
});
