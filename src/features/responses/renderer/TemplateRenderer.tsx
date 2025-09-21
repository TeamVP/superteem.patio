import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Template, Question, CompositeQuestion, ListQuestion } from '../../../types/template';
import { migrateExpression } from '../../../lib/expression/parser';
import type { JSONLogicExpression } from '../../../lib/expression/jsonlogic-types';
import { evaluate } from '../runtime/eval';
import { buildValidationContext, runValidation } from '../runtime/validate';

function isComposite(q: Question): q is CompositeQuestion {
  return q.type === 'CompositeQuestion';
}

function isList(q: Question): q is ListQuestion {
  return q.type === 'ListQuestion';
}

function collectVariables(q: Question): string[] {
  const vars: string[] = [];
  if (q.variable) vars.push(q.variable.replace(/^\$/, ''));
  if (isComposite(q)) q.questions.forEach((c) => vars.push(...collectVariables(c)));
  if (isList(q)) vars.push(...collectVariables(q.question));
  return vars;
}

interface TemplateRendererProps {
  template: Template;
  onChange?: (answers: Record<string, unknown>, payload: unknown) => void;
  initialAnswers?: Record<string, unknown>;
  onSubmit?: (answers: Record<string, unknown>, payload: unknown) => void;
  submitLabel?: string;
}

