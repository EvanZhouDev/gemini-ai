import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    minify: true,
    outDir: 'build',
    emptyOutDir: false,
    lib: {
      name: 'gemini-ai',
      formats: ['cjs', 'es'],
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'index',
    },
  },
});
