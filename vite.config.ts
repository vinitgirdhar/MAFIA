import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

// Emits sw.js with the full list of built files baked in, so the very first
// visit is enough to make the game playable offline.
function offlineWorker(): Plugin {
  return {
    name: 'mafia-offline-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = [
        './',
        ...Object.keys(bundle),
        'manifest.webmanifest',
        'icon.svg',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'apple-touch-icon.png',
      ];
      const version = Date.now().toString(36);
      const source = readFileSync('sw-template.js', 'utf8').replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), offlineWorker()],
  test: { include: ['src/**/*.test.ts'] },
});
