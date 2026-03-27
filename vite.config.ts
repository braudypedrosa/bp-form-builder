import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/main.ts',
      name: 'FormBuilder',
      fileName: 'form-builder',
      formats: ['umd', 'es'],
    },
  },
});
