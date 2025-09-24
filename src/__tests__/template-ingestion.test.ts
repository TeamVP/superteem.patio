import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestTemplateBody } from '@/lib/templateIngestion';

const thisFile = fileURLToPath(import.meta.url);
const root = path.join(path.dirname(thisFile), '..', '..');
const examples = [
  'spec/examples/templates/sibr-observation.json',
  'spec/examples/templates/interdisciplinary-care-survey.json',
  'spec/examples/templates/ahpeqs-survey.json',
];

describe('template ingestion', () => {
  for (const rel of examples) {
    it(`ingests ${rel}`, () => {
      const json = fs.readFileSync(path.join(root, rel), 'utf-8');
      const raw = JSON.parse(json);
      const { normalized } = ingestTemplateBody(raw);
      expect(Array.isArray(raw)).toBe(true);
      expect(normalized).toHaveProperty('Questions');
      expect(Array.isArray(normalized.Questions)).toBe(true);
      // spot check: every normalized question has Type
      for (const q of normalized.Questions) {
        expect((q as any).Type).toBeTruthy(); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    });
  }
});
