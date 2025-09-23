#!/usr/bin/env node
// Seed example templates into Convex
import { ConvexHttpClient } from 'convex/browser';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  let url = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
  if (!url) {
    // Attempt lightweight parse of .env.local for VITE_CONVEX_URL
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^VITE_CONVEX_URL=([^#\s]+)/);
        if (m) {
          url = m[1];
          break;
        }
      }
    }
  }
  if (!url) url = 'http://localhost:8187';
  const client = new ConvexHttpClient(url);
  try {
  const res = await client.mutation('templates:seedExamples', {});
    console.log('Seed result:', res);
  } catch (e) {
    console.error('Seed failed', e);
    process.exit(1);
  }
}
main();
