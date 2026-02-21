import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        outDir: '../static',
        emptyOutDir: true,
      },
      plugins: [react()],
      define: {
        // In production builds (served by the API on same origin) use '' for relative URLs.
        // In dev mode, point to the local API server.
        'process.env.VITE_BACKEND_URL': JSON.stringify(
          env.VITE_BACKEND_URL ?? process.env.VITE_BACKEND_URL ?? (mode === 'development' ? 'http://localhost:8000' : '')
        ),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
