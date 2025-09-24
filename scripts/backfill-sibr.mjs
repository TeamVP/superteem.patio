#!/usr/bin/env node
import { ConvexHttpClient } from 'convex/browser';
import fs from 'node:fs';
import path from 'node:path';

async function loadEnvUrl() {
  let url = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
  if (url) return url;
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^VITE_CONVEX_URL=([^#\s]+)/);
      if (m) return m[1];
    }
  }
  return 'http://localhost:8187';
}

async function main() {
  const templateId = process.argv[2];
  if (!templateId) {
    console.error('Usage: backfill-sibr.mjs <templateId>');
    process.exit(1);
  }
  const url = await loadEnvUrl();
  const client = new ConvexHttpClient(url);
  const filePath = path.join('spec', 'examples', 'templates', 'sibr-observation.json');
  if (!fs.existsSync(filePath)) {
    console.error('Cannot find sibr-observation.json at', filePath);
    process.exit(1);
  }
  const body = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  try {
    const res = await client.mutation('templates:adminOverwriteTemplateBody', {
      templateId,
      body,
      type: 'survey',
    });
    console.log('Overwrite complete:', res);
  } catch (e) {
    console.error('Overwrite failed:', e);
    process.exit(1);
  }
}
main();
