#!/usr/bin/env node
import { ConvexHttpClient } from 'convex/browser';

async function main() {
  const url = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || 'http://localhost:8187';
  const client = new ConvexHttpClient(url);
  try {
    const res = await client.mutation('templates:seedInitial', {});
    console.log('Seed initial result:', res);
  } catch (e) {
    console.error('Seed initial failed', e);
    process.exit(1);
  }
}
main();
