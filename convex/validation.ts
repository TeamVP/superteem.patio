import { v } from 'convex/values';

interface FieldErrorMap {
  [variable: string]: string[];
}
interface ValidationResult {
  ok: boolean;
  fieldErrors: FieldErrorMap;
}

interface QuestionBase {
  id?: string | null;
  type: string;
  required?: boolean | null;
  variable?: string | null;
  minimumLength?: number | null;
  maximumLength?: number | null;
  minimum?: number | null;
  maximum?: number | null;
  minimumResponses?: number | null;
  maximumResponses?: number | null;
  options?: string[];
  questions?: QuestionBase[]; // composite
  question?: QuestionBase; // list repeated item
  minimumAnswers?: number | null; // list
  maximumAnswers?: number | null; // list
  customValidations?: { expression: string; errorMessage: string }[];
}
export type Question = QuestionBase;

function pushError(map: FieldErrorMap, key: string, msg: string) {
  if (!map[key]) map[key] = [];
  map[key].push(msg);
}

export function validateAnswers(
  templateBody: Question[],
  answers: Record<string, unknown>
): ValidationResult {
  const errors: FieldErrorMap = {};

  const visit = (q: Question) => {
    const variable = q.variable || undefined;
    if (q.type === 'CompositeQuestion' && q.questions) {
      q.questions.forEach(visit);
      return;
    }
    if (q.type === 'ListQuestion' && q.question) {
      if (variable) {
        const val = answers[variable];
        if (val == null) {
          if (q.required) pushError(errors, variable, 'Required');
        } else if (Array.isArray(val)) {
          if (q.minimumAnswers != null && val.length < q.minimumAnswers) {
            pushError(errors, variable, `Minimum ${q.minimumAnswers} items`);
          }
          if (q.maximumAnswers != null && val.length > q.maximumAnswers) {
            pushError(errors, variable, `Maximum ${q.maximumAnswers} items`);
          }
        } else {
          pushError(errors, variable, 'Must be array');
        }
      }
      // We do not currently validate each element content here (could iterate) – placeholder.
      visit(q.question);
      return;
    }
    if (!variable) return;
    const val = answers[variable];
    const isEmpty =
      val === undefined ||
      val === null ||
      (typeof val === 'string' && val.trim() === '') ||
      (Array.isArray(val) && val.length === 0);
    if (q.required && isEmpty) {
      pushError(errors, variable, 'Required');
      return; // Skip further checks if missing
    }
    if (val != null) {
      if (q.type === 'StringQuestion' && typeof val === 'string') {
        if (q.minimumLength != null && val.length < q.minimumLength) {
          pushError(errors, variable, `Min length ${q.minimumLength}`);
        }
        if (q.maximumLength != null && val.length > q.maximumLength) {
          pushError(errors, variable, `Max length ${q.maximumLength}`);
        }
      }
      if (q.type === 'IntegerQuestion' && typeof val === 'number') {
        if (q.minimum != null && val < q.minimum) {
          pushError(errors, variable, `Min ${q.minimum}`);
        }
        if (q.maximum != null && val > q.maximum) {
          pushError(errors, variable, `Max ${q.maximum}`);
        }
      }
      if (q.type === 'MultipleChoiceQuestion' && Array.isArray(val)) {
        if (q.minimumResponses != null && val.length < q.minimumResponses) {
          pushError(errors, variable, `Min choices ${q.minimumResponses}`);
        }
        if (q.maximumResponses != null && val.length > q.maximumResponses) {
          pushError(errors, variable, `Max choices ${q.maximumResponses}`);
        }
      }
    }
    // Custom validations placeholder: would evaluate expression engine; skipped for now.
  };

  templateBody.forEach(visit);
  return { ok: Object.keys(errors).length === 0, fieldErrors: errors };
}

// Convex validator for structured error throwing
export const validationErrorSchema = v.object({ fieldErrors: v.any() });
