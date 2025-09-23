import React, { useState, useMemo } from 'react';
import { Template, Question, CompositeQuestion, ListQuestion } from '../types/template';
import { FormField } from './FormField';
import { NumberField } from './NumberField';

export interface ValidationErrorMap {
  [questionId: string]: string[];
}

interface TemplateRendererProps {
  template: Template;
  initialAnswers?: Record<string, unknown>;
  validate?: (answers: Record<string, unknown>) => ValidationErrorMap;
  onChange?: (answers: Record<string, unknown>) => void;
  showSummary?: boolean;
}

export function TemplateRenderer({
  template,
  initialAnswers = {},
  validate,
  onChange,
  showSummary = true,
}: TemplateRendererProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const errors = useMemo(() => (validate ? validate(answers) : {}), [answers, validate]);

  function update(id: string, value: unknown) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onChange?.(next);
  }

  function expand(qs: Question[]): Question[] {
    const out: Question[] = [];
    for (const q of qs) {
      out.push(q);
      if (q.type === 'CompositeQuestion') out.push(...expand((q as CompositeQuestion).questions));
      if (q.type === 'ListQuestion') out.push((q as ListQuestion).question);
    }
    return out;
  }
  const flatQuestions: Question[] = expand(template.body);
  const summaryItems = Object.entries(errors)
    .flatMap(([id, msgs]) => msgs.map((m) => ({ id, m })))
    .slice(0, 50); // guard

  return (
    <div className="space-y-4">
      {showSummary && summaryItems.length > 0 && (
        <div className="border border-red-300 bg-red-50 p-3 rounded">
          <p className="font-semibold text-red-700 mb-1">Please fix the following:</p>
          <ul className="list-disc list-inside text-sm text-red-700">
            {summaryItems.map((e, i) => (
              <li key={i}>{e.m}</li>
            ))}
          </ul>
        </div>
      )}
      {flatQuestions.map((q) => {
        const errorList = errors[q.id || ''] || [];
        const commonFieldProps = {
          htmlFor: q.id || '',
          error: errorList[0] || null,
        } as const;
        if (q.type === 'IntegerQuestion') {
          return (
            <FormField key={q.id} {...commonFieldProps} label={q.label || q.id || 'Integer'}>
              <NumberField
                id={q.id || ''}
                value={(answers[q.id || ''] as string) || ''}
                onChange={(v) => update(q.id || '', v === '' ? undefined : parseInt(v, 10))}
                invalid={errorList.length > 0}
              />
            </FormField>
          );
        }
        if (q.type === 'StringQuestion') {
          return (
            <FormField key={q.id} {...commonFieldProps} label={q.label || q.id || 'Text'}>
              <input
                id={q.id || ''}
                className={`border rounded px-2 py-1 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errorList.length
                    ? 'border-red-600 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                value={(answers[q.id || ''] as string) || ''}
                onChange={(e) => update(q.id || '', e.target.value)}
              />
            </FormField>
          );
        }
        if (q.type === 'MultipleChoiceQuestion') {
          const current = (answers[q.id || ''] as string[]) || [];
          return (
            <FormField key={q.id} {...commonFieldProps} label={q.label || q.id || 'Choices'}>
              <div className="flex flex-wrap gap-2">
                {(q.options || []).map((opt) => {
                  const checked = current.includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded border cursor-pointer bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? current.filter((x) => x !== opt)
                            : [...current, opt];
                          update(q.id || '', next);
                        }}
                      />
                      <span className="text-gray-700 dark:text-gray-200">{opt}</span>
                    </label>
                  );
                })}
              </div>
              {errorList.length > 0 && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {errorList[0]}
                </p>
              )}
            </FormField>
          );
        }
        if (q.type === 'CompositeQuestion') {
          return (
            <div key={q.id} className="border rounded p-3 space-y-3 bg-gray-50 dark:bg-gray-800">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {q.label || q.id}
              </div>
            </div>
          );
        }
        if (q.type === 'ListQuestion') {
          return (
            <div key={q.id} className="border rounded p-3 space-y-2 bg-gray-50 dark:bg-gray-800">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {q.label || q.id}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">(List item prototype)</div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
