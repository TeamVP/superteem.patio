import { describe, it, expect } from 'vitest';
import rawSibr from '../../spec/examples/templates/sibr-observation.json';
import { buildValidationContext, runValidation } from '../features/responses/runtime/validate';
import type { Template, Question } from '../types/template';

// Assign synthetic ids to each question recursively for validation mapping
type AnyQuestion = Record<string, unknown> & { type: string };

function isComposite(q: AnyQuestion): q is AnyQuestion & { questions: AnyQuestion[] } {
  return q.type === 'CompositeQuestion' && Array.isArray((q as AnyQuestion).questions);
}
function isList(q: AnyQuestion): q is AnyQuestion & { question: AnyQuestion } {
  return q.type === 'ListQuestion' && typeof (q as AnyQuestion).question === 'object';
}

function assignIds(qs: AnyQuestion[], prefix = 'q', idxRef = { i: 0 }): Question[] {
  return qs.map((q) => {
    const id = `${prefix}${idxRef.i++}`;
    const base: AnyQuestion = { ...q, id };
    if (isComposite(q)) base.questions = assignIds(q.questions, prefix, idxRef);
    if (isList(q)) base.question = assignIds([q.question], prefix, idxRef)[0];
    return base as unknown as Question;
  });
}

const template: Template = {
  id: 'sibr',
  type: 'observation',
  title: 'SIBR Observation',
  version: '1',
  body: assignIds(rawSibr as AnyQuestion[]),
};

describe('SIBR observation branching', () => {
  it('sections hidden when sibr not occurred (sibr_occurred = ["No"])', () => {
    const ctx = buildValidationContext(template);
    // mimic answers: $sibr_occurred variable mapped without leading $
    const answers = { sibr_occurred: ['No'] };
    // No validation errors just from absence
    const result = runValidation(template, answers, ctx);
    expect(result.formErrors.length).toBe(0);
  });

  it('family count custom rules trigger errors when exceeding SIBR counts', () => {
    const ctx = buildValidationContext(template);
    const answers = {
      patient_census: 10,
      sibr_occurred: ['Yes'],
      bedside: 2,
      hallway: 1,
      onsite: 3, // 3 onsite + 2 offsite = 5 > bedside+hallway (3) should error
      offsite: 2,
    };
    const result = runValidation(template, answers, ctx);
    const onsiteId = ctx.variableToQuestion['onsite'];
    const offsiteId = ctx.variableToQuestion['offsite'];
    expect(onsiteId).toBeDefined();
    expect(offsiteId).toBeDefined();
    const onsiteMsgs = onsiteId ? result.fieldErrors[onsiteId] || [] : [];
    const offsiteMsgs = offsiteId ? result.fieldErrors[offsiteId] || [] : [];
    const hasFamilyError = [...onsiteMsgs, ...offsiteMsgs].some((m) =>
      m.toLowerCase().includes('family')
    );
    // Provide debugging context if it fails
    if (!hasFamilyError) {
      console.error('Field errors present', { onsiteMsgs, offsiteMsgs, all: result.fieldErrors });
    }
    expect(hasFamilyError).toBe(true);
  });

  it('family count custom rules pass when counts within bounds', () => {
    const ctx = buildValidationContext(template);
    const answers = {
      patient_census: 10,
      sibr_occurred: ['Yes'],
      bedside: 4,
      hallway: 2,
      onsite: 3,
      offsite: 2, // 3+2 <= 4+2
    };
    const result = runValidation(template, answers, ctx);
    // Should have no family-related errors
    const allErrors = Object.values(result.fieldErrors).flat();
    expect(allErrors.some((m) => m.toLowerCase().includes('family'))).toBe(false);
  });
});
