import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Large vendor chunks (pdf.js, xlsx) are expected; keep warning noise down on CI.
    chunkSizeWarningLimit: 1000,
  },
});
