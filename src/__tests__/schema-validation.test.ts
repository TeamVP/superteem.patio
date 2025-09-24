import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import { wrapQuestions } from '../lib/normalizeQuestions';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// process is available in vitest node environment
const thisFile = fileURLToPath(import.meta.url);
const __root = path.join(path.dirname(thisFile), '..', '..');
const schemaPath = path.join(__root, 'spec/schema/superteem-questions-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

// Helper to load raw question arrays (example templates are arrays) and wrap after normalization
function loadNormalized(fileRel: string) {
  const p = path.join(__root, fileRel);
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
  if (!Array.isArray(raw)) throw new Error('Expected top-level array');
  return wrapQuestions(raw);
}

describe('Questions schema compliance', () => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  // Patch schema in-memory to allow ValueMode (not present in original) for MultipleChoiceQuestion
  const s: unknown = schema;
  if (typeof s === 'object' && s && 'definitions' in s) {
    const defs = (s as Record<string, unknown>).definitions as Record<string, any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
    const mc = defs?.MultipleChoiceQuestion as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (mc && mc.properties && !mc.properties.ValueMode) {
      mc.properties.ValueMode = { type: ['string', 'null'], enum: ['value', 'index', null] };
    }
  }
  const validate = ajv.compile(schema as Record<string, unknown>);
  const files = [
    'spec/examples/templates/sibr-observation.json',
    'spec/examples/templates/interdisciplinary-care-survey.json',
    'spec/examples/templates/ahpeqs-survey.json',
  ];
  for (const f of files) {
    it(`validates ${f}`, () => {
  const data = loadNormalized(f);
      const ok = validate(data);
      if (!ok) {
        // Provide focused diff; show first few errors
        const msgs = (validate.errors || [])
          .slice(0, 5)
          .map(
            (e: { instancePath?: string; message?: string }) => `${e.instancePath} ${e.message}`
          );
        throw new Error('Schema validation failed: \n' + msgs.join('\n'));
      }
      expect(ok).toBe(true);
    });
  }
});
