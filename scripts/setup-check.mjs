#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

function safe(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const report = [];
report.push('# Setup Report');

const nodeV = safe('node --version');
report.push('\n## Node.js');
report.push(nodeV ? `Node: ${nodeV}` : 'Node: missing');

const pnpmV = safe('pnpm --version');
report.push('\n## pnpm');
report.push(pnpmV ? `pnpm: ${pnpmV}` : 'pnpm: missing');

const gitV = safe('git --version');
report.push('\n## Git');
report.push(gitV ? gitV : 'git: missing');

writeFileSync('setup-report.md', report.join('\n'));
console.log('Wrote setup-report.md');
