import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const enableCoverage = !(globalThis as typeof globalThis).process?.env?.NO_COVERAGE;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest.setup.ts',
    pool: 'forks',
    minWorkers: 1,
    maxWorkers: 1,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: enableCoverage ? ['text', 'html'] : [],
      thresholds: enableCoverage
        ? {
            lines: 70,
            functions: 70,
            branches: 60,
            statements: 70,
          }
        : undefined,
    },
    exclude: [
      '**/node_modules/**',
      'tests/**/*',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
    ],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,tsx,jsx,tsx}'],
  },
});
