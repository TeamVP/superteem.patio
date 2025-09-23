import { describe, it, expect } from 'vitest';
import { buildValidationContext, runValidation } from '../features/responses/runtime/validate';
import type { Template } from '../types/template';

const baseTemplate: Template = {
  id: 'tmpl',
  type: 'survey',
  version: '1',
  body: [
    {
      id: 's1',
      type: 'StringQuestion',
      label: 'Short',
      variable: '$short',
      required: true,
      minimumLength: 3,
      maximumLength: 5,
    },
    {
      id: 'i1',
      type: 'IntegerQuestion',
      label: 'Count',
      variable: '$count',
      minimum: 1,
      maximum: 10,
    },
    {
      id: 'm1',
      type: 'MultipleChoiceQuestion',
      label: 'Choices',
      variable: '$choices',
      options: ['A', 'B', 'C'],
      minimumResponses: 1,
      maximumResponses: 2,
    },
    { id: 'census', type: 'IntegerQuestion', label: 'Census', variable: '$census' },
    { id: 'bedside', type: 'IntegerQuestion', label: 'Bedside', variable: '$bedside' },
    { id: 'hallway', type: 'IntegerQuestion', label: 'Hallway', variable: '$hallway' },
  ],
};

describe('validation engine', () => {
  it('flags required and length and choice violations', () => {
    const ctx = buildValidationContext(baseTemplate);
    const res = runValidation(baseTemplate, { short: 'a', choices: [], count: 0 }, ctx);
    expect(res.fieldErrors.s1.some((m) => m.includes('Minimum length'))).toBeTruthy();
    expect(res.fieldErrors.m1.some((m) => m.includes('Select at least'))).toBeTruthy();
  });

  it('passes when within bounds', () => {
    const ctx = buildValidationContext(baseTemplate);
    const res = runValidation(baseTemplate, { short: 'abcd', choices: ['A'], count: 5 }, ctx);
    expect(res.fieldErrors.s1).toBeUndefined();
    expect(res.fieldErrors.m1).toBeUndefined();
  });

  it('enforces cross-field census rule', () => {
    const ctx = buildValidationContext(baseTemplate);
    const res = runValidation(baseTemplate, { census: 5, bedside: 3, hallway: 3 }, ctx);
    expect(res.formErrors).toContain('Census must be >= bedside + hallway');
    expect(res.fieldErrors.census).toBeDefined();
    expect(res.fieldErrors.bedside).toBeDefined();
    expect(res.fieldErrors.hallway).toBeDefined();
  });

  it('respects custom validation rule', () => {
    const tpl: Template = {
      id: 'custom',
      type: 'survey',
      version: '1',
      body: [
        {
          id: 'a1',
          type: 'IntegerQuestion',
          label: 'A',
          variable: '$a',
          customValidations: [{ expression: '$a > 10', errorMessage: 'A must be > 10' }],
        },
      ],
    };
    const ctx = buildValidationContext(tpl);
    const resFail = runValidation(tpl, { a: 5 }, ctx);
    expect(resFail.fieldErrors.a1?.[0]).toBe('A must be > 10');
    const resOk = runValidation(tpl, { a: 11 }, ctx);
    expect(resOk.fieldErrors.a1).toBeUndefined();
  });

  it('skips hidden fields from validation', () => {
    const tpl: Template = {
      id: 'hidden',
      type: 'survey',
      version: '1',
      body: [
        { id: 'flag', type: 'StringQuestion', label: 'Flag', variable: '$flag' },
        {
          id: 'depends',
          type: 'StringQuestion',
          label: 'Depends',
          variable: '$dep',
          required: true,
          enableIf: "$flag == 'yes'",
        },
      ],
    };
    const ctx = buildValidationContext(tpl);
    // dep hidden -> should not produce required error
    const resHidden = runValidation(tpl, { flag: 'no' }, ctx, {
      skipQuestionIds: new Set(['depends']),
    });
    expect(resHidden.fieldErrors.depends).toBeUndefined();
    // visible -> required triggers
    const resVisible = runValidation(tpl, { flag: 'yes' }, ctx);
    expect(resVisible.fieldErrors.depends?.[0]).toBe('This field is required');
  });
});
