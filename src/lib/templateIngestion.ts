import { normalizeQuestions, wrapQuestions } from './normalizeQuestions';
import type { Question } from '@/types/template';

export interface RawTemplateBody extends Array<Record<string, unknown>> {}

export interface NormalizedTemplateBody {
  Questions: Record<string, unknown>[];
}

export interface IngestionResult {
  normalized: NormalizedTemplateBody;
  raw: RawTemplateBody;
}

// Ingest a raw array (legacy form) returning normalized schema-wrapped object.
export function ingestTemplateBody(raw: unknown): IngestionResult {
  if (!Array.isArray(raw)) throw new Error('Template body must be a top-level array');
  const wrapped = wrapQuestions(raw) as unknown as NormalizedTemplateBody;
  return { normalized: wrapped, raw: raw as RawTemplateBody };
}

// Provide questions in internal lowercase shape (we keep using raw shape internally for now)
export function extractInternalQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) throw new Error('Template body must be array for internal extraction');
  return raw as Question[];
}

// Convenience: fully process from JSON string.
export function ingestFromJson(json: string): IngestionResult {
  const parsed = JSON.parse(json);
  return ingestTemplateBody(parsed);
}

// Re-export normalization for advanced callers.
export { normalizeQuestions };
