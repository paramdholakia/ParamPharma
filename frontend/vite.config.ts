import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: ['chrome100', 'firefox100', 'safari14', 'edge100'],
    cssTarget: 'chrome100',
  },
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: {
        chrome: 100 << 16,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
