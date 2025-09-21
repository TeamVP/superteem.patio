import React, { useState, useMemo } from 'react';
import { Template, Question } from '../types/template';
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

  const flatQuestions: Question[] = template.body;
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
        switch (q.type) {
          case 'IntegerQuestion':
            return (
              <FormField
                key={q.id}
                label={q.label || q.id || 'Integer'}
                htmlFor={q.id || ''}
                error={errorList[0] || null}
              >
                <NumberField
                  id={q.id || ''}
                  value={(answers[q.id || ''] as string) || ''}
                  onChange={(v) => update(q.id || '', v === '' ? undefined : parseInt(v, 10))}
                  invalid={errorList.length > 0}
                />
              </FormField>
            );
          case 'StringQuestion':
            return (
              <FormField
                key={q.id}
                label={q.label || q.id || 'Text'}
                htmlFor={q.id || ''}
                error={errorList[0] || null}
              >
                <input
                  id={q.id || ''}
                  className={`border rounded px-2 py-1 w-full ${
                    errorList.length ? 'border-red-600' : 'border-gray-300'
                  }`}
                  value={(answers[q.id || ''] as string) || ''}
                  onChange={(e) => update(q.id || '', e.target.value)}
                />
              </FormField>
            );
          default:
            return (
              <div key={q.id} className="text-sm text-gray-500">
                Unsupported question type: {q.type}
              </div>
            );
        }
      })}
    </div>
  );
}
