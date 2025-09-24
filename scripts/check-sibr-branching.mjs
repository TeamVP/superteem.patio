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

function findCompositeLabels(structure) {
  const labels = [];
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CompositeQuestion' && node.label) labels.push(node.label);
    if (node.questions) visit(node.questions);
    if (node.question) visit(node.question);
  };
  visit(structure);
  return labels;
}

async function main() {
  const slug = process.argv[2] || 'sibr-observation';
  const url = await loadEnvUrl();
  const client = new ConvexHttpClient(url);
  try {
    console.log('[check-sibr] Using Convex URL:', url);
    const tmpl = await client.query('templates:getBySlug', { slug });
    if (!tmpl) throw new Error('Template not found by slug: ' + slug);
    if (!tmpl.body) throw new Error('Template has no body field');
    const labels = findCompositeLabels(tmpl.body);
    console.log('[check-sibr] Found composite labels:', labels);
    const expected = [
      'Doctors who attended the round',
      'Allied who attended the round',
      'SIBR details',
      'Your review of the round',
    ];
    const missing = expected.filter((e) => !labels.includes(e));
    if (missing.length) {
      console.error('[check-sibr] Missing composite groups:', missing);
      process.exit(1);
    }
    console.log('[check-sibr] OK. Expected composite groups present.');
    console.log('[check-sibr] NOTE: Dynamic enableIf logic covered by vitest.');
  } catch (e) {
    console.error('[check-sibr] Branching check failed:', e?.message || e);
    process.exit(1);
  }
}
main();
