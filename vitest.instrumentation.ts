/* Simple instrumentation to log test file start/end and heap usage */
import { afterAll, beforeAll } from 'vitest';

function log(msg: string) {
  const mem = (globalThis as typeof globalThis).process?.memoryUsage?.();
  const rss = mem ? (mem.rss / 1024 / 1024).toFixed(1) + 'MB' : 'n/a';
  console.log(`[TEST-INSTRUMENT] ${msg} rss=${rss}`);
}

beforeAll(() => {
  log('file-start');
});

afterAll(() => {
  log('file-end');
});
