import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Invoice-Supa/',
  optimizeDeps: {
    include: ['@react-pdf/renderer'],
  },
});
