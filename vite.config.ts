/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under /film-it/
export default defineConfig({
  base: '/film-it/',
  plugins: [react()],
  test: { globals: true, environment: 'jsdom' },
});
