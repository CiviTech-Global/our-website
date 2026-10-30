import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Source maps are NOT published. `true` emits .map files into dist/ and
    // references them from the bundle, so nginx serves the entire unminified
    // front-end source — comments included — to anyone who asks.
    //
    // When browser-side Sentry lands, switch this to 'hidden': maps are still
    // generated (so Sentry can symbolicate) but the bundle carries no
    // sourceMappingURL, and the upload step must delete them from dist/
    // before the image is built.
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\/](react|react-dom|react-router|scheduler)[\/]/.test(id)) return 'vendor';
          if (id.includes('@tanstack')) return 'query';
          return undefined;
        },
      },
    },
  },
});
