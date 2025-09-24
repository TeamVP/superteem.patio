import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wrapQuestions, normalizeQuestions } from '@/lib/normalizeQuestions';

const thisFile = fileURLToPath(import.meta.url);
const root = path.join(path.dirname(thisFile), '..', '..');
const templatePath = path.join(root, 'spec/examples/templates/sibr-observation.json');

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

describe('question normalization', () => {
  const rawJson = fs.readFileSync(templatePath, 'utf-8');
  const raw = JSON.parse(rawJson);

  it('does not mutate original raw array', () => {
    const original = deepClone(raw);
    wrapQuestions(raw);
    expect(raw).toEqual(original);
  });

  it('adds capitalized keys & defaults', () => {
    const wrapped = wrapQuestions(raw);
    for (const q of wrapped.Questions) {
      const rec = q as Record<string, unknown>;
      expect(rec.Type).toBeTruthy();
      expect(rec.Required).not.toBeUndefined();
    }
  });

  it('is idempotent on normalized input', () => {
    const first = wrapQuestions(raw).Questions;
    const second = normalizeQuestions(first as any[]); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(second).toEqual(first);
  });

  it('preserves CustomValidations & ValueMode', () => {
    const wrapped = wrapQuestions(raw);
    function findMC(list: any[]): Record<string, unknown> | undefined { // eslint-disable-line @typescript-eslint/no-explicit-any
      for (const q of list) {
        const r = q as Record<string, unknown>;
        if (r.Type === 'MultipleChoiceQuestion') return r;
        if (Array.isArray(r.Questions)) {
          const nested = findMC(r.Questions as any[]); // eslint-disable-line @typescript-eslint/no-explicit-any
          if (nested) return nested;
        }
        if (r.Question && typeof r.Question === 'object') {
          const single = findMC([r.Question as any]); // eslint-disable-line @typescript-eslint/no-explicit-any
          if (single) return single;
        }
      }
      return undefined;
    }
    const mc = findMC(wrapped.Questions as any[]); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(mc).toBeTruthy();
    if (mc) {
      expect(mc.CustomValidations).toBeDefined();
      const vm = mc.ValueMode as string | null | undefined;
      expect(['value', 'index', undefined, null]).toContain(vm);
    }
  });
});
