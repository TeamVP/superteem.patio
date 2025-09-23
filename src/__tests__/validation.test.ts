import {
  validateTemplate,
  validateResponse,
  validateSubmissionContext,
  ajv,
  validationErrors,
} from '../lib/validation';
import templateSchema from '../../spec/schema/template.schema.json';
import responseSchema from '../../spec/schema/response.schema.json';
import submissionContextSchema from '../../spec/schema/submission-context.schema.json';
import templateAQuestions from '../../spec/examples/templates/interdisciplinary-care-survey.json';
import templateBQuestions from '../../spec/examples/templates/sibr-observation.json';
import templateCQuestions from '../../spec/examples/templates/sibr-readiness-survey.json';
import submissionCtx from '../../spec/examples/submission-context/example-submission-context.json';
import responseExample from '../../spec/examples/responses/example-response.json';

// Sanity: schemas registered
it('schemas are registered in AJV instance', () => {
  expect(ajv.getSchema(templateSchema.$id as string)).toBeTruthy();
  expect(ajv.getSchema(responseSchema.$id as string)).toBeTruthy();
  expect(ajv.getSchema(submissionContextSchema.$id as string)).toBeTruthy();
});

it('validates example templates', () => {
  const wrap = (id: string, body: unknown[]) => ({ id, type: 'survey', version: '1.0.0', body });
  // prettier-ignore
  expect(validateTemplate(wrap('interdisciplinary-care-survey', templateAQuestions as unknown[]))).toBe(true);
  // prettier-ignore
  expect(validateTemplate(wrap('sibr-observation', templateBQuestions as unknown[]))).toBe(true);
  // prettier-ignore
  expect(validateTemplate(wrap('sibr-readiness-survey', templateCQuestions as unknown[]))).toBe(true);
});

it('validates example submission context', () => {
  if (!validateSubmissionContext(submissionCtx)) {
    console.error('Context errors', validationErrors());
  }
  expect(validateSubmissionContext(submissionCtx)).toBe(true);
});

it('validates example response', () => {
  if (!validateResponse(responseExample)) {
    console.error('Response errors', validationErrors());
  }
  expect(validateResponse(responseExample)).toBe(true);
});

it('fails on invalid response (missing required field)', () => {
  const invalid = {
    id: 'r2',
    templateId: 'sibr-readiness-survey',
    status: 'in_progress',
  } as unknown;
  const ok = validateResponse(invalid);
  expect(ok).toBe(false);
  expect(validationErrors().length).toBeGreaterThan(0);
});

// --- Server-side answer validation utility tests (convex/validation.ts) ---
import { validateAnswers, Question as ServerQuestion } from '../../convex/validation';

describe('server validateAnswers', () => {
  const stringQ: ServerQuestion = {
    type: 'StringQuestion',
    variable: '$s',
    required: true,
    minimumLength: 2,
    maximumLength: 4,
  };

  it('passes valid string', () => {
    const r = validateAnswers([stringQ], { $s: 'hey' });
    expect(r.ok).toBe(true);
  });

  it('flags required missing', () => {
    const r = validateAnswers([stringQ], {});
    expect(r.ok).toBe(false);
    expect(r.fieldErrors.$s).toContain('Required');
  });

  it('flags min length', () => {
    const r = validateAnswers([stringQ], { $s: 'a' });
    expect(r.ok).toBe(false);
  });

  it('flags max length', () => {
    const r = validateAnswers([stringQ], { $s: 'hello' });
    expect(r.ok).toBe(false);
  });

  it('integer bounds', () => {
    const intQ: ServerQuestion = {
      type: 'IntegerQuestion',
      variable: '$n',
      minimum: 1,
      maximum: 3,
    };
    expect(validateAnswers([intQ], { $n: 2 }).ok).toBe(true);
    expect(validateAnswers([intQ], { $n: 0 }).ok).toBe(false);
    expect(validateAnswers([intQ], { $n: 4 }).ok).toBe(false);
  });

  it('multiple choice selection count', () => {
    const mc: ServerQuestion = {
      type: 'MultipleChoiceQuestion',
      variable: '$m',
      options: ['a', 'b', 'c'],
      minimumResponses: 1,
      maximumResponses: 2,
    };
    expect(validateAnswers([mc], { $m: ['a'] }).ok).toBe(true);
    expect(validateAnswers([mc], { $m: [] }).ok).toBe(false);
    expect(validateAnswers([mc], { $m: ['a', 'b', 'c'] }).ok).toBe(false);
  });

  it('list answers length', () => {
    const inner: ServerQuestion = {
      type: 'StringQuestion',
      variable: '$item',
      // not required at element level for this minimal list length test
      required: false,
    };
    const list: ServerQuestion = {
      type: 'ListQuestion',
      variable: '$list',
      question: inner,
      minimumAnswers: 1,
      maximumAnswers: 2,
    };
    expect(validateAnswers([list], { $list: ['x'] }).ok).toBe(true);
    expect(validateAnswers([list], { $list: [] }).ok).toBe(false);
    expect(validateAnswers([list], { $list: ['a', 'b', 'c'] }).ok).toBe(false);
  });
});
