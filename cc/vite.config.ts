import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: false,
  resolve: {
    // Prefer .ts source files over legacy compiled .js files in the same directory
    extensions: ['.ts', '.tsx', '.mts', '.mjs', '.js', '.jsx', '.json'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
