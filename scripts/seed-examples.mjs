#!/usr/bin/env node
// Seed example templates into Convex
import { ConvexHttpClient } from 'convex/browser';

async function main() {
  const url = process.env.CONVEX_URL || 'http://localhost:8187';
  const client = new ConvexHttpClient(url);
  try {
    const res = await client.mutation('seeds:ensureExamples', {});
    console.log('Seed result:', res);
  } catch (e) {
    console.error('Seed failed', e);
    process.exit(1);
  }
}
main();
