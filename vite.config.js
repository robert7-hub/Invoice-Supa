import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Invoice-Supa/',
  build: {
    rollupOptions: {
      external: [
        'pako/lib/zlib/zstream.js',
        'pako/lib/zlib/deflate.js',
        'pako/lib/zlib/inflate.js',
        'pako/lib/zlib/constants.js',
      ],
    },
  },
  optimizeDeps: {
    include: ['@react-pdf/renderer'],
  },
});
