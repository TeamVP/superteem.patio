#!/usr/bin/env node
import { ConvexHttpClient } from 'convex/browser';
import fs from 'node:fs';

async function loadEnvUrl() {
  return (
    process.env.CONVEX_URL ||
    process.env.VITE_CONVEX_URL ||
    (fs.existsSync('.env.local')
      ? (fs.readFileSync('.env.local', 'utf8').match(/VITE_CONVEX_URL=([^#\s]+)/) || [])[1]
      : null) ||
    'http://localhost:8187'
  );
}

async function main() {
  const url = await loadEnvUrl();
  const client = new ConvexHttpClient(url);
  try {
    const globals = await client.query('templates:listPublishedGlobal', {});
    console.log('Published global templates:');
    for (const t of globals) {
      console.log(` - slug=${t.slug} id=${t._id} v${t.latestVersion}`);
    }
  } catch (e) {
    console.error('Failed to list templates', e);
    process.exit(1);
  }
}
main();
