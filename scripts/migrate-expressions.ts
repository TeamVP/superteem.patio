#!/usr/bin/env node
// Expression migration CLI: converts JS-like mini expressions to JSONLogic via hybrid parser.
// Usage: pnpm ts-node scripts/migrate-expressions.ts "<expr>" [...more]
// If no arguments provided, runs sample expressions.

import { migrateExpression } from '../src/lib/expression/parser';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

function run(exprs: string[]): void {
  for (const expr of exprs) {
    const result = migrateExpression(expr);
    console.log(JSON.stringify(result, null, 2));
  }
}

const args = process.argv.slice(2);
// Execute only when run directly (not when imported)
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  if (args.length === 0) {
    run([
      '$sibr_occurred && $sibr_occurred[0] === 1',
      '$patient_census >= ($bedside || 0) + ($hallway || 0)',
    ]);
  } else {
    run(args);
  }
}

export { migrateExpression };
