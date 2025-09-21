#!/usr/bin/env ts-node
/*
  Loads example templates into Convex via ensureExamples mutation.
  Requires convex dev server running.
*/
import { ConvexHttpClient } from 'convex/browser';

async function main() {
  const url = process.env.CONVEX_URL || 'http://localhost:8187';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = new ConvexHttpClient(url);
  try {
    const res = await client.mutation('seeds:ensureExamples', {});
    console.log('Seed result:', res);
  } catch (e) {
    console.error('Seed failed', e);
    process.exit(1);
  }
}
main();
