export interface NormalizationOptions {
  addDefaults?: boolean;
}

// Map lowercase field names to schema's capitalized names
const fieldMap: Record<string, string> = {
  type: 'Type',
  label: 'Label',
  note: 'Note',
  variable: 'Variable',
  required: 'Required',
  enableIf: 'EnableIf',
  customValidations: 'CustomValidations',
  layout: 'Layout',
  questions: 'Questions',
  display: 'Display',
  minimum: 'Minimum',
  maximum: 'Maximum',
  minimumResponses: 'MinimumResponses',
  maximumResponses: 'MaximumResponses',
  minimumAnswers: 'MinimumAnswers',
  maximumAnswers: 'MaximumAnswers',
  question: 'Question',
  options: 'Options',
  lineType: 'LineType',
  minimumLength: 'MinimumLength',
  maximumLength: 'MaximumLength',
  constraint: 'Constraint',
  contentTypes: 'ContentTypes',
  groupType: 'GroupType',
  jobTypeCategories: 'JobTypeCategories',
  jobTypeIds: 'JobTypeIds',
  valueMode: 'ValueMode',
  expression: 'Expression',
  errorMessage: 'ErrorMessage',
};

const requiredBase = ['Label', 'Note', 'Variable', 'Required', 'EnableIf'];

type PlainObj = Record<string, unknown>;
function isPlainObject(v: unknown): v is PlainObj {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

interface NormalizedValidation {
  Expression: string | null;
  ErrorMessage: string | null;
}
function normalizeCustomValidation(
  cv: unknown,
  opts: NormalizationOptions
): NormalizedValidation | unknown {
  if (!isPlainObject(cv)) return cv;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(cv)) {
    out[fieldMap[k] || k] = val;
  }
  if (opts.addDefaults) {
    if (out.Expression === undefined) out.Expression = null;
    if (out.ErrorMessage === undefined) out.ErrorMessage = null;
  }
  return {
    Expression: (out.Expression as string | null) ?? null,
    ErrorMessage: (out.ErrorMessage as string | null) ?? null,
  };
}

export type NormalizedQuestion = Record<string, unknown>;
export function normalizeQuestion(
  node: unknown,
  opts: NormalizationOptions
): NormalizedQuestion | unknown {
  if (!isPlainObject(node)) return node;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(node)) {
    const mapped = fieldMap[k] || k;
    if (mapped === 'Questions' && Array.isArray(val)) {
      out[mapped] = val.map((q) => normalizeQuestion(q, opts));
    } else if (mapped === 'Question' && isPlainObject(val)) {
      out[mapped] = normalizeQuestion(val, opts);
    } else if (mapped === 'CustomValidations' && Array.isArray(val)) {
      out[mapped] = val.map((v) => normalizeCustomValidation(v, opts));
    } else if (mapped === 'CustomValidations' && val == null) {
      out[mapped] = val;
    } else {
      out[mapped] = val;
    }
  }
  if (opts.addDefaults) {
    for (const base of requiredBase) {
      if (out[base] === undefined) out[base] = base === 'Required' ? false : null;
    }
    const t = out.Type as string | undefined;
    if (t && t.endsWith('Question')) {
      if (t === 'CompositeQuestion') {
        if (out.Layout === undefined) out.Layout = 0;
        if (out.Questions === undefined) out.Questions = [];
      }
      if (t === 'MultipleChoiceQuestion') {
        if (out.Options === undefined) out.Options = [];
        if (out.MinimumResponses === undefined) out.MinimumResponses = 0;
        if (out.MaximumResponses === undefined) out.MaximumResponses = 1;
      }
      if (t === 'IntegerQuestion') {
        if (out.Display === undefined) out.Display = 0;
        if (out.Minimum === undefined) out.Minimum = null;
        if (out.Maximum === undefined) out.Maximum = null;
      }
      if (t === 'StringQuestion') {
        if (out.LineType === undefined) out.LineType = 0;
        if (out.MinimumLength === undefined) out.MinimumLength = null;
        if (out.MaximumLength === undefined) out.MaximumLength = null;
      }
    }
    if (out.CustomValidations === undefined) out.CustomValidations = [];
  }
  return out as NormalizedQuestion;
}

export function normalizeQuestions(
  raw: unknown[],
  opts: NormalizationOptions = { addDefaults: true }
) {
  return raw.map((q) => normalizeQuestion(q, opts));
}

export function wrapQuestions(raw: unknown[], opts: NormalizationOptions = { addDefaults: true }) {
  return { Questions: normalizeQuestions(raw, opts) };
}
