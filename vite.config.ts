import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import vscode from '@tomjs/vite-plugin-vscode';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    vscode({
      extension: {
        sourcemap: 'inline',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './webview'),
    },
  },
});
