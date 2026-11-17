import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies frontend/assets or src/assets into dist/ if present
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const pairs = [
            {
              src: path.resolve(__dirname, 'frontend/assets'),
              dest: path.resolve(distDir, 'frontend/assets'),
            },
            {
              src: path.resolve(__dirname, 'src/assets'),
              dest: path.resolve(distDir, 'src/assets'),
            },
          ];
          for (const pair of pairs) {
            if (fs.existsSync(distDir) && fs.existsSync(pair.src)) {
              fs.cpSync(pair.src, pair.dest, { recursive: true, force: true });
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@frontend': path.resolve(__dirname, 'frontend'),
        '@landing': path.resolve(__dirname, 'landing'),
        '@backend': path.resolve(__dirname, 'backend'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
