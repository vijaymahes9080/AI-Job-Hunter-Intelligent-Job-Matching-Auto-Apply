import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API is served from the same origin in production. During local
// development Vite proxies /api to the Express server on port 8787.
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react-vendor';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/recharts')) return 'charts';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
