import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    // The app is one entry point pulling in several large libraries. Splitting them
    // out keeps the app chunk small and lets vendor chunks stay cached across
    // deploys instead of being re-downloaded on every app change.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // Match on the path so transitive deps (react/jsx-runtime, @tiptap/core,
          // @tiptap/pm, ...) land in the same chunk as their entry package.
          const groups: Record<string, string[]> = {
            react: ['/react/', '/react-dom/', '/scheduler/'],
            firebase: ['/firebase/', '/@firebase/'],
            genai: ['/@google/genai/'],
            editor: ['/@tiptap/', '/prosemirror-', '/lowlight/', '/highlight.js/'],
            pdf: ['/pdfjs-dist/'],
            charts: ['/recharts/', '/d3-', '/victory-'],
            canvas: ['/roughjs/', '/perfect-freehand/', '/points-on-'],
            motion: ['/framer-motion/', '/motion-dom/', '/motion-utils/'],
            docs: ['/mammoth/', '/jszip/', '/cheerio/', '/parse5/'],
            markdown: ['/react-markdown/', '/remark-', '/micromark', '/mdast-', '/hast-'],
          };

          const normalized = id.replace(/\\/g, '/');
          for (const [chunk, patterns] of Object.entries(groups)) {
            if (patterns.some((p) => normalized.includes(p))) return chunk;
          }
          // Everything else (icons, small utilities) is left to Rollup so it can
          // attach it to whichever lazy page chunk actually uses it.
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
