import type {
  Question,
  Template,
  CompositeQuestion,
  ListQuestion,
  StringQuestion,
  IntegerQuestion,
  MultipleChoiceQuestion,
} from '../../../types/template';

function isComposite(q: Question): q is CompositeQuestion {
  return q.type === 'CompositeQuestion';
}

function isList(q: Question): q is ListQuestion {
  return q.type === 'ListQuestion';
}
import { migrateExpression } from '../../../lib/expression/parser';
import type { JSONLogicExpression } from '../../../lib/expression/jsonlogic-types';
import { evaluate } from './eval';

export interface ValidationResult {
  fieldErrors: Record<string, string[]>; // questionId -> errors
  formErrors: string[]; // summary-level errors
}

interface CompiledCustomRule {
  questionId: string;
  message: string;
  ast: JSONLogicExpression;
}

interface ValidationContextBuild {
  variableToQuestion: Record<string, string>; // variable name (without $) to question id
  compiledRules: CompiledCustomRule[];
}

export function buildValidationContext(template: Template): ValidationContextBuild {
  const variableToQuestion: Record<string, string> = {};
  const compiledRules: CompiledCustomRule[] = [];
  const walk = (qs: Question[]) => {
    for (const q of qs) {
      if (q.variable && q.id) {
        variableToQuestion[q.variable.replace(/^\$/, '')] = q.id;
      }
      if (q.customValidations && q.id) {
        for (const rule of q.customValidations) {
          const migrated = migrateExpression(rule.expression);
          if (migrated.ok) {
            compiledRules.push({
              questionId: q.id,
              message: rule.errorMessage,
              ast: migrated.ast,
            });
          }
        }
      }
      if (isComposite(q)) walk(q.questions);
      if (isList(q)) walk([q.question]);
    }
  };
  walk(template.body);
  return { variableToQuestion, compiledRules };
}

export interface RunValidationOptions {
  skipQuestionIds?: Set<string>; // hidden questions
}

export function runValidation(
  template: Template,
  answers: Record<string, unknown>,
  ctx: ValidationContextBuild,
  options: RunValidationOptions = {}
): ValidationResult {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];
  const skip = options.skipQuestionIds || new Set<string>();

  const addFieldError = (id: string | undefined | null, msg: string) => {
    if (!id) return;
    if (!fieldErrors[id]) fieldErrors[id] = [];
    if (!fieldErrors[id].includes(msg)) fieldErrors[id].push(msg);
  };
  const addFormError = (msg: string) => {
    if (!formErrors.includes(msg)) formErrors.push(msg);
  };

  const requiredMissing = (val: unknown) =>
    val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);

  const walkBuiltIns = (qs: Question[]) => {
    for (const q of qs) {
      if (skip.has(q.id || '')) {
        if (isComposite(q)) walkBuiltIns(q.questions);
        if (isList(q)) walkBuiltIns([q.question]);
        continue;
      }
      const varName = q.variable ? q.variable.replace(/^\$/, '') : undefined;
      const val = varName ? answers[varName] : undefined;
      if (q.required && requiredMissing(val)) {
        addFieldError(q.id, 'This field is required');
      }
      switch (q.type) {
        case 'StringQuestion': {
          const sq = q as StringQuestion;
          if (typeof val === 'string') {
            if (sq.minimumLength != null && val.length < sq.minimumLength) {
              addFieldError(q.id, `Minimum length is ${sq.minimumLength}`);
            }
            if (sq.maximumLength != null && val.length > sq.maximumLength) {
              addFieldError(q.id, `Maximum length is ${sq.maximumLength}`);
            }
          }
          break;
        }
        case 'IntegerQuestion': {
          const iq = q as IntegerQuestion;
          if (val !== undefined && val !== null) {
            const num = typeof val === 'number' ? val : Number(val);
            if (!Number.isNaN(num)) {
              if (iq.minimum != null && num < iq.minimum) {
                addFieldError(q.id, `Minimum value is ${iq.minimum}`);
              }
              if (iq.maximum != null && num > iq.maximum) {
                addFieldError(q.id, `Maximum value is ${iq.maximum}`);
              }
            } else {
              addFieldError(q.id, 'Must be a number');
            }
          }
          break;
        }
        case 'MultipleChoiceQuestion': {
          const mq = q as MultipleChoiceQuestion;
          const arr = Array.isArray(val) ? val : [];
          if (mq.minimumResponses != null && arr.length < mq.minimumResponses) {
            addFieldError(q.id, `Select at least ${mq.minimumResponses}`);
          }
          if (mq.maximumResponses != null && arr.length > mq.maximumResponses) {
            addFieldError(q.id, `Select at most ${mq.maximumResponses}`);
          }
          break;
        }
      }
      if (isComposite(q)) walkBuiltIns(q.questions);
      if (isList(q)) walkBuiltIns([q.question]);
    }
  };

  walkBuiltIns(template.body);

  // custom validations
  for (const rule of ctx.compiledRules) {
    if (skip.has(rule.questionId)) continue;
    const ok = evaluate(rule.ast, { answers });
    if (!ok) addFieldError(rule.questionId, rule.message);
  }

  // cross-field census rule: census >= bedside + hallway
  const censusVar = 'census';
  const bedsideVar = 'bedside';
  const hallwayVar = 'hallway';
  if (
    censusVar in ctx.variableToQuestion &&
    bedsideVar in ctx.variableToQuestion &&
    hallwayVar in ctx.variableToQuestion
  ) {
    const c = Number(answers[censusVar]);
    const b = Number(answers[bedsideVar]);
    const h = Number(answers[hallwayVar]);
    if ([c, b, h].every((n) => !Number.isNaN(n))) {
      if (c < b + h) {
        const msg = 'Census must be >= bedside + hallway';
        addFormError(msg);
        addFieldError(ctx.variableToQuestion[censusVar], msg);
        addFieldError(ctx.variableToQuestion[bedsideVar], msg);
        addFieldError(ctx.variableToQuestion[hallwayVar], msg);
      }
    }
  }

  return { fieldErrors, formErrors };
}
