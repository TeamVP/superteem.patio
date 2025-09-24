#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const file = path.join(root, 'spec/examples/templates/ahpeqs-survey.json');

const body = JSON.parse(fs.readFileSync(file, 'utf-8'));

function run(cmd) {
  try {
    const out = execSync(cmd, { stdio: 'pipe', cwd: root, env: process.env });
    return out.toString('utf-8').trim();
  } catch (e) {
    console.error('Command failed:', cmd);
    console.error(e.stdout?.toString?.() || e.message);
    process.exit(1);
  }
}

// Ensure Convex code is pushed
run('npx convex dev --once');

// Create or update a global template with slug 'ahpeqs-survey'
const ensureTemplate = () => {
  // Try find by slug (public)
  const found = run("npx convex run templates:getBySlug '{\"slug\": \"ahpeqs-survey\"}'");
  if (found && found !== 'null') {
    return JSON.parse(found)._id;
  }
  // Create minimal draft then publish snapshot using adminOverwriteTemplateBody-like flow:
  // Use saveTemplateDraft to set body and publishTemplateVersion
  const draft = run(
    "npx convex run templates:createTemplate '{\"slug\":\"ahpeqs-survey\",\"title\":\"AHPEQS Survey\",\"type\":\"survey\",\"body\":{}}'"
  );
  const id = JSON.parse(draft);
  // Save body to template record then publish snapshot v1
  run(
    `npx convex run templates:saveTemplateDraft '{"templateId":"${id}","body":${JSON.stringify(
      body
    )}}'`
  );
  run(`npx convex run templates:publishTemplateVersion '{"templateId":"${id}"}'`);
  return id;
};

const templateId = ensureTemplate();
console.log('AHPEQS template id:', templateId);
