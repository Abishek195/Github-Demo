/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `--mode standalone` builds a classic (non-module) IIFE bundle with fixed file
// names so the result can be opened straight from disk via file://.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  build:
    mode === 'standalone'
      ? {
          outDir: 'standalone',
          emptyOutDir: true,
          chunkSizeWarningLimit: 800,
          cssCodeSplit: false,
          modulePreload: false,
          rollupOptions: {
            output: {
              format: 'iife',
              inlineDynamicImports: true,
              entryFileNames: 'app.js',
              assetFileNames: 'styles[extname]',
            },
          },
        }
      : { outDir: 'dist' },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}));
