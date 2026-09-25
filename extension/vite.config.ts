import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(process.cwd(), 'popup.html'),
        background: resolve(process.cwd(), 'src/background/main.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Ensure output paths match manifest expectations
          const name = chunkInfo.name;
          if (name === 'popup') return 'popup/main.js';
          if (name === 'background') return 'background/main.js';
          return '[name]/main.js';
        },
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@popup': resolve(process.cwd(), 'src/popup'),
      '@types': resolve(process.cwd(), 'src/types'),
      '@api': resolve(process.cwd(), 'src/api'),
      '@styles': resolve(process.cwd(), 'src/styles'),
    },
  },
  define: {
    'process.env.API_BASE': JSON.stringify(
      process.env.SCAMSHIELD_API_BASE || 'http://localhost:3000'
    ),
  },
});
