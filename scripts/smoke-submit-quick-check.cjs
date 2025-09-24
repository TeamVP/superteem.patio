// Simple smoke script: submit Quick Check response and verify stored
const fs = require('fs');
const path = require('path');
const { ConvexClient } = require('convex/browser');
const { api } = require('../convex/_generated/api');

function getConvexUrl() {
  if (process.env.VITE_CONVEX_URL) return process.env.VITE_CONVEX_URL;
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const txt = fs.readFileSync(envPath, 'utf8');
    const m = txt.match(/VITE_CONVEX_URL=(.*)/);
    if (m && m[1]) return m[1].trim();
  }
  throw new Error('Convex URL not found in env');
}

(async () => {
  const url = getConvexUrl();
  const client = new ConvexClient(url);
  const slug = 'quick-check';
  const tmpl = await client.query(api.templates.getBySlug, { slug });
  if (!tmpl) throw new Error('Quick Check template not found');
  const templateId = tmpl._id;
  const answers = { $mood: 'Great', $pain: 3 };
  const payload = {};
  const responseId = await client.mutation(api.responses.submitResponse, {
    templateId,
    answers,
    payload,
  });
  console.log('Submitted response id:', responseId);
  const list = await client.query(api.responses.listResponsesByTemplateVersion, {
    templateId,
    version: tmpl.latestVersion,
  });
  console.log('Submitted count for template:', list.length);
  if (list.length === 0) {
    process.exitCode = 1;
    console.error('Smoke test failed: no responses returned');
  } else {
    console.log('Smoke test OK');
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
