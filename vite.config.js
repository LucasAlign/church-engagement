import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE === 'true' && visualizer({ filename: 'dist/bundle-report.html', gzipSize: true }),
  ].filter(Boolean),
  server: {
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
