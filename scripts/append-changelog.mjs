#!/usr/bin/env node
/* eslint-env node */
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = resolve(__dirname, '..');
const file = resolve(root, 'CHANGELOG.md');

const entry = process.argv.slice(2).join(' ').trim();
if (!entry) {
  console.error('Usage: pnpm changelog "Your entry text"');
  process.exit(1);
}

const line = `\n- ${new Date().toISOString()} ${entry}`;
appendFileSync(file, line);
console.log('Appended changelog entry.');