export function TemplateRenderer({
  template,
  onChange,
  initialAnswers,
  onSubmit,
  submitLabel = 'Submit',
}: TemplateRendererProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers || {});
  const [payload, setPayload] = useState<unknown>(null);
  const prevVisibilityRef = useRef<Record<string, boolean>>({});

  const init = useMemo(() => {
    // compile expressions
    const compiledMap: Record<string, JSONLogicExpression> = {};
    const walkCompile = (qs: Question[]) => {
      for (const q of qs) {
        if (q.enableIf) {
          const res = migrateExpression(q.enableIf);
          if (res.ok && q.id) {
            compiledMap[q.id] = res.ast;
          } else if (!res.ok && q.id) {
            // Very small fallback: $var == "literal"
            const m = q.enableIf.match(/^\$([a-zA-Z0-9_]+)\s*==\s*['"]([^'"]+)['"]/);
            if (m) {
              compiledMap[q.id] = { '==': [{ var: m[1] }, m[2]] } as unknown as JSONLogicExpression;
            }
          }
        }
        if (isComposite(q)) walkCompile(q.questions);
        if (isList(q)) walkCompile([q.question]);
      }
    };
    walkCompile(template.body);
    // initial visibility with empty answers
    const initialVis: Record<string, boolean> = {};
    const walkVis = (qs: Question[]) => {
      for (const q of qs) {
        let show = true;
        const ast = q.id ? compiledMap[q.id] : undefined;
        if (q.enableIf) show = ast ? !!evaluate(ast, { answers: {} }) : false;
        if (q.id) initialVis[q.id] = show;
        if (isComposite(q)) walkVis(q.questions);
        if (isList(q)) walkVis([q.question]);
      }
    };
    walkVis(template.body);
    const vctx = buildValidationContext(template);
    return { compiledMap, initialVis, vctx };
  }, [template]);

  const [compiled, setCompiled] = useState<Record<string, JSONLogicExpression>>(init.compiledMap);
  const [visibility, setVisibility] = useState<Record<string, boolean>>(init.initialVis);
  const [validationCtx, setValidationCtx] = useState(init.vctx);
  const [errors, setErrors] = useState<{ field: Record<string, string[]>; form: string[] }>({
    field: {},
    form: [],
  });

  interface PayloadNode {
    id: string | null | undefined;
    type: string;
    value?: unknown;
    children?: PayloadNode[];
    list?: PayloadNode[][]; // future: multiple entries
  }

  const buildPayload = useCallback(
    (a: Record<string, unknown>): PayloadNode[] => {
      const build = (qs: Question[]): PayloadNode[] =>
        qs.map((q) => {
          const base: PayloadNode = { id: q.id, type: q.type };
          if (q.variable) {
            const key = q.variable.replace(/^\$/, '');
            if (key in a) base.value = a[key];
          }
          if (isComposite(q)) base.children = build(q.questions);
          if (isList(q)) base.list = [build([q.question])];
          return base;
        });
      return build(template.body);
    },
    [template]
  );

  const emit = useCallback(
    (a: Record<string, unknown>) => {
      const p = buildPayload(a);
      setPayload(p);
      onChange?.(a, p);
    },
    [buildPayload, onChange]
  );

  // compile enableIf expressions once (naive: recompile when template changes)
  // If template changes, reset compiled, visibility, validation context
  useEffect(() => {
    setCompiled(init.compiledMap);
    setVisibility(init.initialVis);
    setValidationCtx(init.vctx);
  }, [init]);

  // evaluate visibility each render pass when answers or compiled change
  useEffect(() => {
    const vis: Record<string, boolean> = {};
    const walk = (qs: Question[]) => {
      for (const q of qs) {
        const ast = q.id ? compiled[q.id] : undefined;
        let show = true;
        if (q.enableIf && !ast) {
          // expression not compiled yet; treat as hidden to avoid flicker
          show = false;
        } else if (ast) {
          show = !!evaluate(ast, { answers });
        }
        if (q.id) vis[q.id] = show;
        if (isComposite(q)) walk(q.questions);
        if (isList(q)) walk([q.question]);
      }
    };
    walk(template.body);
    // clear answers for newly hidden
    const nextAnswers = { ...answers };
    for (const id of Object.keys(vis)) {
      const was = prevVisibilityRef.current[id];
      const now = vis[id];
      if (was === true && now === false) {
        const q = findQuestion(template.body, id);
        if (q) {
          for (const v of collectVariables(q)) delete nextAnswers[v];
        }
      }
    }
    prevVisibilityRef.current = vis;
    if (JSON.stringify(nextAnswers) !== JSON.stringify(answers)) {
      setAnswers(nextAnswers);
      emit(nextAnswers);
    } else {
      emit(answers);
    }
    setVisibility(vis);
    // run validation after visibility computed (skip hidden)
    const hidden = new Set<string>(Object.keys(vis).filter((id) => vis[id] === false));
    const vr = runValidation(template, answers, validationCtx, { skipQuestionIds: hidden });
    setErrors({ field: vr.fieldErrors, form: vr.formErrors });
  }, [answers, compiled, template, emit, validationCtx]);

  function updateAnswer(q: Question, value: unknown) {
    if (!q.variable) return;
    const key = q.variable.replace(/^\$/, '');
    const next = { ...answers, [key]: value };
    setAnswers(next);
    emit(next);
  }

  const hasErrors =
    errors.form.length > 0 || Object.values(errors.field).some((arr) => (arr || []).length > 0);

  return (
    <div className="space-y-4">
      {template.body.map((q) => {
        const qVar = q.variable ? q.variable.replace(/^\$/, '') : undefined;
        const vis = q.id ? visibility[q.id] : true;
        const finalVisible = vis !== undefined ? vis : q.enableIf ? false : true;
        return (
          <QuestionNode
            key={q.id}
            q={q}
            visible={finalVisible}
            answerValue={qVar ? answers[qVar] : undefined}
            onChange={updateAnswer}
            visibility={visibility}
            errors={errors.field[q.id || '']}
          />
        );
      })}
      {(errors.form.length > 0 || Object.keys(errors.field).length > 0) && (
        <div className="space-y-1 border border-red-300 rounded p-2 bg-red-50">
          <div className="text-sm font-semibold text-red-700">Validation Errors</div>
          <ul className="list-disc ml-5 text-xs text-red-700 space-y-0.5">
            {errors.form.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <pre className="text-xs bg-gray-50 p-2 rounded font-mono overflow-auto">
          {JSON.stringify(answers, null, 2)}
        </pre>
        <pre className="text-xs bg-gray-50 p-2 rounded font-mono overflow-auto">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
      {onSubmit && (
        <div>
          <button
            type="button"
            disabled={hasErrors}
            onClick={() => {
              if (!hasErrors) onSubmit(answers, payload);
            }}
            className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
              hasErrors
                ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-500'
            }`}
            aria-disabled={hasErrors}
          >
            {submitLabel}
          </button>
          {hasErrors && (
            <div className="mt-1 text-xs text-red-600">
              Resolve validation errors to enable submit.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function findQuestion(qs: Question[], id: string): Question | undefined {
  for (const q of qs) {
    if (q.id === id) return q;
    if (isComposite(q)) {
      const f = findQuestion(q.questions, id);
      if (f) return f;
    }
    if (isList(q)) {
      const f = findQuestion([q.question], id);
      if (f) return f;
    }
  }
  return undefined;
}

interface QuestionNodeProps {
  q: Question;
  visible: boolean;
  answerValue: unknown;
  onChange: (q: Question, value: unknown) => void;
  visibility: Record<string, boolean>;
  errors?: string[];
}

function QuestionNode({
  q,
  visible,
  answerValue,
  onChange,
  errors,
  visibility: visibilityMap,
}: QuestionNodeProps) {
  if (!visible) return null;
  switch (q.type) {
    case 'CompositeQuestion':
      return (
        <div className="space-y-2 border rounded p-2">
          <div className="text-sm font-semibold">{q.label}</div>
          {(q.questions || []).map((child) => (
            <QuestionNode
              key={child.id}
              q={child}
              visible={visibilityMap[child.id || ''] !== false}
              answerValue={
                child.variable && typeof answerValue === 'object' && answerValue
                  ? (answerValue as Record<string, unknown>)[child.variable]
                  : undefined
              }
              onChange={onChange}
              visibility={visibilityMap}
              errors={errors}
            />
          ))}
        </div>
      );
    case 'ListQuestion':
      return (
        <div className="space-y-2 border rounded p-2">
          <div className="text-sm font-semibold">{q.label}</div>
          <QuestionNode
            q={q.question}
            visible={visibilityMap[q.question.id || ''] !== false}
            answerValue={answerValue}
            onChange={onChange}
            visibility={visibilityMap}
          />
        </div>
      );
    case 'StringQuestion':
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={q.id!}>
            {q.label}
          </label>
          <input
            id={q.id!}
            className={`border rounded px-2 py-1 text-sm ${errors?.length ? 'border-red-500' : ''}`}
            value={(answerValue as string) || ''}
            onChange={(e) => onChange(q, e.target.value)}
          />
          {errors?.map((err) => (
            <div key={err} className="text-xs text-red-600">
              {err}
            </div>
          ))}
        </div>
      );
    case 'IntegerQuestion':
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={q.id!}>
            {q.label}
          </label>
          <input
            type="number"
            id={q.id!}
            className={`border rounded px-2 py-1 text-sm ${errors?.length ? 'border-red-500' : ''}`}
            value={(answerValue as number | undefined) ?? ''}
            onChange={(e) => onChange(q, e.target.value ? Number(e.target.value) : null)}
          />
          {errors?.map((err) => (
            <div key={err} className="text-xs text-red-600">
              {err}
            </div>
          ))}
        </div>
      );
    case 'MultipleChoiceQuestion':
      return (
        <div className="space-y-1">
          <div className="text-sm font-medium">{q.label}</div>
          <div className="flex flex-wrap gap-2">
            {(q.options || []).map((opt) => {
              const arr = (answerValue as string[]) || [];
              const checked = arr.includes(opt);
              return (
                <label key={opt} className="text-xs flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked ? arr.filter((x) => x !== opt) : [...arr, opt];
                      onChange(q, next);
                    }}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
          {errors?.map((err) => (
            <div key={err} className="text-xs text-red-600">
              {err}
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div className="text-sm text-gray-500">
          Unsupported question type: <code>{q.type}</code>
        </div>
      );
  }
}

export default TemplateRenderer;
