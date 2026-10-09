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
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Supabase client — shared across all authenticated routes
          if (id.includes('@supabase')) return 'supabase'
          // Recharts — only loaded by QA Weekly Report and analytics modules
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-')) return 'BarChart'
          // PDF.js — only loaded by import/upload features
          if (id.includes('pdfjs-dist')) return 'pdf'
          // XLSX — only loaded by export/import features
          if (id.includes('xlsx-js-style')) return 'xlsx'
          if (id.includes('/xlsx-0.20') || id.includes('xlsx/dist')) return 'xlsx.min'
          // Framer Motion — shared UI animations
          if (id.includes('framer-motion')) return 'framer'
          // Lucide icons — shared across all pages
          if (id.includes('lucide-react')) return 'createLucideIcon'
          // PPTXGenJS — only loaded by report export
          if (id.includes('pptxgenjs')) return 'pptx'
          // Mammoth — only loaded by document import
          if (id.includes('mammoth')) return 'mammoth'
        },
      },
    },
  },
});
